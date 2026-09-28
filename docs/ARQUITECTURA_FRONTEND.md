# Arquitectura del Frontend

Angular 21 con componentes *standalone* (sin `NgModule`) y *signals* para el estado local. Este documento explica cómo está organizado el código, cómo fluyen los datos y las decisiones de diseño que no son evidentes con solo leer un archivo.

## Estructura de carpetas

```
frontend/src/app/
├── app.ts / app.html / app.routes.ts / app.config.ts   # raíz de la aplicación
├── core/
│   ├── auth.service.ts          # sesión, perfil, rol — estado global vía signals
│   ├── supabase.service.ts      # cliente único de Supabase (anon key)
│   ├── notifications.service.ts # contador de alertas activas para la campana del encabezado
│   ├── guards/                  # authGuard, roleGuard
│   ├── models/                  # interfaces TypeScript que reflejan las tablas de Supabase
│   └── shell/                   # AppShell: barra lateral + encabezado + <router-outlet>
├── shared/                      # componentes reutilizables entre pantallas (ver GUIA_INTERFAZ.md)
└── features/                    # una carpeta por módulo/pantalla (ver MODULOS.md)
    └── <modulo>/
        ├── <modulo>.ts/html/scss   # componente de la pantalla
        ├── <modulo>.service.ts     # acceso a datos (consultas a Supabase)
        └── <dialogo>/               # diálogos propios del módulo, si aplica
```

Cada módulo de `features/` es dueño de su propio servicio de datos — no hay una capa de "API" genérica intermedia. Esto es deliberado: cada pantalla consulta exactamente las columnas y *embeds* de PostgREST que necesita, y el tipo de retorno del servicio ya viene modelado para la plantilla, sin una capa extra que transforme datos genéricos.

## Enrutamiento y el shell de navegación

`app.routes.ts` define las rutas públicas (`iniciar-sesion`, `recuperar-contrasena`, `restablecer-contrasena`) y un árbol de rutas autenticadas anidadas bajo una ruta padre sin `path` que carga `AppShell` (`core/shell/app-shell.ts`). `authGuard` se declara una sola vez en esa ruta padre y protege todo el subárbol; `roleGuard(['administrador', ...])` se declara además en las rutas hijas que lo necesitan (`reportes`, `administracion`).

`AppShell` es el marco visual de toda pantalla autenticada: una barra lateral (`MatSidenav`) con los accesos a cada módulo — colapsable a solo íconos en escritorio, y convertida en cajón deslizable (`mode="over"`) en pantallas angostas (`BreakpointObserver` con punto de quiebre en 760px) — y un encabezado compacto con el botón de menú, la campana de notificaciones y el menú de usuario. Los enlaces visibles se filtran por el rol de la sesión activa (`authService.role()`), aunque el control real de acceso vive en las políticas RLS de Supabase, no en ocultar un enlace.

## Flujo de datos: signals + servicios, sin store global

No hay NgRx ni un *store* central. Cada componente de pantalla:

1. Inyecta su servicio de datos (p. ej. `DashboardService`).
2. En `ngOnInit`/el constructor, llama a los métodos del servicio (`async`, devuelven promesas de datos ya tipados) y guarda el resultado en `signal()`s propias del componente.
3. La plantilla lee esas signals directamente (`measurements()`, `state()`, etc.); Angular recalcula solo lo que depende de la signal que cambió.

`AuthService` es la única signal verdaderamente global (vive en la raíz, `providedIn: 'root'`): expone `session`, `profile`, `role` e `isAuthenticated` como signals de solo lectura, más una `readyPromise` que los guards esperan antes de decidir un redirect (evita mandar a `/iniciar-sesion` a alguien ya autenticado mientras Supabase todavía está restaurando la sesión guardada).

## Comunicación con Supabase

`SupabaseService` crea un único `SupabaseClient` con la `anon key` pública (nunca la `service_role key`, que solo vive del lado del servidor en las Edge Functions). Cada `*.service.ts` de `features/` usa ese cliente para:

