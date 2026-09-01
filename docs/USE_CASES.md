# Casos de Uso

Notación: Actor, Precondición, Flujo principal, Flujos alternos, Postcondición. Referencian los requerimientos en [REQUIREMENTS.md](REQUIREMENTS.md).

---

### UC-01 Iniciar sesión
- **Actor:** Administrador, Analista ambiental, Técnico de campo.
- **Precondición:** el usuario tiene una cuenta activa creada por un Administrador.
- **Flujo principal:** el usuario ingresa correo y contraseña → el sistema valida con Supabase Auth → redirige al Dashboard según su rol.
- **Flujos alternos:** credenciales inválidas (mensaje de error, sin revelar si el correo existe); cuenta desactivada (mensaje específico, sin acceso); usuario solicita "olvidé mi contraseña" → recibe correo de recuperación.
- **Postcondición:** sesión iniciada y token almacenado de forma segura por el cliente.

### UC-02 Recibir medición de un nodo ESP32
- **Actor:** dispositivo ESP32 (o simulador).
- **Precondición:** el dispositivo existe, está activo y posee credencial vigente.
- **Flujo principal:** el nodo envía POST con `device_id`, `sequence`, `measured_at`, `values` → la Edge Function autentica el dispositivo → valida formato y tipos → verifica que `(device_id, sequence)` no exista → inserta `measurement_batches` y `measurements` en una transacción → actualiza `last_seen` → invoca el motor de evaluación → responde 201.
- **Flujos alternos:** credencial inválida → 401; dispositivo inexistente → 404; JSON mal formado o campos faltantes → 400; secuencia duplicada → 409; valores no numéricos/no finitos → 422; error interno → 500 (sin filtrar detalles internos ni credenciales en la respuesta ni en logs).
- **Postcondición:** el lote queda almacenado, cada parámetro tiene un resultado de evaluación, y se crean alertas si corresponde.

### UC-03 Evaluar una medición y abrir alerta
- **Actor:** sistema (motor de evaluación, disparado por UC-02).
- **Precondición:** existe un umbral activo para el parámetro evaluado.
- **Flujo principal:** por cada valor recibido, se compara contra el umbral activo del parámetro → se asigna `CONFORME`, `ALERTA` o `CRITICO` → se guarda el umbral y la regla aplicados → si el resultado no es `CONFORME` y se alcanzó el número de lecturas consecutivas configurado, y no existe ya una alerta abierta equivalente, se crea una alerta nueva.
- **Flujos alternos:** no existe umbral activo para el parámetro → la medición se guarda sin evaluación y se registra como incidencia de configuración (visible para el Administrador); el valor vuelve a rango normal → se registra el cambio de estado sin borrar el historial de la alerta previamente abierta (queda pendiente de cierre manual, ver UC-04).
- **Postcondición:** cada medición tiene un estado; las alertas no se duplican indefinidamente mientras estén abiertas.

### UC-04 Reconocer, atender y cerrar una alerta
- **Actor:** Administrador, Analista ambiental.
- **Precondición:** existe una alerta en estado `NUEVA` o `RECONOCIDA`.
- **Flujo principal:** el usuario abre el módulo de Alertas → selecciona una alerta → la reconoce (queda `RECONOCIDA`, registra usuario y fecha) → la atiende agregando un comentario de seguimiento (`ATENDIDA`) → finalmente la cierra (`CERRADA`).
- **Flujos alternos:** un Técnico de campo intenta cambiar el estado de una alerta → operación rechazada tanto en la interfaz como por RLS (ver D-007); se intenta saltar de `NUEVA` a `CERRADA` sin pasar por los estados intermedios → rechazado por la función de transición de estado.
- **Postcondición:** el historial de estados (`alert_history`) contiene cada transición con usuario y fecha.

### UC-05 Consultar dashboard en tiempo real
- **Actor:** Administrador, Analista ambiental, Técnico de campo (solo dispositivos asignados).
- **Precondición:** sesión iniciada; existe al menos un dispositivo visible para el rol.
- **Flujo principal:** el usuario selecciona un dispositivo → el sistema muestra la última lectura de los 4 parámetros, semaforización, estado del dispositivo, última comunicación, alertas activas y gráfica reciente → al llegar una nueva medición vía Realtime, la vista se actualiza sin recargar.
- **Flujos alternos:** el dispositivo nunca ha enviado datos (estado vacío); se pierde la conexión Realtime (indicador de reconexión, sin bloquear el resto de la interfaz).
- **Postcondición:** ninguna (vista de solo lectura).

### UC-06 Consultar historial con filtros
- **Actor:** Administrador, Analista ambiental, Técnico de campo (solo dispositivos asignados).
- **Flujo principal:** el usuario define filtros (dispositivo, ubicación, parámetro, estado, rango de fechas) → el sistema consulta mediciones paginadas y muestra tabla + gráfica de tendencia.
- **Flujos alternos:** sin resultados (estado vacío con sugerencia de ampliar el filtro); error de consulta (mensaje y opción de reintentar).
- **Postcondición:** ninguna.

### UC-07 Generar y exportar un reporte
- **Actor:** Administrador, Analista ambiental.
- **Precondición:** existen mediciones para el dispositivo y periodo seleccionados.
- **Flujo principal:** el usuario selecciona dispositivo y periodo → el sistema calcula mínimos, máximos, promedios, número de mediciones y alertas del periodo → el usuario exporta a PDF y/o Excel.
- **Flujos alternos:** periodo sin datos → mensaje explícito, sin generar archivo vacío engañoso.
- **Postcondición:** archivo descargado localmente por el navegador; no se almacena en el servidor.

### UC-08 Administrar dispositivos y ubicaciones
- **Actor:** Administrador.
- **Flujo principal:** el Administrador crea una ubicación (o la reutiliza) → da de alta un dispositivo asociándolo a la ubicación → el sistema genera una credencial de dispositivo mostrada una única vez → el Administrador la transcribe al firmware del ESP32 (o al simulador).
- **Flujos alternos:** el Administrador desactiva un dispositivo → deja de aceptar nuevas mediciones (la Edge Function responde 401/403) sin borrar su historial.
- **Postcondición:** el dispositivo queda operable o inhabilitado según corresponda.

### UC-09 Configurar umbrales de un parámetro
- **Actor:** Administrador.
- **Precondición:** el parámetro existe en el catálogo.
- **Flujo principal:** el Administrador crea una nueva versión de umbral (rangos normal/alerta/crítico, lecturas consecutivas requeridas) → el sistema marca la versión anterior como inactiva y activa la nueva a partir de ese momento, sin alterar la evaluación ya guardada en mediciones pasadas.
- **Postcondición:** las mediciones futuras usan el nuevo umbral; las pasadas conservan el umbral con el que fueron evaluadas.

### UC-10 Registrar calibración o mantenimiento
- **Actor:** Técnico de campo (dispositivos asignados), Administrador.
- **Flujo principal:** el usuario selecciona un dispositivo asignado → registra fecha, tipo (calibración/mantenimiento), notas y próxima fecha sugerida.
- **Postcondición:** el registro queda disponible en el historial del dispositivo.
