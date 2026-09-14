// Edge Function de recepcion IoT. Ver docs/API_CONTRACT.md seccion 2 y
// docs/ARCHITECTURE.md seccion 5 (diagrama de secuencia de ingesta).
//
// Un nodo ESP32 (o el simulador) hace POST aqui con Authorization: Bearer
// <secreto-del-dispositivo> y el JSON de mediciones. Esta funcion valida,
// autentica el dispositivo y delega la escritura transaccional + la
// evaluacion a funciones de PostgreSQL (D-005), para que toda la logica de
// negocio viva en un solo lugar.
//
// Contrato JSON en espanol desde D-021 (atributos y campos de la base de
// datos traducidos para tramites institucionales).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CODIGOS_PARAMETRO = ["ph", "oxigeno_disuelto", "turbidez", "temperatura"] as const;
type CodigoParametro = (typeof CODIGOS_PARAMETRO)[number];

interface CargaIngesta {
  codigo_dispositivo: string;
  secuencia: number;
  medido_en: string;
  valores: Record<string, unknown>;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validatePayload(
  body: unknown,
): { ok: true; data: CargaIngesta } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "El cuerpo debe ser un objeto JSON" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.codigo_dispositivo !== "string" || b.codigo_dispositivo.trim() === "") {
    return { ok: false, message: "Falta o es invalido el campo codigo_dispositivo" };
  }
  if (!isFiniteNumber(b.secuencia) || b.secuencia < 0 || !Number.isInteger(b.secuencia)) {
    return { ok: false, message: "Falta o es invalido el campo secuencia (entero >= 0)" };
  }
  if (typeof b.medido_en !== "string" || Number.isNaN(Date.parse(b.medido_en))) {
    return { ok: false, message: "Falta o es invalida la fecha medido_en (ISO 8601)" };
  }
  if (typeof b.valores !== "object" || b.valores === null) {
    return { ok: false, message: "Falta el objeto valores" };
  }
  const valores = b.valores as Record<string, unknown>;
  for (const codigo of CODIGOS_PARAMETRO) {
    if (!(codigo in valores)) {
      return { ok: false, message: `Falta el campo valores.${codigo}` };
    }
  }

  return {
    ok: true,
    data: {
      codigo_dispositivo: b.codigo_dispositivo,
      secuencia: b.secuencia,
      medido_en: b.medido_en,
      valores,
    },
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Solo se acepta POST");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return errorResponse(401, "UNAUTHORIZED", "Falta el header Authorization: Bearer <secreto>");
  }
  const secretoDispositivo = match[1];

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return errorResponse(400, "INVALID_FORMAT", "El cuerpo no es un JSON valido");
  }

  const validation = validatePayload(rawBody);
  if (!validation.ok) {
    return errorResponse(400, "INVALID_FORMAT", validation.message);
  }
  const payload = validation.data;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Autenticacion del dispositivo. Nunca se registra el secreto recibido,
  // ni en caso de exito ni de error (docs/API_CONTRACT.md, reglas de logging).
  const { data: filasAuth, error: authError } = await supabase.rpc("verificar_secreto_dispositivo", {
    _codigo_dispositivo: payload.codigo_dispositivo,
    _secreto: secretoDispositivo,
  });

  if (authError) {
    console.error("verificar_secreto_dispositivo error:", authError.message);
    return errorResponse(500, "INTERNAL_ERROR", "Error interno, contacte al administrador");
  }

  const resultadoAuth = filasAuth?.[0] as { id_dispositivo: string | null; resultado_autenticacion: string } | undefined;
  if (!resultadoAuth || resultadoAuth.resultado_autenticacion === "not_found") {
    return errorResponse(404, "DEVICE_NOT_FOUND", "Dispositivo no registrado");
  }
  if (resultadoAuth.resultado_autenticacion === "invalid_secret" || resultadoAuth.resultado_autenticacion === "inactive") {
    return errorResponse(401, "UNAUTHORIZED", "Credencial de dispositivo invalida");
  }

  const idDispositivo = resultadoAuth.id_dispositivo as string;

  // Valores numericos finitos por parametro.
  const valoresNumericos: Record<CodigoParametro, number> = {} as Record<CodigoParametro, number>;
  for (const codigo of CODIGOS_PARAMETRO) {
    const v = payload.valores[codigo];
    if (!isFiniteNumber(v)) {
      return errorResponse(422, "INVALID_VALUES", `valores.${codigo} debe ser un numero finito`);
    }
    valoresNumericos[codigo] = v;
  }

  // Catalogo de parametros, para validar limites fisicos antes de insertar.
  const { data: filasParametro, error: parametrosError } = await supabase
    .from("parametros")
    .select("id, codigo, minimo_fisico, maximo_fisico")
    .in("codigo", CODIGOS_PARAMETRO as unknown as string[]);

  if (parametrosError || !filasParametro || filasParametro.length !== CODIGOS_PARAMETRO.length) {
    console.error("parametros lookup error:", parametrosError?.message);
    return errorResponse(500, "INTERNAL_ERROR", "Error interno, contacte al administrador");
  }

  for (const fila of filasParametro) {
    const valor = valoresNumericos[fila.codigo as CodigoParametro];
    const muyBajo = fila.minimo_fisico !== null && valor < fila.minimo_fisico;
    const muyAlto = fila.maximo_fisico !== null && valor > fila.maximo_fisico;
    if (muyBajo || muyAlto) {
      return errorResponse(422, "INVALID_VALUES", `valores.${fila.codigo} fuera de rango fisico permitido`);
    }
  }

  // Insercion transaccional + evaluacion, delegada a Postgres (D-005).
  const { data: resultadoLote, error: insertError } = await supabase.rpc("ingerir_lote_medicion", {
    _id_dispositivo: idDispositivo,
    _secuencia: payload.secuencia,
    _medido_en: payload.medido_en,
    _carga_original: payload,
    _valores: valoresNumericos,
  });

  if (insertError) {
    if (insertError.message?.includes("DUPLICATE_BATCH")) {
      return errorResponse(409, "DUPLICATE_BATCH", "Lote ya recibido previamente");
    }
    console.error("ingerir_lote_medicion error:", insertError.message);
    return errorResponse(500, "INTERNAL_ERROR", "Error interno, contacte al administrador");
  }

  const filas = (resultadoLote ?? []) as {
    id_lote: string;
    codigo_parametro: string;
    resultado_evaluacion: string | null;
  }[];

  const resultados: Record<string, string> = {};
  for (const fila of filas) {
    resultados[fila.codigo_parametro] = fila.resultado_evaluacion ?? "SIN_EVALUAR";
  }

  return jsonResponse(201, {
    id_lote: filas[0]?.id_lote,
    resultados,
  });
});
