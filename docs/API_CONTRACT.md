# Contrato de API — Recepción IoT y operaciones protegidas

## 1. Alcance

La mayor parte del acceso a datos (dispositivos, ubicaciones, historial, administración) se realiza mediante el cliente de Supabase (`supabase-js`) contra PostgREST, protegido por RLS — no requiere endpoints propios. Este documento define los endpoints **personalizados** (Edge Functions) y las funciones remotas (`rpc`) que sí necesitan lógica a medida.

Base URL (se completará con el proyecto real en Fase 2): `https://<project-ref>.supabase.co/functions/v1/`

## 2. `POST /ingest-measurement`

Recibe un lote de medición de un nodo ESP32 o del simulador.

### Autenticación
Header obligatorio: `Authorization: Bearer <secreto-del-dispositivo>` (ver D-003). No es un JWT de usuario de Supabase Auth; es un secreto propio del dispositivo, verificado contra el hash almacenado en `credenciales_dispositivo`.

### Cuerpo de la solicitud

Campos en español desde D-021. `codigo_dispositivo` es el *código* del dispositivo (ej. `NODO-001`), no su UUID interno.

```json
{
  "codigo_dispositivo": "NODO-001",
  "secuencia": 1254,
  "medido_en": "2026-09-01T18:30:00Z",
  "valores": {
    "ph": 7.12,
    "oxigeno_disuelto": 6.8,
    "turbidez": 4.2,
    "temperatura": 28.3
  }
}
```

| Campo | Tipo | Obligatorio | Validación |
|---|---|---|---|
| `codigo_dispositivo` | string | sí | debe existir en `dispositivos`, coincidir con la credencial usada, y estar `activo` |
| `secuencia` | entero ≥ 0 | sí | único por dispositivo (`dispositivo_id` + `secuencia`) |
| `medido_en` | string ISO 8601 (UTC) | sí | fecha válida, no en el futuro más allá de un margen de tolerancia por reloj (a definir en Fase 3) |
| `valores.ph` | número | sí | finito, dentro de `parametros.minimo_fisico/maximo_fisico` de `ph` |
| `valores.oxigeno_disuelto` | número | sí | finito, ≥ 0, dentro de límites físicos de `oxigeno_disuelto` |
| `valores.turbidez` | número | sí | finito, ≥ 0, dentro de límites físicos de `turbidez` |
| `valores.temperatura` | número | sí | finito, dentro de límites físicos de `temperatura` |

El payload debe incluir los 4 parámetros oficiales; si en el futuro se agrega un parámetro nuevo al catálogo, este contrato se actualizará explícitamente (no se aceptan parámetros no catalogados de forma silenciosa).

### Respuestas

| Código | Cuándo | Cuerpo de ejemplo |
|---|---|---|
| `201 Created` | lote y mediciones guardados correctamente | `{ "id_lote": "...", "resultados": { "ph": "CONFORME", "oxigeno_disuelto": "ALERTA", "turbidez": "CONFORME", "temperatura": "CONFORME" } }` |
| `400 Bad Request` | JSON mal formado o campo obligatorio faltante | `{ "error": { "code": "INVALID_FORMAT", "message": "Falta el campo valores.temperatura" } }` |
| `401 Unauthorized` | credencial ausente, inválida o dispositivo inactivo | `{ "error": { "code": "UNAUTHORIZED", "message": "Credencial de dispositivo inválida" } }` |
| `404 Not Found` | `codigo_dispositivo` no existe | `{ "error": { "code": "DEVICE_NOT_FOUND", "message": "Dispositivo no registrado" } }` |
| `409 Conflict` | ya existe un lote con ese `codigo_dispositivo` + `secuencia` | `{ "error": { "code": "DUPLICATE_BATCH", "message": "Lote ya recibido previamente" } }` |
| `422 Unprocessable Entity` | valores no numéricos, no finitos o fuera de límites físicos | `{ "error": { "code": "INVALID_VALUES", "message": "valores.ph fuera de rango físico permitido" } }` |
| `500 Internal Server Error` | error no controlado | `{ "error": { "code": "INTERNAL_ERROR", "message": "Error interno, contacte al administrador" } }` (sin stack trace ni credenciales en el cuerpo ni en logs) |

### Reglas de registro (logging)
- Nunca se registra el secreto del dispositivo completo, ni siquiera en caso de error de autenticación.
- Se puede registrar el `codigo_dispositivo`, la marca de tiempo y el tipo de error, para trazabilidad.

## 3. Funciones remotas (`rpc`) para transición de alertas

Invocadas por el Angular SPA vía `supabase.rpc(...)`, protegidas por RLS + verificación de rol dentro de la función (`security definer` con chequeo explícito de `perfiles.rol`).

| Función | Parámetros | Efecto | Quién puede invocarla |
|---|---|---|---|
| `reconocer_alerta(_id_alerta)` | uuid | `NUEVA` → `RECONOCIDA`, registra `historial_alertas` | Admin, Analista |
| `atender_alerta(_id_alerta, _comentario)` | uuid, text | `RECONOCIDA` → `ATENDIDA`, guarda comentario | Admin, Analista |
| `cerrar_alerta(_id_alerta, _comentario)` | uuid, text | `ATENDIDA` → `CERRADA` | Admin, Analista |

Cada función valida que la transición de estado sea la esperada (no se puede saltar de `NUEVA` a `CERRADA`) y rechaza la llamada si el rol no corresponde, devolviendo un error de PostgreSQL que el cliente traduce a un mensaje de interfaz.

## 4. Notificación de alertas (interna, no pública)

`send-alert-notification` es una Edge Function invocada internamente (no por el cliente ni por el ESP32) cuando se abre una alerta. Llama a la API de Brevo para enviar un correo a los destinatarios configurados y registra el resultado en `notification_logs`. Ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #2 para la configuración pendiente de la cuenta Brevo.

## 5. Simulador de mediciones

Antes de contar con el ESP32 físico, un simulador (script Node/TypeScript, Fase 3) generará solicitudes `POST /ingest-measurement` con tres perfiles:

- **Normal:** valores dentro de rango de `CONFORME` para los 4 parámetros.
- **Alerta:** uno o más parámetros dentro de banda `ALERTA`.
- **Crítico:** uno o más parámetros dentro de banda `CRITICO`.

El simulador incrementa `secuencia` correctamente y permite forzar una secuencia repetida para probar la respuesta `409`, así como un `codigo_dispositivo` inexistente para probar `404`, y un payload incompleto para probar `400`.
