# Registro de Progreso

## Sesión 5 — 2026-09-24

### Motivo de la sesión
El asesor externo del usuario pidió, viendo un panel IoT de referencia (Laravel, sensores de gas/UV, tema oscuro con velocímetros circulares), que la plataforma tuviera una interfaz con identidad propia (no el Material 3 azul de fábrica), acorde a los 4 parámetros reales del proyecto, intuitiva y sin saturar. También pidió documentar el código y, al terminar, probar cada pantalla y botón.

### Qué se hizo
Rediseño visual completo — ver [DECISIONS.md](DECISIONS.md) D-022 para el detalle técnico completo. En resumen:
- Paleta e identidad propia (teal + IBM Plex), generada formalmente con el schematic de Angular Material a partir de colores que ya se venían usando de forma suelta en Reportes/Wireframes/Bitácora.
- Componente `wq-gauge` nuevo (carátula tipo velocímetro, SVG propio) para los 4 parámetros del Dashboard y para Reportes, con bandas de color según el umbral real de cada parámetro.
- Shell de navegación compartido (`AppShell`) que no existía antes — se corrigió de paso que las sub-pantallas solo podían volver a "Panel" sin poder saltar directo a otra sección.
- Auditoría de texto de interfaz en español: **no se encontró texto en inglés** en ninguna plantilla; la app ya estaba en español desde que se construyó.
- Documentación de código ampliada en los archivos nuevos/tocados.

### Pruebas ejecutadas
`tsc --noEmit` y `ng build` limpios en cada bloque grande de cambios (tema, gauge, shell, integración en Reportes, sweep de colores). **No se pudo verificar visualmente con sesión autenticada** (la sesión del navegador no estaba disponible durante el trabajo) — se verificó únicamente la pantalla de login sin autenticar, donde la paleta nueva ya se ve aplicada correctamente.

### Errores conocidos (no bloqueantes)
- Falta el recorrido visual en vivo de las ~9 pantallas con datos reales (Dashboard con gauges reales, navegación del shell, Reportes con gauges en las tarjetas de estadística, etc.) — pedido explícito del usuario, pendiente de sesión autenticada.
- La pasada de documentación de código no cubrió los ~40 archivos del proyecto completo en este bloque, solo los nuevos/tocados; el resto ya tenía comentarios razonables de sesiones anteriores.

### Cómo continuar en otra sesión
Con el usuario con sesión iniciada: recorrer Dashboard (confirmar que los 4 gauges muestran bandas de color correctas contra los umbrales reales y que "Tendencia reciente" sigue mostrando las mini-gráficas), Mapa, Historial, Alertas, Reportes (gauges en las tarjetas), y las 5 pantallas de Administración — confirmando que el shell de navegación (barra superior nueva con logo, enlaces y menú de usuario) funciona en todas, sin errores de consola. Corregir lo que se encuentre, según lo pedido explícitamente por el usuario.

---

## Sesión 4 — 2026-09-14

### Motivo de la sesión
El docente indicó al usuario que las pantallas no muestran todo lo que deben mostrar según lo planteado. El usuario compartió 3 documentos oficiales para comparar contra el estado real del proyecto: `Proyecto Residencia Software 2026-2.docx`, el protocolo institucional CI-02/2026 (PDF, propuesta de investigación de 11 meses, más amplia que la residencia) y `ITVH-RP-012848-Proyecto.pdf` ("Reporte preliminar de residencia profesional" — el documento de 16 semanas / 4 etapas que efectivamente rige esta residencia).

