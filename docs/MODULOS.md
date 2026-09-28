# Módulos de la Plataforma

Qué hace cada pantalla, de qué depende y para quién es visible. Los permisos reales están en las políticas RLS de Supabase ([ROLE_MATRIX.md](ROLE_MATRIX.md)); lo que sigue es la vista de interfaz.

## Autenticación (`features/auth/`)

| Pantalla | Ruta | Descripción |
|---|---|---|
| Inicio de sesión | `/iniciar-sesion` | Correo + contraseña, mostrar/ocultar contraseña, mensajes de error traducidos (nunca el texto crudo de Supabase). |
| Recuperar contraseña | `/recuperar-contrasena` | Envía el enlace de recuperación de Supabase Auth. |
| Establecer contraseña | `/restablecer-contrasena` | Pantalla a la que llega el enlace de invitación o recuperación; fija la contraseña nueva. |

## Panel (`features/dashboard/`) — `/panel`

Pantalla principal. Selector de dispositivo, indicador de conexión en tiempo real, 4 carátulas tipo velocímetro (`wq-gauge`) para pH/oxígeno disuelto/turbidez/temperatura con su tendencia respecto a la lectura anterior, estado del dispositivo (activo/inactivo, ubicación, última comunicación), panel de alertas activas, y una sección "Tendencia reciente" con una mini-gráfica independiente por parámetro (nunca mezcladas en un solo eje: sus escalas son incompatibles). Se actualiza solo, vía Supabase Realtime, sin recargar la página.

## Mapa (`features/map/`) — `/mapa`

Mapa (Leaflet + OpenStreetMap) con un marcador por ubicación registrada; el popup de cada marcador muestra sus dispositivos y el estado de cada uno, sin saturar el mapa. Lista de ubicaciones con conteo de dispositivos debajo. Solo lectura para los 3 roles — la administración de ubicaciones (alta/edición/borrado) vive en Administración.

## Historial (`features/history/`) — `/historial`

Consulta de mediciones con 6 filtros (dispositivo, ubicación, parámetro, estado de evaluación, fecha inicial, fecha final) + botón "Limpiar filtros". Al fijar un parámetro aparece su gráfica de tendencia. Tabla paginada con fecha en formato es-MX, valor con unidad, y el estado visual (`wq-status-badge`).

## Alertas (`features/alerts/`) — `/alertas`

Flujo `Nueva → Reconocida → Atendida → Cerrada` (estos 4 valores ya viven en español en la base de datos, D-021). Pestañas por estado + filtros adicionales por gravedad, dispositivo, parámetro y rango de fechas. Cada fila muestra prioridad visual (gravedad) y estado. El detalle (`alert-detail-dialog`) muestra el valor detectado, dispositivo, parámetro, fecha de apertura, línea de tiempo completa (quién hizo cada cambio y cuándo) y los botones de acción permitidos por estado y rol — con confirmación antes de cerrar una alerta. Solo Administrador y Analista ambiental pueden reconocer/atender/cerrar (D-007); Técnico de campo tiene acceso de solo lectura a las de sus dispositivos asignados.

## Dispositivos (`features/devices/`) — `/dispositivos`

Consulta de dispositivos (código, nombre, ubicación, estado, última comunicación, versión de firmware) con búsqueda por texto. Visible para los 3 roles — las políticas RLS ya limitan lo que cada quien ve (un Técnico de campo solo ve sus dispositivos asignados). Las acciones de alta/edición/activación/credencial viven exclusivamente en Administración > Dispositivos.

## Calibraciones y mantenimiento (`features/maintenance/`) — `/mantenimiento`

Bitácora combinada de calibraciones (tabla `calibraciones`) y mantenimientos (tabla `registros_mantenimiento`), filtrable por dispositivo. El botón "Registrar evento" solo aparece si el rol puede insertar (Administrador siempre; Técnico de campo solo si tiene al menos un dispositivo asignado; Analista ambiental ve la bitácora pero no puede registrar, D-008). Este módulo no existía antes del rediseño: el backend (tablas + políticas RLS) ya estaba completo, pero no había ninguna pantalla que lo usara.

## Reportes (`features/reports/`) — `/reportes` (Administrador, Analista)

Selección de dispositivo y periodo, con el botón de generar deshabilitado hasta que los 3 campos sean válidos. Muestra mediciones totales, alertas del periodo, y por cada parámetro: carátula con el promedio del periodo, mín/máx/promedio, lecturas, alertas y críticos, más su propia mini-gráfica de tendencia. Exporta a PDF (pdfmake) y Excel (ExcelJS), con indicador de progreso y los botones de exportar deshabilitados mientras dura. Si el periodo excede 2000 mediciones, se avisa que las estadísticas se calcularon solo con las primeras 2000.

## Administración (`features/admin/`) — `/administracion` (Administrador)

Shell con 5 pestañas, cada una una ruta hija:

- **Usuarios** (`/administracion/usuarios`): alta (por invitación de correo, vía la Edge Function `admin-create-user`), edición de nombre/rol, estado de la cuenta.
- **Dispositivos** (`/administracion/dispositivos`): alta/edición, activar/desactivar (con confirmación) y emisión de credencial (con confirmación — invalida la anterior de inmediato; el secreto se muestra una sola vez con aviso de que debe guardarse).
- **Ubicaciones** (`/administracion/ubicaciones`): alta/edición con mini-mapa para fijar coordenadas, eliminación (con confirmación, avisando si tiene dispositivos asignados).
- **Parámetros** (`/administracion/parametros`): catálogo fijo de los 4 parámetros oficiales — sin alta ni baja a propósito, solo edición de rango físico.
- **Umbrales** (`/administracion/umbrales`): versión activa por parámetro (con sus 4 límites e indicador de lecturas consecutivas para abrir alerta) + historial de versiones anteriores. Cada versión nueva no borra la anterior (RNF-05): una medición ya evaluada conserva el umbral con el que se evaluó.

## Perfil (`features/profile/`) — `/perfil`

Nombre, correo y rol en solo lectura (el rol solo lo cambia un Administrador desde Administración > Usuarios), estado de la cuenta, cambio de la propia contraseña (con mostrar/ocultar), y cierre de otras sesiones activas (`supabase.auth.signOut({ scope: 'others' })`, sin afectar la sesión actual). Pantalla nueva de este rediseño.

## Información técnica (`features/tech-info/`) — `/informacion-tecnica`

Ficha de los 5 componentes del proyecto (sensores de pH/oxígeno disuelto/turbidez/temperatura + ESP32): función, variable medida, unidad y rango usado en el proyecto. Los modelos exactos de los sensores de agua **no están documentados** en ningún punto anterior de este proyecto (los sensores de oxígeno disuelto y temperatura ni siquiera se han seleccionado, ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #3) — la pantalla lo marca explícitamente como pendiente en vez de inventar un modelo. Pantalla nueva de este rediseño.
