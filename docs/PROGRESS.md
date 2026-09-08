# Registro de Progreso

## Sesión 2 — 2026-09-08

### Fase actual
**Fase 2 (Semanas 4–6): Fundamentos — en progreso.** Backend real desplegado y probado de punta a punta; falta el primer usuario administrador y el resto de las pantallas de administración.

### Actividades terminadas (implementadas y verificadas)
- Repositorio conectado: remoto `origin` = GitHub `trabajolasc27-del/Calidad-Agua-IoT`, proyecto Supabase nuevo (`zeoedihibvbkclqsqhrf`) con integración GitHub→Supabase activa en la rama `main` (D-012).
- 15 migraciones SQL escritas y **aplicadas al proyecto real**: 14 tablas, 7 enums, políticas RLS completas por rol, motor de evaluación (`evaluate_batch`), transiciones de alerta (`acknowledge_alert`/`attend_alert`/`close_alert`), autenticación de dispositivo (`verify_device_secret`) e ingesta transaccional (`ingest_measurement_batch`).
- Edge Function `ingest-measurement` desplegada al proyecto real (requirió desactivar `verify_jwt` para esa función, ver Errores conocidos/corregidos).
- **Verificado end-to-end contra el proyecto real** (no local, no simulado) con `tools/simulator/simulate.mjs`: los 6 códigos de respuesta del contrato responden correctamente (201, 400, 401, 404, 409, 422), y una alerta se abre automáticamente tras 2 lecturas consecutivas fuera de rango, con la severidad correcta.
- Frontend Angular 21 + Angular Material scaffolded, compila sin errores ni advertencias. Implementado: `SupabaseService`, `AuthService` (signals: sesión, perfil, rol), `authGuard`, `roleGuard`, pantallas de inicio de sesión y recuperación de contraseña, cascarones protegidos de Dashboard y Administración.
- Datos de demostración sembrados en el proyecto real (`seed.sql`, todo marcado `is_demo`).
- Documentación de Fase 1 actualizada: D-007/D-008 confirmadas por el usuario, D-010 resuelto con versiones reales, D-013 (Angular Material) agregada.

### Errores encontrados y corregidos en esta sesión
1. **`verify_jwt` de la plataforma bloqueaba el ESP32/simulador** — la Edge Function usa el header `Authorization` para el secreto propio del dispositivo, no un JWT de Supabase; la verificación por defecto de la plataforma lo rechazaba antes de que el código de la función corriera. Corregido con `verify_jwt = false` en `supabase/config.toml` para esa función.
2. **`verify_device_secret`: columna ambigua** — `returns table (device_id uuid, ...)` declara `device_id` como variable visible en toda la función, chocando con la columna `device_credentials.device_id`. Corregido calificando la columna con alias de tabla.
3. **`verify_device_secret`: `crypt()` no encontrado** — pgcrypto vive en el esquema `extensions` en este proyecto, no en `public`; con el `search_path` restringido a `public` (a propósito, por seguridad) la función no encontraba `crypt()`. Corregido agregando `extensions` al `search_path` de esa función específica.

Los tres se encontraron probando de verdad contra el proyecto real (no se habrían visto solo leyendo el SQL), y quedaron corregidos y reverificados antes de continuar.

### Pruebas ejecutadas
- `ng build` (Angular): exitoso, sin advertencias de presupuesto.
- Simulador IoT contra la Edge Function real: perfiles normal/alerta/duplicado/inválido/no-autorizado/no-existe — los 6 verificados con el código HTTP esperado.
- Verificación directa en SQL (`db query --linked`) del motor de evaluación y de la apertura de alertas.
- Prueba de RLS: intento de `INSERT` en `locations` como `anon` correctamente rechazado (401, `new row violates row-level security policy`).

### Errores conocidos (no bloqueantes)
- Docker Desktop no puede levantar Supabase local en esta máquina porque **WSL2 no está instalado** (cambio de sistema que requiere reinicio; no se hizo sin autorización explícita). No es necesario: se está probando contra el proyecto real, que está vacío de datos reales.
- Las funciones RPC de transición de alertas (`acknowledge_alert`/`attend_alert`/`close_alert`) todavía no se probaron con una sesión de usuario real, porque no existe ningún usuario todavía (ver Acciones manuales pendientes).

### Acciones manuales pendientes
1. **Crear el primer usuario administrador** (bloquea probar login real y el resto de Administración): Supabase Dashboard → Authentication → Users → Add user (correo + contraseña que tú elijas) → luego Table Editor → `profiles` → editar la fila de ese usuario → cambiar `role` a `admin` (se creó automáticamente con `field_tech` por el trigger `on_auth_user_created`).
2. Brevo (Fase 4, no urge).
3. Sensores de oxígeno disuelto y temperatura para el ESP32 (Fase 5, no bloquea).
4. Hosting/dominio (Fase 5, no bloquea).
5. (Opcional) Revocar el Personal Access Token de Supabase usado para este despliegue (`supabase.com/dashboard/account/tokens`) si no lo vas a seguir usando, o conservarlo si quieres que seguamos desplegando por CLI.

