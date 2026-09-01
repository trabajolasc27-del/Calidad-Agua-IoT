# Requerimientos del Sistema

Proyecto: Plataforma IoT para la gestión y evaluación automatizada de la calidad del agua en regiones vulnerables.

## 1. Alcance oficial de parámetros

La plataforma trabaja **exclusivamente** con:

| Código | Nombre | Unidad |
|---|---|---|
| `ph` | pH | adimensional (0–14) |
| `dissolved_oxygen` | Oxígeno disuelto | mg/L |
| `turbidity` | Turbidez | NTU |
| `temperature` | Temperatura | °C |

Cualquier otro parámetro (gases, presión, conductividad, etc.) queda fuera de alcance salvo autorización expresa y documentada (ver [DECISIONS.md](DECISIONS.md) D-001).

## 2. Declaración de límites del sistema

- La evaluación de parámetros es **informativa**. La plataforma **no certifica potabilidad del agua** ni sustituye análisis de laboratorio acreditado.
- No se afirma cumplimiento de la NOM-001 ni de ninguna otra norma oficial. Los umbrales son configurables por un administrador y deben tratarse como demostrativos hasta que una autoridad competente los valide.
- No incluye: aplicación móvil nativa, machine learning/predicción, control remoto de actuadores (bombas, válvulas), ni protocolo MQTT.

## 3. Requerimientos funcionales

Identificador `RF-XX`. Rol principal indicado entre paréntesis (A = Administrador, N = Analista ambiental, T = Técnico de campo, * = todos los autenticados).

### Autenticación y perfil
- **RF-01** (*): Iniciar sesión con correo y contraseña mediante Supabase Auth.
- **RF-02** (*): Cerrar sesión.
- **RF-03** (*): Solicitar recuperación de contraseña por correo.
- **RF-04** (*): Ver y editar el propio perfil (nombre, ver rol asignado, cambiar contraseña si la sesión lo permite).
- **RF-05** (*): Mostrar mensajes de error claros ante credenciales inválidas, cuenta inactiva o fallas de red.

### Gestión de usuarios y roles (A)
- **RF-06** (A): Crear, editar, activar/desactivar usuarios.
- **RF-07** (A): Asignar un rol (Administrador, Analista ambiental, Técnico de campo) a cada usuario.
- **RF-08** (A): Asignar dispositivos a un Técnico de campo.

### Ubicaciones (A crea/edita; N y T consultan)
- **RF-09** (A): Alta, edición y baja lógica de ubicaciones (nombre, descripción, latitud, longitud).
- **RF-10** (*): Ver ubicaciones en mapa (Leaflet + OpenStreetMap) con los nodos asociados.

### Dispositivos
- **RF-11** (A): Alta, edición, activación/desactivación de dispositivos ESP32 (código único, nombre, ubicación).
- **RF-12** (A): Emitir/rotar credencial de dispositivo (secreto mostrado una sola vez).
- **RF-13** (N, T-asignados): Consultar lista y detalle de dispositivos, incluyendo estado y última comunicación (`last_seen`).
- **RF-14** (T-asignados): Consultar únicamente los dispositivos que le fueron asignados.

### Parámetros y umbrales (A)
- **RF-15** (A): Administrar catálogo de parámetros (los 4 oficiales; extensible a futuro).
- **RF-16** (A): Crear nuevas versiones de umbrales por parámetro (rangos normal/alerta/crítico, lecturas consecutivas requeridas antes de abrir alerta), manteniendo historial de versiones anteriores.
- **RF-17** (N): Consultar umbrales vigentes (solo lectura).

### Recepción de mediciones IoT
- **RF-18** (dispositivo autenticado): Recibir lotes de medición HTTPS POST con los 4 parámetros, validarlos y almacenarlos de forma transaccional.
- **RF-19** (sistema): Rechazar lotes duplicados (mismo dispositivo + secuencia).
- **RF-20** (sistema): Actualizar `last_seen` del dispositivo al recibir un lote válido.
- **RF-21** (sistema): Ejecutar el motor de evaluación sobre cada parámetro recibido y almacenar el resultado (`CONFORME`/`ALERTA`/`CRITICO`).