### Hallazgo y corrección
Comparando los 3 documentos contra cada pantalla ya construida se confirmó una sola discrepancia real y concreta: **Alertas nunca mostraba el valor de la medición que originó la alerta** (ni en el listado, ni en el detalle, ni en el panel de "alertas activas" del Dashboard) — solo parámetro, severidad, estado y fecha. Esto contradice tanto `ITVH-RP-012848-Proyecto.pdf` §3.2 como el propio RF-32 de [REQUIREMENTS.md](REQUIREMENTS.md), que piden explícitamente mostrar el valor detectado. El dato ya existía en la base de datos (`alerts.first_measurement_id → measurements.value`), solo no se consultaba. Corregido en `alerts.service.ts`, `dashboard.service.ts`, `alert.model.ts`, `alerts.html`, `alert-detail-dialog.html` y `dashboard.html` — ver [DECISIONS.md](DECISIONS.md) D-020 para el detalle completo.

El resto de la comparación (4 parámetros oficiales, 3 roles, plan de 16 semanas/4 etapas, wireframes, motor de evaluación, historial, reportes) no encontró otras discrepancias de alcance contra los documentos oficiales.

### Pruebas ejecutadas
`tsc --noEmit` y `ng build` limpios tras el cambio. La consulta con el nuevo embed (`measurements!first_measurement_id(value)`) se validó primero contra el esquema real vía una petición REST anónima (`200 []`, confirma sintaxis correcta).

Más tarde en la misma sesión, ya con el usuario autenticado, se verificó en vivo con datos reales generados por el simulador (`node tools/simulator/simulate.mjs --profile=alerta`):
- El umbral de turbidez de `NODO-DEMO-001` requiere 2 lecturas consecutivas fuera de rango antes de abrir alerta (`consecutive_breaches_to_alert = 2` en el seed) — comportamiento esperado, no un bug: tras la primera lectura la tarjeta del Dashboard ya marcaba "Alerta" pero el panel de alertas activas seguía vacío; tras la segunda, la alerta se abrió y **el panel "Alertas activas" del Dashboard mostró el valor correctamente vía Realtime, sin recargar la página** ("Turbidez · 7 NTU").
- El listado de Alertas mostró `valor: 7 NTU` junto a la fila.
- El detalle de la alerta mostró "Valor detectado: 7 NTU".
- Se recorrió el ciclo completo de la alerta desde la interfaz (Reconocer → Marcar como atendida → Cerrar alerta) para dejarla limpia; la línea de tiempo quedó completa (Nueva·sistema → Reconocida → Atendida → Cerrada, las tres últimas por `trabajolasc27@gmail.com`) y el panel de alertas activas volvió a quedar vacío.

Con esto el hallazgo D-020 queda **verificado en vivo de punta a punta**, no solo por análisis estático.

### Traducción de atributos y campos de la base de datos al español
Los docentes del usuario pidieron, más adelante en la misma sesión, que los atributos y campos de la base de datos quedaran en español porque se harán trámites administrativos con el proyecto (explícitamente no el código de la aplicación). Dado el tamaño y riesgo del cambio (proyecto Supabase real, en vivo), se entró primero a modo plan para acordar con el usuario un diccionario completo de nombres antes de tocar nada — ver [DECISIONS.md](DECISIONS.md) D-021 para el mapa completo y el razonamiento de cada límite.

**Alcance confirmado por el usuario:** tablas + columnas de negocio + valores de enum + el contrato JSON del ESP32 (esto último implicó tocar también el firmware); los campos técnicos universales (`id`, `created_at`, `updated_at`, `is_active`, `is_demo`) se quedaron en inglés.