### Próxima actividad recomendada
En cuanto exista el primer administrador: probar el login real desde el frontend (`ng serve`), verificar que `/administracion` sea accesible solo para ese rol, y continuar la Fase 2 con las pantallas reales de administración (usuarios, dispositivos, ubicaciones, parámetros, umbrales) sobre datos reales en vez de los cascarones actuales.

### Cómo continuar en otra sesión
Indicar: **"Continúa con la Fase 2 del proyecto IOT"**. Si ya creaste el primer administrador, indica el correo usado para que pueda guiarte a probar el login real.

---

## Sesión 1 — 2026-09-01

### Fase actual
**Fase 1 (Semanas 1–3): Análisis y diseño — en progreso.** Documentación base creada; pendiente el punto de control con el usuario antes de iniciar la Fase 2.

### Actividades terminadas (implementadas y verificadas)
- Inspección del repositorio `D:\IOT`: se encontró un único archivo previo, `Purametric (1).docx` (antecedente conceptual, ITVH, agua + gases). Extraído y analizado su contenido íntegro.
- Repositorio Git local inicializado en `D:\IOT` (sin remoto).
- Estructura documental creada en `docs/` con los 10 documentos requeridos + 2 documentos de apoyo (casos de uso, wireframes).
- Requerimientos funcionales y no funcionales consolidados, alineados al alcance oficial (pH, oxígeno disuelto, turbidez, temperatura).
- 10 casos de uso principales redactados.
- Matriz de roles (Administrador / Analista ambiental / Técnico de campo) definida, con 2 puntos marcados como propuesta pendiente de confirmación (D-007, D-008).
- Arquitectura definida (diagrama de componentes y de secuencia de ingesta), con selección tecnológica y justificación.
- Modelo de datos completo (14 tablas + 7 enums), diccionario de datos, índices, resumen de políticas RLS por tabla y rol.
- Contrato JSON de ingesta IoT definido, con los 7 códigos de respuesta HTTP exigidos y sus condiciones exactas.
- Wireframes funcionales (no visuales) de las 9 pantallas obligatorias.
- Registro de decisiones y contradicciones (11 entradas, D-001 a D-011), incluyendo el vacío de hardware para oxígeno disuelto/temperatura detectado en el antecedente.
- Acciones manuales documentadas (Supabase, Brevo, hardware ESP32, hosting, repositorio remoto opcional).
- `.env.example` y `.gitignore` creados, sin secretos reales.

### Actividades pendientes (dentro de Fase 1)
- ~~Confirmación del usuario sobre D-007 y D-008~~ — **confirmadas por el usuario el 2026-09-01**, sin cambios sobre la propuesta.
- Autorización explícita del usuario para avanzar a la Fase 2.

### Pruebas ejecutadas
Ninguna. No existe código de aplicación todavía (solo documentación); no aplica compilación ni pruebas en esta fase.

### Errores conocidos
Ninguno.

### Decisiones tomadas
Ver [DECISIONS.md](DECISIONS.md) completo. Resumen: cambio de alcance confirmado respecto a PuraMetric (D-001), modelo de mediciones en formato largo (D-004), motor de evaluación centralizado en PostgreSQL (D-005), solo REST HTTPS (D-006), autenticación de dispositivo por secreto hasheado (D-003). Dos decisiones abiertas de rol (D-007, D-008) y dos abiertas de infraestructura (hosting D-009, versiones exactas D-010).

### Acciones manuales pendientes
1. Crear proyecto Supabase y compartir URL + anon key (ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #1) — necesario para iniciar Fase 2.
2. Crear cuenta Brevo y verificar remitente (necesario recién en Fase 4, se puede preparar antes).
3. Adquirir sensor de oxígeno disuelto y sensor de temperatura compatibles con ESP32, y compartir modelo/datasheet (necesario para Fase 5; no bloquea Fases 2–4, que usan el simulador).
4. Decidir hosting/dominio (necesario recién en Fase 5).
5. (Opcional) Crear repositorio remoto en GitHub/GitLab.

### Próxima actividad recomendada
Esperar la revisión y autorización del usuario sobre los documentos de la Fase 1 (en particular D-007 y D-008), y sobre si se desea comenzar ya la acción manual #1 (Supabase) para no bloquear el arranque de la Fase 2. Una vez autorizado, iniciar Fase 2, semana 4: scaffolding del proyecto Angular y preparación de Supabase (local y/o remoto).

### Cómo continuar en otra sesión
Indicar: **"Continúa con la Fase 2 del proyecto IOT"** (y, si ya se realizó, incluir la Project URL y anon key de Supabase). Si hay correcciones a D-007/D-008 o a cualquier otro documento de la Fase 1, indicarlas primero para actualizar la documentación antes de generar código.
