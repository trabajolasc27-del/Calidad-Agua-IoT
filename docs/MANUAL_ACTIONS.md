# Acciones Manuales Pendientes

Estas acciones requieren intervención directa del usuario (cuentas, credenciales, hardware o decisiones académicas). No se ejecutan automáticamente. Cada una indica: qué hacer, por qué, pasos exactos, qué información devolver, y qué puede avanzar mientras tanto con datos simulados.

---

## 1. Crear el proyecto Supabase

**Qué hacer:** crear una cuenta en Supabase y un proyecto nuevo.

**Por qué:** Supabase es el backend elegido (PostgreSQL + Auth + Row Level Security + Edge Functions + Realtime). Necesitamos un proyecto real para conectar la aplicación en la Fase 2.

**Pasos exactos:**
1. Ir a `supabase.com` y crear una cuenta (o iniciar sesión).
2. Crear una nueva organización si es la primera vez.
3. Crear un nuevo proyecto: elegir nombre (sugerido: `quesisimo-agua` o el que prefieras), una región cercana (p. ej. la más próxima a México disponible), y una **contraseña fuerte** para la base de datos (guárdala en un gestor de contraseñas, no la compartas en el chat).
4. Esperar a que el proyecto termine de aprovisionarse (unos minutos).
5. En el panel del proyecto: **Project Settings → API**, copiar la **Project URL** y la **anon public key**.

**Qué debes darme después:**
- La **Project URL** (ej. `https://xxxx.supabase.co`).
- La **anon public key**.
- **No** me compartas la `service_role key` ni la contraseña de la base de datos — esas se configuran directamente como secretos del proyecto, nunca se escriben en el chat ni en el repositorio.

**Qué puede avanzar mientras tanto (datos simulados):**
- Scaffolding del proyecto Angular.
- Migraciones SQL escritas como archivos (sin aplicar).
- Diseño de componentes con datos mock.
- Script del simulador IoT (apuntará a `localhost` con Supabase CLI local si se opta por desarrollo local primero).

---

## 2. Crear cuenta de Brevo para notificaciones por correo

**Qué hacer:** crear una cuenta en Brevo y verificar un remitente.

**Por qué:** el envío de correos al abrirse una alerta requiere una API externa; Brevo fue la elegida en el alcance del proyecto.

**Pasos exactos:**
1. Crear cuenta en `brevo.com`.
2. Verificar el correo remitente (o el dominio) que usará el sistema para enviar alertas, siguiendo el asistente de verificación de Brevo (agrega un registro DNS si usas dominio propio, o verifica un correo individual si es más simple para el prototipo académico).
3. Generar una **API key** transaccional desde el panel de Brevo (SMTP & API → API Keys).
4. Guardar esa API key como secreto del proyecto Supabase, **no en el chat**: `supabase secrets set BREVO_API_KEY=<valor>` (CLI) o desde el Dashboard de Supabase → Edge Functions → Secrets.

**Qué debes darme después:**
- Confirmación de que el remitente quedó verificado y de que el secreto `BREVO_API_KEY` ya está configurado en Supabase (solo la confirmación, no el valor).
- El correo o dominio remitente que se usará (para mostrarlo en las plantillas de notificación).

**Qué puede avanzar mientras tanto:**
- La Edge Function `send-alert-notification` se desarrolla completa contra la documentación pública de la API de Brevo, con el envío real deshabilitado (modo *log* en vez de *send*) hasta que el secreto exista.

---

## 3. Hardware ESP32: sensor de oxígeno disuelto y de temperatura

**Qué hacer:** seleccionar y adquirir un sensor de oxígeno disuelto (salida en mg/L o convertible) y un sensor de temperatura apto para inmersión, compatibles con el ESP32.

**Por qué:** el antecedente PuraMetric no incluye estos sensores (solo tenía pH, turbidez y sensores de gas fuera de alcance ahora, ver [DECISIONS.md](DECISIONS.md) D-002). Sin ellos no se puede calibrar el firmware final ni validar el contrato JSON contra hardware real.

**Pasos exactos:**
1. Investigar/seleccionar un módulo de oxígeno disuelto compatible con ESP32 (analógico 0–3.3V/5V o con su propio conversor), considerando presupuesto y disponibilidad en México.
2. Seleccionar un sensor de temperatura para inmersión (comúnmente usado también para compensar lecturas de pH/OD).
3. Adquirir ambos componentes.
4. Conseguir el datasheet de cada uno.

**Qué debes darme después:**
- Modelo exacto de cada sensor adquirido y su datasheet (PDF o enlace).
- Rango de salida (voltaje o valor digital) y fórmula de conversión sugerida por el fabricante, si la trae.

**Qué puede avanzar mientras tanto:**
- Todo el software (Fases 2 a 4) se desarrolla y prueba contra el simulador HTTP, que genera los 4 parámetros con valores sintéticos realistas. La integración con hardware real es explícitamente la Fase 5.

---

## 4. Hosting y dominio para el despliegue final

**Qué hacer:** decidir proveedor de hosting para el frontend Angular (y dominio, si aplica).

**Por qué:** se requiere para publicar la aplicación al final del proyecto (Fase 5).

**Estado:** no urgente todavía. Se detallarán pasos exactos (crear cuenta, conectar el repositorio, configurar variables de entorno del build) cuando el proyecto llegue a la Fase 5. Se registra aquí solo para que quede visible desde ahora.

**Qué puede avanzar mientras tanto:** todo el desarrollo funciona en entorno local/desarrollo sin necesidad de esta decisión.

---

## 5. (Opcional) Repositorio remoto en GitHub/GitLab

**Qué hacer:** si deseas respaldo remoto o necesitas compartir el repositorio con el asesor/equipo, crea un repositorio vacío en GitHub o GitLab y compárteme la URL del remoto.

**Por qué:** actualmente el repositorio Git es solo local (`D:\IOT\.git`). No es obligatorio para continuar el desarrollo, pero sí recomendable como respaldo de un proyecto de Residencia Profesional.

**Pasos exactos:**
1. Crear un repositorio vacío (sin README ni licencia, para evitar conflictos) en GitHub/GitLab.
2. Copiar la URL (HTTPS o SSH).

**Qué debes darme después:** la URL del remoto. Yo la configuro con `git remote add origin <url>` y te confirmo antes de hacer cualquier `push`.

**Qué puede avanzar mientras tanto:** todo el trabajo se sigue versionando localmente sin problema.