**Ejecutado en este orden:**
1. Migración `20260914120000_spanish_rename.sql` — tipos enumerados, 14 tablas, columnas de negocio, valores del catálogo de parámetros, y (drop + create, porque el cuerpo de una función plpgsql no se reescribe solo) las funciones RLS/de negocio y las ~34 políticas RLS. Aplicada contra el proyecto real vía Management API; verificada con lecturas de solo lectura que confirmaron el esquema nuevo y que los datos reales (dispositivos, umbrales, las 2 alertas ya cerradas) sobrevivieron intactos.
2. Edge Functions `ingest-measurement` y `admin-create-user` reescritas al nuevo contrato/esquema, y **redesplegadas manualmente vía la Management API** (`POST /functions/deploy?slug=...`, multipart) — se confirmó que `git push` **no** las redespliega solas en este proyecto; el simulador seguía recibiendo el contrato viejo (`device_id`) casi 3 minutos después del push, hasta hacer el deploy manual.
3. Firmware `esp32-test.ino` y `tools/simulator/simulate.mjs` actualizados al nuevo contrato JSON del ESP32.
4. Los 7 modelos y 12 servicios de Angular, más todas las plantillas `.html` que leían esos campos.
5. `supabase/seed.sql` y toda la documentación (`DATABASE_DESIGN.md`, `API_CONTRACT.md`, `ARCHITECTURE.md`, `ROLE_MATRIX.md`, `USE_CASES.md`, `tools/api-tests/ingest-measurement.http`).

**Pruebas ejecutadas:**
- `tsc --noEmit` limpio; `ng build` (que sí revisa los bindings de plantilla, a diferencia de `tsc` solo) detectó varios usos de nombres viejos en plantillas que `tsc` no había marcado — corregidos hasta build limpio dos veces seguidas.
- Esquema y datos reales verificados vía Management API tras aplicar la migración (14 tablas con los nombres nuevos; `dispositivos`, `parametros` y las 2 alertas ya cerradas con sus datos reales intactos).
- Las consultas exactas que usa el frontend (`perfiles`, `dispositivos` con embed a `ubicaciones`) validadas contra el esquema real vía una petición REST anónima (`200 []`, confirma sintaxis correcta).
- **Tubería de ingesta verificada de punta a punta con una lectura real:** `node tools/simulator/simulate.mjs --profile=normal` contra la Edge Function ya redesplegada respondió `201` con el contrato nuevo completo (`id_lote`, `resultados.{ph,oxigeno_disuelto,turbidez,temperatura}`).
- **Pendiente:** la sesión del navegador expiró de nuevo durante la ejecución; no se pudo hacer el recorrido visual (Dashboard, Mapa, Historial, Alertas, Reportes, Administración) porque no corresponde iniciar sesión por el usuario.

### Cómo continuar en otra sesión
El hallazgo del valor en Alertas queda cerrado. La traducción al español (D-021) está aplicada en el proyecto real, las Edge Functions redesplegadas, y la tubería de ingesta verificada de punta a punta con datos reales. **Solo falta que el usuario inicie sesión y confirme visualmente** que las pantallas (Dashboard, Mapa, Historial, Alertas, Reportes, las 5 de Administración) muestran todo correctamente antes de dar esto por cerrado del todo. Después: seguir con Brevo o con las pruebas del Arduino (el firmware ya quedó actualizado al nuevo contrato).

---

## Sesión 3 — 2026-09-09

### Fase actual
**Fase 4 (Semanas 10–12): Evaluación, alertas y reportes — funcionalmente completa, salvo Brevo.** Fases 2 y 3 ya estaban funcionalmente completas (ver más abajo). Dentro de esta misma sesión se completaron además Alertas, Historial y Reportes (RF-30 a RF-39); solo queda pendiente el punto de control de Brevo (acción manual del usuario) para cerrar la fase del todo. En las tres fases falta únicamente la suite de pruebas automatizadas, dejada como decisión explícita del usuario para más adelante (ver [PROJECT_PLAN.md](PROJECT_PLAN.md)).

