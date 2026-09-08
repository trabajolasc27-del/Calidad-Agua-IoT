// Edge Function para RF-06/RF-07: crear un usuario nuevo con un rol dado.
// Crear cuentas de Supabase Auth requiere la service_role key, que nunca
// vive en el frontend (RNF-04) -- por eso esto no puede hacerse con un
// simple INSERT desde Angular. Quien llama debe tener sesion iniciada
// (verify_jwt de la plataforma sigue activo, a diferencia de
// ingest-measurement) y, ademas, esta funcion verifica por su cuenta que
// el llamante sea Administrador antes de crear nada.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const VALID_ROLES = ["admin", "analyst", "field_tech"] as const;
type UserRole = (typeof VALID_ROLES)[number];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function errorResponse(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return errorResponse(405, "METHOD_NOT_ALLOWED", "Solo se acepta POST");
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return errorResponse(401, "UNAUTHORIZED", "Falta la sesión del usuario");
  }
  const callerToken = match[1];

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "INVALID_FORMAT", "El cuerpo no es un JSON válido");
  }

  const { email, full_name, role, redirect_to } = (body ?? {}) as Record<string, unknown>;

  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse(400, "INVALID_FORMAT", "Correo inválido");
  }
  if (typeof full_name !== "string" || full_name.trim() === "") {
    return errorResponse(400, "INVALID_FORMAT", "El nombre es obligatorio");
  }
  if (typeof role !== "string" || !VALID_ROLES.includes(role as UserRole)) {
    return errorResponse(400, "INVALID_FORMAT", "Rol inválido");
  }
  if (redirect_to !== undefined && typeof redirect_to !== "string") {
    return errorResponse(400, "INVALID_FORMAT", "redirect_to inválido");
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  // Verifica que quien llama sea un administrador real; nunca se confía en
  // un rol enviado por el propio cliente.
  const { data: callerData, error: callerError } = await admin.auth.getUser(callerToken);
  if (callerError || !callerData?.user) {
    return errorResponse(401, "UNAUTHORIZED", "Sesión inválida o expirada");
  }

  const { data: callerProfile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", callerData.user.id)
    .single();

  if (profileError || callerProfile?.role !== "admin") {
    return errorResponse(403, "FORBIDDEN", "Solo un administrador puede crear usuarios");
  }

  // inviteUserByEmail crea la cuenta y le envía un correo para que la
  // persona elija su propia contraseña; el administrador nunca maneja ni
  // transmite una contraseña ajena.
  const { data: created, error: createError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name },
    redirectTo: typeof redirect_to === "string" ? redirect_to : undefined,
  });

  if (createError) {
    if (createError.status === 422 || createError.message?.toLowerCase().includes("already")) {
      return errorResponse(409, "EMAIL_TAKEN", "Ya existe un usuario con ese correo");
    }
    console.error("inviteUserByEmail error:", createError.message);
    return errorResponse(500, "INTERNAL_ERROR", "No se pudo crear el usuario");
  }

  const newUserId = created.user?.id;
  if (!newUserId) {
    return errorResponse(500, "INTERNAL_ERROR", "No se pudo crear el usuario");
  }

  // El trigger on_auth_user_created ya creó el perfil con role='field_tech'
  // (el más restringido por defecto); aquí se ajusta al rol solicitado.
  const { error: updateError } = await admin
    .from("profiles")
    .update({ role, full_name })
    .eq("id", newUserId);

  if (updateError) {
    console.error("profile role update error:", updateError.message);
    return errorResponse(
      500,
      "INTERNAL_ERROR",
      "El usuario se creó, pero no se pudo asignar el rol. Ajústalo manualmente en Administración.",
    );
  }

  return jsonResponse(201, { id: newUserId, email, full_name, role });
});
