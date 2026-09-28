# Guía de Interfaz (sistema de diseño)

Documenta la identidad visual y los componentes reutilizables introducidos en el rediseño de 2026-09-27 (ver [DECISIONS.md](DECISIONS.md) D-023). El objetivo: que cualquier pantalla nueva se sienta parte de la misma plataforma sin que quien la construya tenga que redescubrir estas reglas.

## Identidad visual

Tema "agua + tecnología": azul profundo como color de marca, turquesa como acento, verde/ámbar/rojo reservados **exclusivamente** para los 3 estados de evaluación (Conforme/Alerta/Crítico) — nunca se usan estos 3 colores para otra cosa (botones, énfasis decorativo, etc.), precisamente para que su aparición siga comunicando gravedad sin ambigüedad.

Todos los colores viven como variables CSS en `frontend/src/styles.scss` (`:root`), no como valores sueltos por archivo:

| Variable | Uso |
|---|---|
| `--wq-primary` / `--wq-primary-soft` | Marca (barra lateral, botones primarios, enlaces activos) |
| `--wq-accent` / `--wq-accent-soft` | Turquesa, acentos secundarios (campana con alertas, notas informativas) |
| `--wq-secondary` | Azul secundario (texto sobre `--wq-accent-soft`, panel de marca del login) |
| `--wq-bg` / `--wq-surface` / `--wq-surface-alt` | Fondo de app, superficie de tarjetas, fondo alterno |
| `--wq-border` | Bordes de tarjetas, tablas, separadores |
| `--wq-text` / `--wq-text-soft` | Texto principal / secundario |
| `--wq-ok` `--wq-warn` `--wq-crit` (+ `-soft`) | Conforme / Alerta / Crítico — el color y su fondo de píldora |
| `--wq-radius-sm/md/lg`, `--wq-shadow-sm/md` | Escala de bordes redondeados y sombras discretas |

El tema de Angular Material (`mat.theme()` en `styles.scss`) se genera a partir de esta misma paleta (`ng generate @angular/material:m3-theme --primary-color=... --tertiary-color=...`, ver `src/theme-colors.scss`), así que los componentes de Material (botones, campos, diálogos) y el CSS a mano comparten un único origen de color — cambiar la identidad de marca es cambiar estas variables en un solo lugar, no perseguir cada pantalla.

Tipografía: **IBM Plex Sans** (interfaz y títulos), **IBM Plex Mono** (`.mono`, para códigos de dispositivo y datos tabulares), cargadas en `index.html`.

## Navegación

`AppShell` (`core/shell/`): barra lateral con ícono + etiqueta por sección, plegable a solo íconos en escritorio (botón "Contraer menú", con tooltip que muestra la etiqueta al pasar el mouse sobre el ícono) y convertida en cajón deslizable sobre el contenido en pantallas angostas (`< 760px`). El encabezado superior es fijo (`position: sticky`) y compacto: botón de menú, campana de notificaciones (cuenta de alertas activas, con vínculo directo a Alertas) y menú de usuario (nombre, rol, acceso a Perfil, cerrar sesión).

Los enlaces visibles se filtran por rol (`items` en `app-shell.ts`), pero esto es solo conveniencia de interfaz — la fuente real de verdad de qué puede ver/hacer cada rol son las políticas RLS (ver [ROLE_MATRIX.md](ROLE_MATRIX.md)).

## Componentes compartidos (`shared/`)