### Actividades terminadas (implementadas y verificadas)
- **Administración > Dispositivos (RF-11 a RF-14):** listado, alta/edición, activar/desactivar, y emisión/rotación de credencial vía la nueva RPC `admin_rotate_device_credential` (genera y hashea el secreto del lado del servidor, D-003; se muestra en un diálogo aparte, una sola vez, con botón de copiar).
- **Administración > Ubicaciones (RF-09):** listado con mapa general (Leaflet + OpenStreetMap, marcador por ubicación con conteo de dispositivos vía embed de PostgREST), alta/edición con mini-mapa interactivo para fijar la coordenada (clic o arrastrar el marcador, también editable a mano), eliminación. **Verificado en vivo:** teselas y marcadores cargan, el picker sincroniza mapa↔formulario, una ubicación nueva aparece correctamente en tabla y mapa general.
- **Administración > Parámetros (RF-15):** catálogo fijo de los 4 parámetros oficiales, edición de nombre/unidad/rango físico/estado. Deliberadamente sin alta ni baja desde la interfaz, para no abrir la puerta a agregar parámetros fuera de alcance (p. ej. sensores de gas) sin pasar por una decisión explícita documentada.
- **Administración > Umbrales (RF-16/RF-17):** una tarjeta por parámetro con su versión activa (los 4 límites + lecturas consecutivas para abrir alerta) e historial de versiones anteriores en un panel expandible. "Nueva versión" llama a la RPC `admin_create_threshold_version`, que desactiva la versión activa e inserta la nueva en una sola transacción. **Verificado en vivo:** crear una versión nueva para oxígeno disuelto desactivó correctamente la versión 1 (que pasó al historial) y dejó la versión 2 activa.
- Con esto, **las 5 pantallas de Administración quedan completas** (RF-06 a RF-17).
- Firmware de prueba de conectividad para ESP32 (`firmware/esp32-test/`), con guía completa de instalación de Arduino IDE, paquete de placas ESP32, drivers (CP2102) y selección de placa/puerto — documentado con el usuario paso a paso hasta identificar que Windows Application Control bloquea el ejecutable, no la placa (pendiente de hardware disponible para completar la prueba real).
- Dispositivo `NODO-ESP32-01` no llegó a probarse con hardware real en esta sesión (usuario sin el dispositivo a la mano); queda listo para cuando lo tenga.
- **Dashboard con datos en vivo (RF-22 a RF-26):** selector de dispositivo, tarjetas de los 4 parámetros con semaforización (ícono+color+texto) y mini-gráfica de tendencia (Chart.js), estado del dispositivo, alertas activas, indicador "en vivo/reconectando" y "actualizado hace Xs". Se habilitó Supabase Realtime en `measurement_batches` y `alerts` (aparte de RLS, hay que agregarlas a la publicación `supabase_realtime` explícitamente) y se suscribe por dispositivo seleccionado.
- **Mapa general de solo lectura (RF-10)**, nueva ruta `/mapa` para cualquier rol: marcador por ubicación, popup con los dispositivos de esa ubicación y su estado. Separado de Administración > Ubicaciones (esa sigue siendo solo para admin, con edición).
- Con esto, **la Fase 3 completa queda funcionalmente lista** (ingesta, simulador, dashboard, gráficas, mapa, tiempo real).
- **Alertas (RF-30 a RF-33):** listado filtrable por estado (Nuevas/Reconocidas/Atendidas/Cerradas/Todas), diálogo de detalle con historial de transiciones y acciones "Reconocer"/"Atender"/"Cerrar" (con comentario opcional) contra las RPC `acknowledge_alert`/`attend_alert`/`close_alert` ya existentes desde el motor de reglas. El estado mostrado se deriva siempre de la última entrada de `alert_history` tras cada acción, nunca se asume en el cliente. **Verificado en vivo:** una alerta real de turbidez se reconoció, se atendió con comentario y quedó reflejada correctamente en el historial.
- **Historial (RF-27 a RF-29):** tabla paginada con 6 filtros (dispositivo, ubicación, parámetro, estado de evaluación, fecha desde/hasta) que se aplican solos al cambiar cualquier campo, y gráfica de tendencia (Chart.js) que solo aparece cuando hay un parámetro fijo seleccionado (para no mezclar unidades). El filtro por ubicación se resuelve primero a una lista de IDs de dispositivo en el cliente, evitando un filtro anidado a dos niveles en PostgREST. **Verificado en vivo:** filtrar por parámetro + rango de fechas devuelve las filas correctas y dibuja la tendencia.
- **Reportes (RF-37 a RF-39):** selector de dispositivo + rango de fechas, estadísticas por parámetro (mínimo/máximo/promedio/lecturas/alertas/críticos) calculadas del lado del cliente sobre las mediciones del periodo, conteo de mediciones y alertas del periodo, mini-gráfica de tendencia por parámetro, y exportación a PDF (`pdfmake`) y Excel (`exceljs`). Restringido a Administrador y Analista ambiental en el guard de ruta, según la matriz de roles (Técnico de campo no genera reportes). **Verificado en vivo:** reporte generado para `NODO-DEMO-001` con 24 mediciones reales mostró estadísticas correctas por parámetro y ambos botones de exportación se ejecutaron sin errores en consola.