- **Consultas de solo lectura** (`select`), incluyendo *embeds* de PostgREST para traer relaciones en una sola llamada (p. ej. `dispositivos(*, ubicaciones(nombre))`).
- **Escrituras** (`insert`/`update`) cuando la operación es una tabla simple con RLS ya validando el permiso (p. ej. registrar una calibración).
- **RPC** (`.rpc(...)`) para cualquier operación con lógica de negocio del lado del servidor: transiciones de estado de alertas (`reconocer_alerta`, `atender_alerta`, `cerrar_alerta`), emisión de credenciales de dispositivo (`admin_rotar_credencial_dispositivo`). El cliente nunca hace un `UPDATE` directo sobre `alertas`.
- **Realtime** (`.channel(...).on('postgres_changes', ...)`) para el Dashboard (nuevas mediciones y alertas de un dispositivo) y para la campana de notificaciones global (cualquier cambio en `alertas`).

## Autenticación y roles

`AuthService` envuelve `supabase.auth`: `signIn`, `signOut`, `signOutOtherSessions` (cierra otras sesiones sin afectar la actual), `requestPasswordReset`, `setPassword`. Tras iniciar sesión, carga el `perfil` (tabla `perfiles`, con el rol) una sola vez y lo mantiene en una signal. Los 3 roles (`administrador`, `analista`, `tecnico_campo`) y sus permisos están documentados en [ROLE_MATRIX.md](ROLE_MATRIX.md) — cada permiso se aplica **dos veces**: oculto/deshabilitado en la interfaz y rechazado por RLS si se invocara directamente.

## Evaluación de mediciones

El frontend nunca calcula si una lectura es Conforme/Alerta/Crítico. Esa evaluación ocurre en una función de PostgreSQL (`evaluar_valor_medicion`, invocada por la Edge Function de ingesta) y el resultado llega ya resuelto en la columna `resultado_evaluacion`. El frontend solo lo **muestra** (con el color/ícono correspondiente vía `shared/status.util.ts`) y, en el caso del componente `wq-gauge`, dibuja las bandas de color según el umbral activo — puramente visual, no una segunda evaluación.

## Tiempo real

El Dashboard se suscribe (`DashboardService.subscribeToDevice`) a `INSERT` en `lotes_medicion` y a cualquier cambio en `alertas` del dispositivo seleccionado; cada evento dispara una recarga "silenciosa" (sin mostrar el spinner de carga completa) para que la pantalla se sienta viva sin parpadear. La campana de notificaciones del encabezado (`NotificationsService`) hace lo mismo mirando la tabla `alertas` completa (acotada por las mismas políticas RLS que ya limitan qué alertas ve cada rol).

## Flujo de alertas

`NUEVA → RECONOCIDA → ATENDIDA → CERRADA` — estos 4 valores viven así, en español, directamente en la base de datos (decisión D-021, por requisito de trámites institucionales); no existe una traducción de valores en inglés porque nunca estuvieron en inglés en esta base de datos. `shared/status.util.ts` centraliza el ícono y color de cada estado para que Dashboard/Alertas/el diálogo de detalle no repitan su propio `@switch`.

## Generación de reportes

`ReportsService.buildReport` trae las mediciones del periodo (con un límite de 2000 filas, indicado al usuario si se alcanza), calcula mín/máx/promedio/conteos del lado del cliente (no hay una función SQL de agregación dedicada) y arma el objeto `ReportData` que consume tanto la pantalla como `exportPdf()`/`exportExcel()` (pdfmake y ExcelJS, ambos ejecutándose en el navegador).

## Manejo de estados y errores

Cada pantalla con datos asíncronos sigue el mismo patrón: una signal `state: 'loading' | 'data' | 'empty' | 'error'` que la plantilla resuelve con `@switch`, usando los componentes compartidos `wq-empty-state` (vacío/error) y `mat-spinner` (cargando). Ningún servicio deja que un error de Supabase llegue crudo a la plantilla: los métodos capturan el `error` de la respuesta y lanzan un `Error` con un mensaje en español, que el componente muestra tal cual. La sesión vencida la resuelve `authGuard` (redirige a `/iniciar-sesion`); no hay un interceptor HTTP global porque el cliente de Supabase ya reintenta/renueva el token automáticamente.

## Variables de entorno

`frontend/src/environments/environment.ts` expone `supabaseUrl` y `supabaseAnonKey` (ambos públicos por diseño: la seguridad real la da RLS, no ocultar estos valores). No hay secretos de servidor en el frontend.

## Cómo ejecutar y compilar

Ver [PRUEBAS.md](PRUEBAS.md).