### Dashboard
- **RF-22** (A, N, T-asignados): Ver tarjetas de los 4 parámetros con la última lectura, semaforización, estado del dispositivo y fecha de última comunicación.
- **RF-23** (*): Seleccionar dispositivo desde un listado/selector.
- **RF-24** (*): Ver gráfica reciente de tendencia por parámetro.
- **RF-25** (*): Ver alertas activas del dispositivo seleccionado.
- **RF-26** (*): Actualización de datos en tiempo real sin recargar la página (Supabase Realtime).

### Historial
- **RF-27** (A, N, T-asignados): Consultar histórico de mediciones con filtros por dispositivo, ubicación, parámetro, estado de evaluación y rango de fechas.
- **RF-28** (*): Tabla paginada y gráficas de tendencia sobre el conjunto filtrado.
- **RF-29** (*): Mostrar estados de carga, vacío y error en la consulta.

### Alertas
- **RF-30** (sistema): Abrir una alerta cuando una medición cruza el umbral configurado, evitando duplicar alertas mientras exista una equivalente abierta para el mismo dispositivo/parámetro.
- **RF-31** (A, N): Reconocer, atender y cerrar alertas, dejando registro de usuario responsable y comentario de seguimiento.
- **RF-32** (A, N, T-asignados solo lectura — ver D-007): Consultar alertas nuevas, reconocidas, atendidas y cerradas, con parámetro, valor, dispositivo, gravedad, fecha y responsable.
- **RF-33** (sistema): Registrar el historial de cambios de estado de cada alerta.
- **RF-34** (sistema): Enviar notificación por correo (Brevo) al abrirse una alerta, registrando el resultado del envío.

### Calibraciones y mantenimiento
- **RF-35** (T-asignados, A): Registrar calibraciones y mantenimientos realizados a un dispositivo.
- **RF-36** (A, N solo lectura — ver D-008): Consultar historial de calibraciones y mantenimiento.

### Reportes
- **RF-37** (A, N): Generar reporte por dispositivo y periodo con valores mínimo/máximo/promedio, número de mediciones y alertas detectadas.
- **RF-38** (A, N): Exportar el reporte a PDF.
- **RF-39** (A, N): Exportar el reporte a Excel.

## 4. Requerimientos no funcionales

- **RNF-01 Responsividad:** la interfaz debe funcionar correctamente en teléfono, tableta y computadora.
- **RNF-02 Accesibilidad de la gravedad:** el estado (conforme/alerta/crítico) se comunica con color **más** ícono **más** texto, nunca solo color.
- **RNF-03 Seguridad:** autorización aplicada tanto en la interfaz como en Row Level Security de la base de datos; ninguna operación queda protegida solo ocultando un botón.
- **RNF-04 Secretos:** ninguna clave administrativa ni secreto de dispositivo se expone en el frontend ni se sube a Git; `.env.example` no contiene valores reales.
- **RNF-05 Trazabilidad:** cada medición conserva el umbral y la regla aplicados en el momento de la evaluación, aun si el umbral cambia después.
- **RNF-06 Disponibilidad de estados de UI:** toda vista con datos remotos contempla estado de carga, error, vacío y, donde aplique, sin conexión.
- **RNF-07 Mantenibilidad:** separación de componentes, servicios y lógica de negocio; sin duplicación de reglas de evaluación.
- **RNF-08 Verificabilidad:** cada módulo se compila y prueba antes de continuar con el siguiente (ver [PROGRESS.md](PROGRESS.md)).
- **RNF-09 No sobre-alcance:** no se agregan funcionalidades no solicitadas (app móvil, ML, control de actuadores, sensores de gas).

## 5. Casos de uso

Ver [USE_CASES.md](USE_CASES.md) para el detalle de flujos principales y alternos.

## 6. Trazabilidad

La matriz de roles detallada está en [ROLE_MATRIX.md](ROLE_MATRIX.md). El contrato de datos del ESP32 está en [API_CONTRACT.md](API_CONTRACT.md). El modelo de datos está en [DATABASE_DESIGN.md](DATABASE_DESIGN.md).