### Errores encontrados y corregidos en esta sesión
1. **El CLI de Supabase (`supabase.exe` descargado vía npx) quedó bloqueado por una directiva de Application Control de Windows** ("Una directiva de Control de aplicaciones bloqueó este archivo") — posiblemente por ser una máquina gestionada por la institución. No se intentó sortear la política (sería modificar configuración de seguridad del sistema, fuera de lugar). En su lugar, se cambió a invocar la **Management API de Supabase directamente por HTTP** (`POST /v1/projects/{ref}/database/query` con el Personal Access Token) para aplicar migraciones y hacer consultas de verificación — mismo resultado, sin depender del ejecutable bloqueado.
2. **El toolbar del Dashboard se encimaba** (título sobre el correo del usuario) en pantallas angostas — los hijos de `mat-toolbar` no se encogen por defecto (`min-width:auto` en flex). Corregido con `min-width:0` en los elementos y ellipsis en el título; el correo se oculta del todo bajo 520px.
3. **La credencial de `NODO-DEMO-001` quedó rotada** por una prueba anterior de la pantalla de Dispositivos, invalidando el secreto documentado en `seed.sql`/`.env`. Se emitió una nueva y se actualizó `.env`; se agregó una nota en `tools/api-tests/ingest-measurement.http` explicando que las credenciales rotan y dónde encontrar la vigente.
4. Un `:global()` en el SCSS del mapa general (sintaxis de otro framework, no válida en Angular) — corregido con `::ng-deep`, necesario porque Leaflet inyecta el HTML del popup fuera del compilador de plantillas de Angular.
5. **`TS2729`** en el diálogo de detalle de alerta: el inicializador de campo (`signal(this.data.alert)`) corría antes que el cuerpo del constructor, donde recién se asigna la propiedad de parámetro `data`. Corregido moviendo la inicialización del signal al cuerpo del constructor.
6. **Clics de navegador poco confiables por coordenadas**: en una prueba del diálogo de alerta, un comentario para "Atender" se perdió (quedó vacío) porque el clic por coordenadas falló al viewport reportado no coincidir siempre con el real. Corregido usando `find()`/`read_page()` para obtener referencias de elemento (`ref_N`) y clickear por referencia en vez de por coordenadas — más confiable, y se verificó con `read_page` que el texto sí quedó guardado.
7. **`npm install pdfmake` instaló por defecto la 0.3.11**, una reescritura orientada a Node sin la API clásica de navegador ni tipos de TypeScript — ver [DECISIONS.md](DECISIONS.md) D-018. Se bajó a `pdfmake@0.2.23` + `@types/pdfmake@0.2.13`.

