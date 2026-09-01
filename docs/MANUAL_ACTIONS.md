# Acciones Manuales Pendientes

Estas acciones requieren intervención directa del usuario (cuentas, credenciales, hardware o decisiones académicas). No se ejecutan automáticamente. Cada una indica: qué hacer, por qué, pasos exactos, qué información devolver, y qué puede avanzar mientras tanto con datos simulados.

---

## 1. Crear el proyecto Supabase nuevo y conectarlo al repositorio de GitHub de este proyecto

**Qué hacer:** (A) crear en GitHub un repositorio vacío para `D:\IOT`; (B) crear en Supabase un **proyecto nuevo, distinto del de Quesisimo**; (C) conectar ese proyecto nuevo al repositorio nuevo mediante la integración nativa GitHub↔Supabase (el mismo mecanismo que usaste en Quesisimo para desplegar migraciones).

**Por qué:** ya tienes cuenta de Supabase y quieres reusar el flujo de GitHub que usaste en Quesisimo, pero **sin ningún riesgo para esa base de datos**. Un proyecto Supabase nuevo es una instancia de PostgreSQL, Auth y claves API completamente aparte — no comparte nada con el proyecto de Quesisimo. Conectarlo a un repositorio de GitHub distinto (este, no el de Quesisimo) es lo que garantiza que ninguna migración de este proyecto pueda aplicarse jamás sobre la base de datos de Quesisimo.

**Pasos exactos:**

**A. Crear el repositorio en GitHub (hazlo primero)**
1. En GitHub → *New repository*.
2. Nombre sugerido: `calidad-agua-iot` (o el que prefieras).
3. Créalo **vacío**: sin README, sin `.gitignore`, sin licencia — ya los tenemos en el repositorio local y así evitamos conflictos al hacer el primer `push`.
4. Visibilidad: privado o público, es tu decisión (para un proyecto académico con secretos aún no incluidos, privado es lo más prudente).
5. Copia la URL HTTPS del repositorio.

**B. Crear el proyecto Supabase nuevo**
1. En `supabase.com`, dentro de tu organización: *New Project*.
2. Nombre sugerido: `calidad-agua-iot` (o el que prefieras).
3. **Antes de continuar, revisa el selector de proyectos en la parte superior del dashboard de Supabase y confirma que este proyecto nuevo aparece separado del proyecto de Quesisimo** — deben ser dos entradas distintas en la lista.
4. Región cercana a México.
5. Contraseña fuerte para la base de datos (guárdala en un gestor de contraseñas; no me la compartas).
6. Espera a que termine de aprovisionarse.

**C. Conectar el proyecto Supabase nuevo al repositorio nuevo (no al de Quesisimo)**
1. Dentro del proyecto Supabase nuevo: **Project Settings → Integrations → GitHub Connection**.
2. Autoriza la GitHub App de Supabase sobre tu cuenta si aún no lo está (es un permiso de OAuth que solo tú puedes otorgar desde tu navegador).
3. Selecciona explícitamente el repositorio `calidad-agua-iot` que acabas de crear — verifica en esa pantalla que **no** quede seleccionado el repositorio de Quesisimo.
4. Elige la rama que disparará los despliegues (normalmente `main`) y, si te lo pide, la carpeta `supabase/` como raíz de configuración (esa carpeta la creo yo en la Fase 2, con las migraciones).

**Qué debes darme después:**
- La URL del repositorio de GitHub nuevo.
- La **Project URL** y la **anon public key** del proyecto Supabase nuevo (Project Settings → API).
- Confirmación de que la integración quedó conectada al repositorio y rama correctos (no a los de Quesisimo).
- **No** me compartas: contraseña de la base de datos, `service_role key`, ni tokens de acceso de GitHub/Supabase.

**Qué puede avanzar mientras tanto (datos simulados):**
- Scaffolding del proyecto Angular.
- Migraciones SQL escritas como archivos en `supabase/migrations/` (sin aplicar todavía).
- Diseño de componentes con datos mock.
- Script del simulador IoT.

En cuanto me compartas la URL del repositorio de GitHub, agrego el remoto localmente y te pido confirmación puntual antes de hacer el primer `push` (así conecta con lo que ya llevamos: 3 commits locales de la Fase 1).

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

## 5. Repositorio remoto en GitHub

**Estado:** decidido — ver acción #1, que ahora incluye la creación de este repositorio como parte del flujo de conexión con Supabase. No se necesita una acción separada.
