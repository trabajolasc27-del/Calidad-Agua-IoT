# Arquitectura del Sistema

## 1. Vista general

```mermaid
flowchart LR
    subgraph Campo["Campo (regiones vulnerables)"]
        ESP1["Nodo ESP32 #1"]
        ESP2["Nodo ESP32 #2..N"]
        SIM["Simulador HTTP\n(desarrollo, sin hardware)"]
    end

    subgraph Supabase["Supabase (backend gestionado)"]
        EDGE_IN["Edge Function\ningest-measurement"]
        EDGE_NOTIF["Edge Function\nsend-alert-notification"]
        RPC["Funciones SQL\n(motor de evaluación,\ntransiciones de alerta)"]
        PG[("PostgreSQL\n+ RLS")]
        AUTH["Supabase Auth"]
        RT["Supabase Realtime"]
    end

    BREVO["Brevo\n(API de correo)"]

    subgraph Cliente["Navegador (móvil / tablet / escritorio)"]
        SPA["Angular SPA"]
    end

    ESP1 -- HTTPS POST JSON --> EDGE_IN
    ESP2 -- HTTPS POST JSON --> EDGE_IN
    SIM -- HTTPS POST JSON --> EDGE_IN
    EDGE_IN -- inserta lote + mediciones --> PG
    EDGE_IN -- invoca --> RPC
    RPC -- lee umbrales / escribe evaluación y alertas --> PG
    PG -- evento de alerta nueva --> EDGE_NOTIF
    EDGE_NOTIF -- envía correo --> BREVO

    SPA -- login/sesión --> AUTH
    SPA -- consultas y mutaciones (RLS aplica) --> PG
    PG -- cambios en vivo --> RT
    RT -- push --> SPA
```

## 2. Capas y responsabilidades

| Capa | Responsabilidad | Tecnología |
|---|---|---|
| Percepción (hardware) | Captura de pH, oxígeno disuelto, turbidez y temperatura | ESP32 + sensores (ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #3) |
| Ingesta | Autenticar dispositivo, validar payload, evitar duplicados, persistir de forma transaccional | Supabase Edge Function (Deno + TypeScript) |
| Evaluación | Comparar contra umbrales activos, asignar estado, abrir/actualizar alertas, registrar historial | Función/RPC de PostgreSQL, invocada por la Edge Function de ingesta |
| Persistencia y autorización | Almacenamiento relacional, control de acceso por fila | PostgreSQL (Supabase) + Row Level Security |
| Notificación | Envío de correo al abrirse una alerta | Edge Function + API de Brevo |
| Tiempo real | Propagar cambios a los clientes conectados | Supabase Realtime |
| Presentación | Dashboard, historial, alertas, reportes, administración | Angular SPA (TypeScript) |
| Reportes | Cálculo de estadísticas y generación de archivos | Cliente (Angular) con ExcelJS y pdfmake/jsPDF, a partir de datos ya autorizados por RLS |

## 3. Por qué estas decisiones

- **La evaluación vive en la base de datos, no en Angular ni en la Edge Function de ingesta directamente:** así se garantiza que toda medición —venga de un ESP32 real, del simulador, o de una futura migración de datos— pasa por la misma regla, de forma transaccional y atómica junto con el guardado del lote.
- **Los reportes se generan en el cliente:** evita mantener infraestructura de generación de archivos en el servidor; los datos ya llegan filtrados por RLS, por lo que el archivo generado solo puede contener lo que el usuario tiene permitido ver.
- **REST HTTPS, no MQTT:** decisión explícita del alcance de este proyecto (ver D-006). Supabase Edge Functions exponen HTTPS de forma nativa; añadir un broker MQTT sería infraestructura adicional no requerida en esta primera versión.
- **Realtime en vez de polling:** Supabase Realtime permite refrescar el dashboard sin recargar la página, requisito explícito de la interfaz.

## 4. Selección tecnológica

| Área | Tecnología | Estado de versión |
|---|---|---|
| Frontend | Angular + TypeScript | Se fijará la versión exacta al ejecutar el scaffolding real en Fase 2 (ver D-010); se usará la última versión LTS estable disponible en ese momento. |
| UI | Angular Material (preferido) o Bootstrap | A confirmar en Fase 2 según necesidades de accesibilidad/tema. |
| Backend gestionado | Supabase (PostgreSQL, Auth, Edge Functions, Realtime) | Proyecto cloud gestionado; requiere cuenta (ver MANUAL_ACTIONS.md #1). |
| Autorización | Row Level Security de PostgreSQL | Nativo de Supabase/Postgres. |
| Gráficas | Chart.js (vía `ng2-charts` o wrapper equivalente) | A fijar en Fase 2. |
| Mapa | Leaflet + tiles de OpenStreetMap | Sin costo de licencia; requiere atribución OSM visible en el mapa. |
| Exportación Excel | ExcelJS | Ejecuta en el navegador, sin backend adicional. |
| Exportación PDF | pdfmake o jsPDF | A decidir en Fase 4 según necesidades de maquetado del reporte. |
| Notificaciones | Brevo (API REST) desde una Edge Function | Requiere cuenta y remitente verificado (ver MANUAL_ACTIONS.md #2). |
| Pruebas de API | Colección Postman/Bruno o archivos `.http` versionados en el repo | Se crearán junto con la Edge Function de ingesta (Fase 3). |
| Pruebas E2E | Playwright, si resulta compatible con la estructura elegida | Se evaluará en Fase 5; si no es compatible, se documentará el motivo en DECISIONS.md. |

## 5. Flujo de ingesta (detalle)

```mermaid
sequenceDiagram
    participant D as ESP32 / Simulador
    participant E as Edge Function ingest-measurement
    participant P as PostgreSQL
    participant N as Edge Function send-alert-notification
    participant C as Angular SPA (Realtime)

    D->>E: POST /functions/v1/ingest-measurement (Bearer <secreto>)
    E->>P: Verificar device_id + hash de credencial
    alt credencial inválida
        E-->>D: 401
    else dispositivo no existe
        E-->>D: 404
    else payload inválido
        E-->>D: 400 / 422
    else secuencia duplicada
        E-->>D: 409
    else válido
        E->>P: INSERT measurement_batches + measurements (transacción)
        E->>P: UPDATE devices.last_seen_at
        E->>P: CALL evaluate_batch(batch_id)
        P-->>P: Evalúa cada parámetro, guarda resultado, abre/actualiza alertas
        P-->>N: (si se creó una alerta) evento
        N->>N: Llama API de Brevo
        P-->>C: Realtime: nueva medición / nueva alerta
        E-->>D: 201 Created
    end
```

## 6. Despliegue (visión preliminar, se detalla en Fase 5)

- Frontend: build estático de Angular servido por un proveedor de hosting a decidir (ver D-009).
- Backend: proyecto Supabase cloud (o local con Supabase CLI durante desarrollo).
- Secretos (clave de Brevo, `service_role key` de Supabase, secretos de dispositivo) viven únicamente como variables de entorno del servidor/Edge Functions, nunca en el bundle de Angular ni en el repositorio.