### Pruebas ejecutadas
- `ng build`: exitoso, sin advertencias, después de cada pantalla.
- Verificación en vivo en el navegador (con sesión de administrador ya activa): Dispositivos, Ubicaciones, Parámetros y Umbrales verificados con datos reales (ver detalle en la entrada anterior).
- **Dashboard verificado de punta a punta con un evento real:** se envió una lectura nueva con el simulador (`tools/simulator/simulate.mjs`) y, **sin recargar el navegador**, las 4 tarjetas, las mini-gráficas y la hora de última comunicación se actualizaron solas vía Realtime; la alerta abierta se mantuvo correctamente (no se cierra sola al volver a rango normal).
- Mapa general (`/mapa`) verificado: 3 marcadores reales, popup de una ubicación sin dispositivos muestra "Sin dispositivos." como se espera.
- RPC `admin_rotate_device_credential` y `admin_create_threshold_version` verificadas por consulta directa e invocación real contra el proyecto real.
- Alertas: reconocer/atender/cerrar verificado en vivo contra una alerta real, incluyendo el comentario guardado en `alert_history`.
- Historial: filtros combinados (parámetro + fechas) y gráfica de tendencia verificados en vivo.
- Reportes: generación de reporte real para `NODO-DEMO-001` (24 mediciones, 4 parámetros, 1 alerta en el periodo) y ambas exportaciones (PDF/Excel) verificadas sin errores en consola del navegador.
- `ng build` y `tsc --noEmit` limpios (sin advertencias ni errores) tras agregar Reportes.

### Errores conocidos (no bloqueantes)
- Los mismos de la sesión 2 (WSL2 ausente) siguen vigentes.
- El `confirm()` nativo del navegador (usado para confirmar eliminar una ubicación) no es automatizable con las herramientas de este agente; funciona normal para un usuario real. Queda una ubicación de prueba (`"Punto de prueba"`) sin eliminar en el proyecto real — el usuario puede borrarla cuando quiera desde la propia pantalla.
- El servidor de desarrollo local sigue deteniéndose solo tras inactividad prolongada de la sesión; si algo da `ERR_CONNECTION_REFUSED` en `localhost:4200`, basta con relanzarlo.
- Pruebas automatizadas (unitarias/e2e) siguen sin escribirse — decisión explícita del usuario de priorizar avanzar en funcionalidad primero.
- 2 vulnerabilidades moderadas transitivas de `npm audit` en `uuid` (vía `exceljs`) — documentadas y no corregidas a propósito, ver D-019.

### Acciones manuales pendientes
1. Conseguir el ESP32 físico para completar la prueba de conectividad de `firmware/esp32-test/` (no bloquea nada más del desarrollo).
2. Brevo (Fase 4 — **siguiente paso real**, ver más abajo).
3. Sensores de oxígeno disuelto y temperatura para el ESP32 (Fase 5, no bloquea).
4. Hosting/dominio (Fase 5, no bloquea).
5. Decidir si se quiere GPS en vivo por dispositivo o mantener ubicación fija por admin (D-017, abierto).

### Próxima actividad recomendada
Fase 4 queda funcionalmente completa salvo **notificaciones por correo vía Brevo**: antes de tocar código hay que entregar al usuario los pasos manuales (crear cuenta, verificar remitente, generar API key y guardarla como secreto — nunca pedirla por chat), como indica el punto de control del propio plan. Con eso resuelto, cerrar Fase 4 en el plan y arrancar Fase 5 (integración de hardware real) o la suite de pruebas automatizadas, según decida el usuario.

### Cómo continuar en otra sesión
Indicar: **"Continúa con el proyecto IOT"**. Lo pendiente inmediato es el punto de control de Brevo (entregar instrucciones manuales) antes de escribir la Edge Function de notificaciones.

---

## Sesión 2 — 2026-09-08

### Fase actual
**Fase 2 (Semanas 4–6): Fundamentos — en progreso.** Backend real desplegado y probado de punta a punta; login real, guard de sesión y guard de rol verificados. Administración > Usuarios (RF-06 a RF-08) construida y **verificada end-to-end con un usuario real**: alta, invitación por correo, establecimiento de contraseña e inicio de sesión. Falta el resto de Administración (dispositivos, ubicaciones, parámetros, umbrales).

