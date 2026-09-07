// Edge Function de recepcion IoT. Ver docs/API_CONTRACT.md seccion 2 y
// docs/ARCHITECTURE.md seccion 5 (diagrama de secuencia de ingesta).
//
// Un nodo ESP32 (o el simulador) hace POST aqui con Authorization: Bearer
// <secreto-del-dispositivo> y el JSON de mediciones. Esta funcion valida,
// autentica el dispositivo y delega la escritura transaccional + la
// evaluacion a funciones de PostgreSQL (D-005), para que toda la logica de
// negocio viva en un solo lugar.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PARAMETER_CODES = ["ph", "dissolved_oxygen", "turbidity", "temperature"] as const;
type ParameterCode = (typeof PARAMETER_CODES)[number];

interface IngestPayload {
  device_id: string;
  sequence: number;
  measured_at: string;
  values: Record<string, unknown>;
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
): { ok: true; data: IngestPayload } | { ok: false; message: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, message: "El cuerpo debe ser un objeto JSON" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.device_id !== "string" || b.device_id.trim() === "") {
    return { ok: false, message: "Falta o es invalido el campo device_id" };
  }
  if (!isFiniteNumber(b.sequence) || b.sequence < 0 || !Number.isInteger(b.sequence)) {
    return { ok: false, message: "Falta o es invalido el campo sequence (entero >= 0)" };
  }
  if (typeof b.measured_at !== "string" || Number.isNaN(Date.parse(b.measured_at))) {
    return { ok: false, message: "Falta o es invalida la fecha measured_at (ISO 8601)" };
  }
  if (typeof b.values !== "object" || b.values === null) {
    return { ok: false, message: "Falta el objeto values" };
  }
  const values = b.values as Record<string, unknown>;
  for (const code of PARAMETER_CODES) {
    if (!(code in values)) {
      return { ok: false, message: `Falta el campo values.${code}` };
    }
  }

  return {
    ok: true,
    data: {
      device_id: b.device_id,
      sequence: b.sequence,
      measured_at: b.measured_at,
      values,
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
  const deviceSecret = match[1];

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
  const { data: authRows, error: authError } = await supabase.rpc("verify_device_secret", {
    _device_code: payload.device_id,
    _secret: deviceSecret,
  });

  if (authError) {
    console.error("verify_device_secret error:", authError.message);
    return errorResponse(500, "INTERNAL_ERROR", "Error interno, contacte al administrador");
  }

  const authResult = authRows?.[0] as { device_id: string | null; auth_result: string } | undefined;
  if (!authResult || authResult.auth_result === "not_found") {
    return errorResponse(404, "DEVICE_NOT_FOUND", "Dispositivo no registrado");
  }
  if (authResult.auth_result === "invalid_secret" || authResult.auth_result === "inactive") {
    return errorResponse(401, "UNAUTHORIZED", "Credencial de dispositivo invalida");
  }

  const deviceId = authResult.device_id as string;

  // Valores numericos finitos por parametro.
  const numericValues: Record<ParameterCode, number> = {} as Record<ParameterCode, number>;
  for (const code of PARAMETER_CODES) {
    const v = payload.values[code];
    if (!isFiniteNumber(v)) {
      return errorResponse(422, "INVALID_VALUES", `values.${code} debe ser un numero finito`);
    }
    numericValues[code] = v;
  }

  // Catalogo de parametros, para validar limites fisicos antes de insertar.
  const { data: parameterRows, error: parametersError } = await supabase
    .from("parameters")
    .select("id, code, physical_min, physical_max")
    .in("code", PARAMETER_CODES as unknown as string[]);

  if (parametersError || !parameterRows || parameterRows.length !== PARAMETER_CODES.length) {
    console.error("parameters lookup error:", parametersError?.message);
    return errorResponse(500, "INTERNAL_ERROR", "Error interno, contacte al administrador");
  }

  for (const row of parameterRows) {
    const value = numericValues[row.code as ParameterCode];
    const tooLow = row.physical_min !== null && value < row.physical_min;
    const tooHigh = row.physical_max !== null && value > row.physical_max;
    if (tooLow || tooHigh) {
      return errorResponse(422, "INVALID_VALUES", `values.${row.code} fuera de rango fisico permitido`);
    }
  }

  // Insercion transaccional + evaluacion, delegada a Postgres (D-005).
  const { data: batchResult, error: insertError } = await supabase.rpc("ingest_measurement_batch", {
    _device_id: deviceId,
    _sequence: payload.sequence,
    _measured_at: payload.measured_at,
    _raw_payload: payload,
    _values: numericValues,
  });

  if (insertError) {
    if (insertError.message?.includes("DUPLICATE_BATCH")) {
      return errorResponse(409, "DUPLICATE_BATCH", "Lote ya recibido previamente");
    }
    console.error("ingest_measurement_batch error:", insertError.message);
    return errorResponse(500, "INTERNAL_ERROR", "Error interno, contacte al administrador");
  }

  const rows = (batchResult ?? []) as {
    batch_id: string;
    parameter_code: string;
    evaluation_result: string | null;
  }[];

  const results: Record<string, string> = {};
  for (const row of rows) {
    results[row.parameter_code] = row.evaluation_result ?? "SIN_EVALUAR";
  }

  return jsonResponse(201, {
    batch_id: rows[0]?.batch_id,
    results,
  });
});
