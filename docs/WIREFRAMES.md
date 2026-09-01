# Wireframes (baja fidelidad, descripción funcional)

Estos wireframes describen zonas y componentes por pantalla, no estilos visuales finales. Un boceto visual complementario está disponible como Artifact (enlace compartido en la conversación con el usuario). Todas las pantallas comparten:

- Barra superior: logo/nombre del proyecto, nombre de usuario, rol, botón de cierre de sesión.
- Navegación lateral (colapsable en móvil a menú inferior o hamburguesa): Dashboard, Dispositivos, Ubicaciones/Mapa, Historial, Alertas, Reportes, Administración (solo Admin), Perfil.
- Cada vista con datos remotos contempla 4 estados: **cargando** (skeleton/spinner), **con datos**, **vacío** (mensaje + acción sugerida), **error** (mensaje + botón reintentar).

---

## 1. Inicio de sesión
- Centro de pantalla: formulario con campo correo, campo contraseña, botón "Iniciar sesión", enlace "Olvidé mi contraseña".
- Mensajes de error inline bajo el campo correspondiente (no solo un toast genérico).
- Pantalla separada de recuperación: campo correo + botón "Enviar enlace de recuperación" + confirmación de envío.

## 2. Dashboard
- Selector de dispositivo (arriba, dropdown o chips).
- 4 tarjetas (pH, OD, turbidez, temperatura): valor actual, unidad, ícono + color + etiqueta de estado (CONFORME/ALERTA/CRITICO — nunca solo color).
- Panel de estado del dispositivo: activo/inactivo, fecha/hora de última comunicación.
- Panel de alertas activas del dispositivo seleccionado (lista corta, enlace a módulo Alertas).
- Gráfica de tendencia reciente (últimas N horas) de los 4 parámetros, con leyenda.
- Todo el panel se actualiza vía Realtime sin recargar; indicador discreto de "actualizado hace Xs" y de reconexión si se pierde el canal.

## 3. Dispositivos
- Lista: código, nombre, ubicación, estado, última comunicación, acciones (ver, editar, activar/desactivar — según rol).
- Alta/edición: formulario (código único, nombre, ubicación, estado); credencial mostrada una única vez al crear.
- Vista de detalle: datos generales + últimas mediciones + accesos directos a historial, calibraciones/mantenimiento y alertas de ese dispositivo.

## 4. Ubicaciones y mapa
- Lista de ubicaciones (nombre, coordenadas, número de dispositivos asociados).
- Mapa (Leaflet/OSM) con marcador por ubicación; al hacer clic muestra los nodos asociados y su estado.
- Alta/edición de ubicación (Admin): nombre, descripción, selección de coordenadas en el propio mapa o entrada manual.

## 5. Historial
- Barra de filtros: dispositivo, ubicación, parámetro, estado de evaluación, rango de fechas.
- Tabla paginada de mediciones (fecha, dispositivo, parámetro, valor, estado).
- Gráfica de tendencia sobre el conjunto filtrado.
- Estados vacío/carga/error visibles en el área de resultados sin afectar la barra de filtros.

## 6. Alertas
- Pestañas o filtro por estado: Nuevas, Reconocidas, Atendidas, Cerradas.
- Tabla/lista: dispositivo, parámetro, valor, gravedad (ícono+color+texto), fecha de apertura, responsable.
- Detalle de alerta: línea de tiempo de `alert_history`, campo de comentario de seguimiento, botones de acción según el estado actual y el rol (Admin/Analista); Técnico de campo ve la misma vista en modo solo lectura sobre sus dispositivos asignados.

## 7. Reportes
- Selector de dispositivo y periodo (fecha inicio/fin).
- Resumen: mínimos, máximos, promedios por parámetro; número de mediciones; número de alertas por gravedad.
- Gráfica(s) del periodo.
- Botones "Exportar PDF" y "Exportar Excel"; mensaje claro si el periodo no tiene datos (sin generar archivo vacío).

## 8. Administración (solo Admin)
- Sub-secciones con navegación propia: Usuarios, Dispositivos, Ubicaciones, Parámetros, Umbrales.
- Usuarios: lista + alta/edición (nombre, correo, rol, activo/inactivo) + asignación de dispositivos a técnicos de campo.
- Umbrales: por parámetro, historial de versiones, formulario para crear nueva versión (los 4 límites + lecturas consecutivas), con la versión activa resaltada.

## 9. Perfil
- Nombre, rol (solo lectura), formulario de cambio de contraseña (si Supabase Auth lo permite en el flujo elegido).

---

## Responsivo
- ≥1024px: navegación lateral fija, tablas completas, gráficas grandes.
- 768–1023px: navegación lateral colapsable, tablas con scroll horizontal contenido.
- <768px: navegación inferior o menú hamburguesa, tarjetas del dashboard en columna única, tablas transformadas a lista de tarjetas por fila cuando el ancho no alcance.