### Actividades terminadas (implementadas y verificadas)
- Repositorio conectado: remoto `origin` = GitHub `trabajolasc27-del/Calidad-Agua-IoT`, proyecto Supabase nuevo (`zeoedihibvbkclqsqhrf`) con integración GitHub→Supabase activa en la rama `main` (D-012).
- 15 migraciones SQL escritas y **aplicadas al proyecto real**: 14 tablas, 7 enums, políticas RLS completas por rol, motor de evaluación (`evaluate_batch`), transiciones de alerta (`acknowledge_alert`/`attend_alert`/`close_alert`), autenticación de dispositivo (`verify_device_secret`) e ingesta transaccional (`ingest_measurement_batch`).
- Edge Function `ingest-measurement` desplegada al proyecto real (requirió desactivar `verify_jwt` para esa función, ver Errores conocidos/corregidos).
- **Verificado end-to-end contra el proyecto real** (no local, no simulado) con `tools/simulator/simulate.mjs`: los 6 códigos de respuesta del contrato responden correctamente (201, 400, 401, 404, 409, 422), y una alerta se abre automáticamente tras 2 lecturas consecutivas fuera de rango, con la severidad correcta.
- Frontend Angular 21 + Angular Material scaffolded, compila sin errores ni advertencias. Implementado: `SupabaseService`, `AuthService` (signals: sesión, perfil, rol), `authGuard`, `roleGuard`, pantallas de inicio de sesión y recuperación de contraseña, cascarones protegidos de Dashboard y Administración.
- Datos de demostración sembrados en el proyecto real (`seed.sql`, todo marcado `is_demo`).
- Documentación de Fase 1 actualizada: D-007/D-008 confirmadas por el usuario, D-010 resuelto con versiones reales, D-013 (Angular Material) agregada.
- Primer usuario administrador creado (`trabajolasc27@gmail.com`) y promovido a `admin` en `profiles`.
- **Login real verificado desde el navegador** contra `ng serve` + Supabase real: sesión iniciada, perfil y rol cargados, `Dashboard` muestra correo y rol, botón "Ir a Administración" visible solo para `admin`, `roleGuard` deja pasar a `/administracion`, botón de cerrar sesión presente. Ciclo completo de RF-01 a RF-05 confirmado con una cuenta real, no solo con el caso de error.
- **Administración > Usuarios construida y verificada con datos reales** (RF-06 a RF-08): listado (con estados de carga/vacío/error), alta vía la Edge Function `admin-create-user` (invitación real por correo, la cuenta nunca pasa por un password que el admin maneje), edición de nombre/rol/estado, asignación de dispositivos a técnicos de campo. `profiles.email` agregado (denormalizado desde `auth.users`, sincronizado por trigger) para poder listar usuarios sin exponer el esquema `auth`.
- Nueva pantalla `SetPassword` (`/restablecer-contrasena`): recibe el token que Supabase pone en la URL tras un enlace de invitación o de recuperación de contraseña y deja fijar la contraseña. Sin esto ninguno de los dos flujos por correo llegaba a ningún lado.
- `site_url`/`uri_allow_list` del proyecto Supabase corregidos (apuntaban al `localhost:3000` por defecto, no al `4200` real de esta app), vía la Management API tocando solo esos dos campos.

