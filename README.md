# Plataforma IoT para la gestión y evaluación automatizada de la calidad del agua en regiones vulnerables

Proyecto de Residencia Profesional. Plataforma web que recibe mediciones de nodos ESP32 (pH, oxígeno disuelto, turbidez y temperatura), las evalúa contra umbrales configurables, las muestra en tiempo real, genera alertas y reportes.

> **La evaluación es informativa.** Esta plataforma no certifica la potabilidad del agua ni sustituye análisis de un laboratorio acreditado, y no afirma cumplimiento de la NOM-001 ni de ninguna otra norma oficial.

## Alcance oficial

Únicamente estos 4 parámetros:

| Parámetro | Unidad |
|---|---|
| pH | — |
| Oxígeno disuelto | mg/L |
| Turbidez | NTU |
| Temperatura | °C |

Este proyecto tiene como antecedente conceptual el documento `Purametric (1).docx` (agua + gases, MQ-2/MQ-7/MQ-9/MQ-135/MQ-136). **No** se implementan sensores de gas ni funcionalidades de calidad del aire en esta plataforma — ver [docs/DECISIONS.md](docs/DECISIONS.md) D-001.

## Estado actual

Plataforma funcional de punta a punta: base de datos, autenticación y roles, ingesta desde ESP32/simulador, motor de evaluación, tiempo real, alertas, historial, reportes (PDF/Excel), y un rediseño visual y funcional completo de la interfaz (identidad propia, navegación por barra lateral, componentes reutilizables). Ver el detalle sesión por sesión en [docs/PROGRESS.md](docs/PROGRESS.md) y las decisiones tomadas en [docs/DECISIONS.md](docs/DECISIONS.md).

Pendiente: selección y adquisición de los sensores físicos de oxígeno disuelto y temperatura ([docs/MANUAL_ACTIONS.md](docs/MANUAL_ACTIONS.md) #3), integración de envío de correo (Brevo), y pruebas automatizadas más allá de las que ya existen.

## Tecnologías

- **Frontend:** Angular 21 (standalone components, signals) + Angular Material 21, Chart.js, Leaflet/OpenStreetMap, pdfmake, ExcelJS.
- **Backend:** Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions, Realtime).
- **Firmware:** ESP32 (HTTPS + JSON) — ver `firmware/esp32-test/`.
- **Herramientas de prueba:** simulador Node.js (`tools/simulator/`), peticiones `.http` de ejemplo (`tools/api-tests/`).

Versiones exactas en [docs/DECISIONS.md](docs/DECISIONS.md) D-010.

## Estructura del repositorio

```
D:\IOT
├── README.md
├── docs/                       # documentación del proyecto (ver índice abajo)
├── frontend/                   # aplicación Angular
│   └── src/app/
│       ├── core/                # sesión, guards, shell de navegación, modelos compartidos
│       ├── shared/               # componentes reutilizables (gauge, page-header, status-badge, …)
│       └── features/             # una carpeta por módulo/pantalla
├── supabase/
│   ├── migrations/              # esquema, RLS, funciones (en español, ver D-021)
│   └── functions/                # Edge Functions (ingesta, alta de usuarios)
├── firmware/esp32-test/          # firmware de prueba (hardware provisional, ver D-016)
└── tools/                        # simulador de mediciones y peticiones de prueba
```

## Documentación

| Documento | Contenido |
|---|---|
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | Plan de 16 semanas / 4 etapas |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitectura general y stack |
| [docs/ARQUITECTURA_FRONTEND.md](docs/ARQUITECTURA_FRONTEND.md) | Estructura del frontend Angular, flujo de datos, estados |
| [docs/GUIA_INTERFAZ.md](docs/GUIA_INTERFAZ.md) | Sistema de diseño: paleta, componentes reutilizables, patrones visuales |
| [docs/MODULOS.md](docs/MODULOS.md) | Qué hace cada pantalla/módulo y de qué depende |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | Requerimientos funcionales y no funcionales |
| [docs/USE_CASES.md](docs/USE_CASES.md) | Casos de uso |
| [docs/ROLE_MATRIX.md](docs/ROLE_MATRIX.md) | Matriz de roles y permisos |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | Contrato JSON del ESP32 y endpoints |
| [docs/DATABASE_DESIGN.md](docs/DATABASE_DESIGN.md) | Modelo de datos y diccionario de datos |
| [docs/WIREFRAMES.md](docs/WIREFRAMES.md) | Wireframes de baja fidelidad |
| [docs/PRUEBAS.md](docs/PRUEBAS.md) | Cómo ejecutar y probar el proyecto |
| [docs/MANUAL_ACTIONS.md](docs/MANUAL_ACTIONS.md) | Acciones pendientes que debe hacer el usuario manualmente |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decisiones técnicas y su razonamiento |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Registro de avance por sesión |

## Roles

Administrador, Analista ambiental, Técnico de campo. Detalle completo en [docs/ROLE_MATRIX.md](docs/ROLE_MATRIX.md).

## Cómo ejecutar el proyecto

Ver [docs/PRUEBAS.md](docs/PRUEBAS.md) para instrucciones completas (instalación, variables de entorno, comandos de compilación y prueba).

```bash
cd frontend
npm install
npm start        # http://localhost:4200
```

## Cómo continuar

Ver "Cómo continuar en otra sesión" al final de la entrada más reciente en [docs/PROGRESS.md](docs/PROGRESS.md).
