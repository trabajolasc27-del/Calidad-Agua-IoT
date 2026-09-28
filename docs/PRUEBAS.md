# Cómo ejecutar y probar el proyecto

## Requisitos

- Node.js 24.x, npm 11.x (ver versiones exactas fijadas en [DECISIONS.md](DECISIONS.md) D-010).
- Un proyecto de Supabase ya configurado (URL + `anon key`); el proyecto real de este repositorio ya existe, no hace falta crear uno para desarrollar sobre `main`.

## Instalación

```bash
cd frontend
npm install
```

## Variables de entorno

`frontend/src/environments/environment.development.ts` (copiar desde `environment.development.example.ts` si no existe) necesita `supabaseUrl` y `supabaseAnonKey`. Ambos son valores **públicos** por diseño — la seguridad real la da Row Level Security en el servidor, no ocultar estos valores. Nunca se coloca aquí la `service_role key`.

## Ejecutar en desarrollo

```bash
npm start
```

Sirve la aplicación en `http://localhost:4200` con recarga en caliente.

## Compilar para producción

```bash
npm run build
```

Salida en `frontend/dist/frontend/`. Un build limpio (sin errores) es el requisito mínimo antes de dar por cerrado cualquier cambio de frontend en este proyecto.

## Pruebas unitarias

```bash
npm test
```

Usa el *test runner* de Angular (`@angular/build:unit-test`, basado en Vitest). El proyecto trae únicamente la prueba por defecto generada por el CLI (`app.spec.ts`) — no hay todavía una suite de pruebas unitarias para los componentes o servicios propios; queda como trabajo pendiente (ver "Funciones pendientes" más abajo).

## Lint

No hay ESLint configurado en este proyecto (`package.json` no declara un script `lint`). `npx tsc --noEmit` sirve como verificación de tipos independiente del build completo, útil durante el desarrollo porque es más rápido que `ng build` (aunque no revisa los *bindings* de plantilla HTML, que solo `ng build`/`ng serve` verifican).

## Recorrido manual recomendado

Con una sesión iniciada, recorrer en este orden: Panel (seleccionar un dispositivo con datos, confirmar que los 4 gauges y la tendencia reciente cargan) → Mapa → Historial (aplicar y limpiar filtros) → Alertas (abrir el detalle de una alerta) → Dispositivos → Mantenimiento → Reportes (generar un reporte y exportar PDF/Excel) → Administración (las 5 subpantallas) → Perfil → Información técnica. Confirmar en cada una: sin errores en la consola del navegador, estados de carga/vacío/error visibles cuando corresponde, y que los botones/diálogos funcionan.

Tamaños de ventana recomendados para revisar responsividad: ~1920×1080, ~1366×768, ~768×1024 (tablet), ~390×844 (teléfono).

## Herramientas auxiliares

- `tools/simulator/simulate.mjs`: envía mediciones sintéticas a la Edge Function de ingesta (`node tools/simulator/simulate.mjs --profile=normal|alerta`), útil para generar datos reales sin hardware.
- `tools/api-tests/ingest-measurement.http`: petición de ejemplo contra la Edge Function de ingesta, para probarla fuera de la interfaz.
- `firmware/esp32-test/`: firmware de prueba con hardware provisional (ver [DECISIONS.md](DECISIONS.md) D-016) — valida la conectividad ESP32 → Edge Function → base de datos, con valores marcados como no reales.

## Funciones pendientes (no bloqueantes)

- Suite de pruebas unitarias/de integración propia (decisión explícita de dejarlo para después, ver [PROJECT_PLAN.md](PROJECT_PLAN.md)).
- Selección y adquisición de los sensores físicos de oxígeno disuelto y temperatura ([MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #3).
- Integración de envío de correo (Brevo) para las notificaciones de alertas.