### Errores encontrados y corregidos en esta sesión
1. **`verify_jwt` de la plataforma bloqueaba el ESP32/simulador** — la Edge Function usa el header `Authorization` para el secreto propio del dispositivo, no un JWT de Supabase; la verificación por defecto de la plataforma lo rechazaba antes de que el código de la función corriera. Corregido con `verify_jwt = false` en `supabase/config.toml` para esa función.
2. **`verify_device_secret`: columna ambigua** — `returns table (device_id uuid, ...)` declara `device_id` como variable visible en toda la función, chocando con la columna `device_credentials.device_id`. Corregido calificando la columna con alias de tabla.
3. **`verify_device_secret`: `crypt()` no encontrado** — pgcrypto vive en el esquema `extensions` en este proyecto, no en `public`; con el `search_path` restringido a `public` (a propósito, por seguridad) la función no encontraba `crypt()`. Corregido agregando `extensions` al `search_path` de esa función específica.
4. **Enlace de invitación llevaba a `localhost:3000`** (el `site_url` por defecto del proyecto), no al `4200` real. Corregido vía Management API (ver D-015); **no** se usó `supabase config push` porque hubiera pisado ajustes remotos no relacionados (Twilio SMS, MFA, etc.) — el propio CLI lo advierte.
5. **Faltaba la pantalla que completa el enlace de invitación/recuperación.** Ni crear un usuario ni "olvidé mi contraseña" servían de nada sin una ruta que tomara el token de la URL y llamara `auth.updateUser({ password })`. Agregada como `SetPassword`.

Los cinco se encontraron probando de verdad contra el proyecto real (no se habrían visto solo leyendo el código), y quedaron corregidos y reverificados antes de continuar — el último, con una invitación real de punta a punta: alta → correo → contraseña → login.

### Pruebas ejecutadas
- `ng build` (Angular): exitoso, sin advertencias de presupuesto, en cada punto de esta sesión.
- Simulador IoT contra la Edge Function real: perfiles normal/alerta/duplicado/inválido/no-autorizado/no-existe — los 6 verificados con el código HTTP esperado.
- Verificación directa en SQL (`db query --linked`) del motor de evaluación y de la apertura de alertas.
- Prueba de RLS: intento de `INSERT` en `locations` como `anon` correctamente rechazado (401, `new row violates row-level security policy`).
- Ciclo completo de creación de usuario real: alta desde la pantalla de Usuarios → correo de invitación recibido → `SetPassword` → login exitoso con el usuario nuevo (confirmado por el usuario).

### Errores conocidos (no bloqueantes)
- Docker Desktop no puede levantar Supabase local en esta máquina porque **WSL2 no está instalado** (cambio de sistema que requiere reinicio; no se hizo sin autorización explícita). No es necesario: se está probando contra el proyecto real, que está vacío de datos reales.
- Las funciones RPC de transición de alertas (`acknowledge_alert`/`attend_alert`/`close_alert`) todavía no se probaron con una sesión de usuario real (sí se probó todo lo demás con sesión real). Se probarán al construir la pantalla de Alertas.
- El servidor de desarrollo local (`ng serve`) se detiene solo tras un rato de inactividad de la sesión de Claude Code; si un enlace de correo da `ERR_CONNECTION_REFUSED` en `localhost:4200`, probablemente solo haga falta volver a levantarlo.

### Acciones manuales pendientes
1. Brevo (Fase 4, no urge).
2. Sensores de oxígeno disuelto y temperatura para el ESP32 (Fase 5, no bloquea).
3. Hosting/dominio (Fase 5, no bloquea).
4. (Opcional) Revocar el Personal Access Token de Supabase usado para este despliegue (`supabase.com/dashboard/account/tokens`) si no lo vas a seguir usando, o conservarlo si quieres que sigamos desplegando por CLI.

### Próxima actividad recomendada
Seguir con el resto de Administración sobre el mismo patrón que Usuarios: Dispositivos (RF-11 a RF-14, incluye emitir la credencial del dispositivo), Ubicaciones (RF-09/RF-10), Parámetros y Umbrales (RF-15 a RF-17).

### Cómo continuar en otra sesión
Indicar: **"Continúa con la Fase 2 del proyecto IOT"** para seguir con las pantallas de Administración (Dispositivos es la siguiente natural, porque Umbrales y el dashboard dependen de que existan dispositivos).

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
