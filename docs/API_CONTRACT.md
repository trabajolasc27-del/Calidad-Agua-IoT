# Contrato de API — Recepción IoT y operaciones protegidas

## 1. Alcance

La mayor parte del acceso a datos (dispositivos, ubicaciones, historial, administración) se realiza mediante el cliente de Supabase (`supabase-js`) contra PostgREST, protegido por RLS — no requiere endpoints propios. Este documento define los endpoints **personalizados** (Edge Functions) y las funciones remotas (`rpc`) que sí necesitan lógica a medida.

Base URL (se completará con el proyecto real en Fase 2): `https://<project-ref>.supabase.co/functions/v1/`

## 2. `POST /ingest-measurement`

Recibe un lote de medición de un nodo ESP32 o del simulador.

### Autenticación
Header obligatorio: `Authorization: Bearer <secreto-del-dispositivo>` (ver D-003). No es un JWT de usuario de Supabase Auth; es un secreto propio del dispositivo, verificado contra el hash almacenado en `device_credentials`.

### Cuerpo de la solicitud

```json
{
  "device_id": "NODO-001",
  "sequence": 1254,
  "measured_at": "2026-09-01T18:30:00Z",
  "values": {
    "ph": 7.12,
    "dissolved_oxygen": 6.8,
    "turbidity": 4.2,
    "temperature": 28.3
  }
}
```

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `device_id` | string | sí | debe existir en `devices`, coincidir con la credencial usada, y estar `active` |
| `sequence` | entero ≥ 0 | sí | único por dispositivo (`device_id` + `sequence`) |
| `measured_at` | string ISO 8601 (UTC) | sí | fecha válida, no en el futuro más allá de un margen de tolerancia por reloj (a definir en Fase 3) |
| `values.ph` | número | sí | finito, dentro de `parameters.physical_min/max` de `ph` |
| `values.dissolved_oxygen` | número | sí | finito, ≥ 0, dentro de límites físicos de `dissolved_oxygen` |
| `values.turbidity` | número | sí | finito, ≥ 0, dentro de límites físicos de `turbidity` |
| `values.temperature` | número | sí | finito, dentro de límites físicos de `temperature` |

El payload debe incluir los 4 parámetros oficiales; si en el futuro se agrega un parámetro nuevo al catálogo, este contrato se actualizará explícitamente (no se aceptan parámetros no catalogados de forma silenciosa).

### Respuestas

| Código | Cuándo | Cuerpo de ejemplo |
|---|---|---|
| `201 Created` | lote y mediciones guardados correctamente | `{ "batch_id": "...", "results": { "ph": "CONFORME", "dissolved_oxygen": "ALERTA", "turbidity": "CONFORME", "temperature": "CONFORME" } }` |
| `400 Bad Request` | JSON mal formado o campo obligatorio faltante | `{ "error": { "code": "INVALID_FORMAT", "message": "Falta el campo values.temperature" } }` |
| `401 Unauthorized` | credencial ausente, inválida o dispositivo inactivo | `{ "error": { "code": "UNAUTHORIZED", "message": "Credencial de dispositivo inválida" } }` |
| `404 Not Found` | `device_id` no existe | `{ "error": { "code": "DEVICE_NOT_FOUND", "message": "Dispositivo no registrado" } }` |
| `409 Conflict` | ya existe un lote con ese `device_id` + `sequence` | `{ "error": { "code": "DUPLICATE_BATCH", "message": "Lote ya recibido previamente" } }` |
| `422 Unprocessable Entity` | valores no numéricos, no finitos o fuera de límites físicos | `{ "error": { "code": "INVALID_VALUES", "message": "values.ph fuera de rango físico permitido" } }` |
| `500 Internal Server Error` | error no controlado | `{ "error": { "code": "INTERNAL_ERROR", "message": "Error interno, contacte al administrador" } }` (sin stack trace ni credenciales en el cuerpo ni en logs) |

### Reglas de registro (logging)
- Nunca se registra el secreto del dispositivo completo, ni siquiera en caso de error de autenticación.
- Se puede registrar el `device_id`, la marca de tiempo y el tipo de error, para trazabilidad.

## 3. Funciones remotas (`rpc`) para transición de alertas

Invocadas por el Angular SPA vía `supabase.rpc(...)`, protegidas por RLS + verificación de rol dentro de la función (`security definer` con chequeo explícito de `profiles.role`).

| Función | Parámetros | Efecto | Quién puede invocarla |
|---|---|---|---|
| `acknowledge_alert(alert_id)` | uuid | `NEW` → `ACKNOWLEDGED`, registra `alert_history` | Admin, Analista |
| `attend_alert(alert_id, comment)` | uuid, text | `ACKNOWLEDGED` → `ATTENDED`, guarda comentario | Admin, Analista |
| `close_alert(alert_id, comment)` | uuid, text | `ATTENDED` → `CLOSED` | Admin, Analista |

Cada función valida que la transición de estado sea la esperada (no se puede saltar de `NEW` a `CLOSED`) y rechaza la llamada si el rol no corresponde, devolviendo un error de PostgreSQL que el cliente traduce a un mensaje de interfaz.

## 4. Notificación de alertas (interna, no pública)

`send-alert-notification` es una Edge Function invocada internamente (no por el cliente ni por el ESP32) cuando se abre una alerta. Llama a la API de Brevo para enviar un correo a los destinatarios configurados y registra el resultado en `notification_logs`. Ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #2 para la configuración pendiente de la cuenta Brevo.

## 5. Simulador de mediciones

Antes de contar con el ESP32 físico, un simulador (script Node/TypeScript, Fase 3) generará solicitudes `POST /ingest-measurement` con tres perfiles:

- **Normal:** valores dentro de rango de `CONFORME` para los 4 parámetros.
- **Alerta:** uno o más parámetros dentro de banda `ALERTA`.
- **Crítico:** uno o más parámetros dentro de banda `CRITICO`.

El simulador incrementa `sequence` correctamente y permite forzar una secuencia repetida para probar la respuesta `409`, así como un `device_id` inexistente para probar `404`, y un payload incompleto para probar `400`.