| Componente | Selector | Para qué |
|---|---|---|
| `PageHeader` | `wq-page-header` | Título + subtítulo + zona de acciones (`[actions]`) al inicio de cada pantalla. Reemplaza el antiguo `<h1 class="page-title">` repetido a mano. |
| `StatusBadge` | `wq-status-badge` | Píldora ícono+texto+color para cualquier tipo de estado (evaluación, gravedad de alerta, estado del flujo de alerta, estado de dispositivo). Los mapeos de cada tipo de estado a tono/ícono/etiqueta viven centralizados en `shared/status.util.ts` (`evaluationStatus`, `alertSeverityStatus`, `alertStatusMeta`, `deviceStatusMeta`) — una pantalla nueva no debe inventar su propio `@switch` para esto. |
| `EmptyState` | `wq-empty-state` | Estado vacío o de error: ícono + mensaje + acción opcional proyectada. |
| `ConfirmDialog` / `ConfirmService` | `wq-confirm-dialog` | Confirmación genérica antes de una acción importante o destructiva (`confirmService.ask({...})` devuelve `Promise<boolean>`). Sustituye los `confirm()` nativos del navegador que quedaban sueltos. |
| `Gauge` | `wq-gauge` | Carátula tipo velocímetro (SVG propio, sin librería) para el valor de un parámetro contra sus umbrales reales. Usado en Dashboard y Reportes. |

Clase utilitaria `.wq-card` (`styles.scss`): tarjeta base (fondo, borde, radio, sombra) para cualquier contenedor — evita que cada pantalla repita su propio borde+radio+padding.

## Patrones de pantalla

- **Encabezado de pantalla:** `<wq-page-header title="..." subtitle="...">`, con acciones (botones, selectores) proyectadas en `[actions]`.
- **Estados de carga/vacío/error:** `@switch (state())` con `mat-spinner` para "cargando" y `wq-empty-state` para "vacío"/"error" (con `tone="error"` y un botón "Reintentar" cuando aplica).
- **Confirmación antes de una acción importante:** inyectar `ConfirmService` y usar `await confirmService.ask({ title, message, confirmLabel, tone: 'danger' })` antes de ejecutar la acción — nunca el `confirm()` nativo del navegador.
- **Gráficas de tendencia (Chart.js):** cada `<canvas>` debe vivir dentro de un contenedor propio con **altura fija explícita en CSS** (`height: Npx` en el `div` que envuelve al canvas, nunca en el canvas mismo ni en un padre `flex`/`grid` sin altura). Con `responsive: true` + `maintainAspectRatio: false`, Chart.js recalcula el tamaño del canvas contra el de su contenedor inmediato en cada ciclo de resize — si ese contenedor no tiene una altura propia, se genera un bucle de crecimiento infinito (bug real encontrado y corregido en el Dashboard, ver D-022 en DECISIONS.md).
- **Botones durante un envío:** siempre `[disabled]="submitting()"`, con un `mat-spinner` pequeño reemplazando el texto/ícono del botón mientras dura la acción — nunca permitir un doble envío.

## Accesibilidad

- Enlace "Saltar al contenido principal" (`.skip-link`, visible solo al recibir foco) como primer elemento de `AppShell`.
- Anillo de foco visible (`:focus-visible`) en color de acento sobre enlaces y botones.
- Iconografía siempre acompañada de texto (RNF-02): ningún estado se comunica solo por color.
- Formularios con `<mat-label>`/`<mat-error>` asociados a su campo; el campo de contraseña incluye un botón de mostrar/ocultar con `aria-label` dinámico.

## Idioma y formato regional

Toda la interfaz está en español (ver auditoría en D-022/D-023 de DECISIONS.md). Fechas y números usan el locale `es-MX`, registrado globalmente en `app.config.ts` (`LOCALE_ID` + `registerLocaleData`) — el pipe `date` de Angular y el `MatPaginatorIntl` (etiquetas del paginador) ya no dependen del locale del navegador. Cualquier `toLocaleString()`/`toLocaleDateString()` llamado directamente en TypeScript (fuera del pipe de Angular) debe pasar `'es-MX'` explícitamente, porque esas llamadas nativas no leen `LOCALE_ID`.

## Responsivo

Probado manualmente en ~1920×1080, ~1366×768, ~768×1024 y ~390×844 (ver [PRUEBAS.md](PRUEBAS.md) para el detalle de qué se confirmó). El punto de quiebre de la barra lateral (760px) y el de los paneles de marca de autenticación (860px) son los dos únicos puntos de quiebre estructurales; el resto de la adaptación es con `grid`/`flex` `auto-fit`/`wrap` normal.
