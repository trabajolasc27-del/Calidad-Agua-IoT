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

**Fase 1 (Semanas 1–3): Análisis y diseño — documentos base creados, pendiente punto de control con el usuario.** Ver el detalle en [docs/PROGRESS.md](docs/PROGRESS.md).

## Tecnologías

Angular + TypeScript · Angular Material/Bootstrap · Supabase (PostgreSQL, Auth, Row Level Security, Edge Functions, Realtime) · Chart.js · Leaflet + OpenStreetMap · ExcelJS · pdfmake/jsPDF · Brevo (correo) · Playwright (si resulta compatible).

Las versiones exactas se fijarán y documentarán al ejecutar el scaffolding real en la Fase 2 (ver [docs/DECISIONS.md](docs/DECISIONS.md) D-010) — no se declaran números de versión no verificados.

## Estructura del repositorio

```
D:\IOT
├── README.md
├── .env.example
├── .gitignore
├── Purametric (1).docx        # antecedente conceptual, no se modifica
├── docs/
│   ├── PROJECT_PLAN.md        # plan de 16 semanas
│   ├── ARCHITECTURE.md        # arquitectura y stack
│   ├── REQUIREMENTS.md        # requerimientos funcionales y no funcionales
│   ├── USE_CASES.md           # casos de uso
│   ├── ROLE_MATRIX.md         # matriz de roles y permisos
│   ├── API_CONTRACT.md        # contrato JSON del ESP32 y endpoints
│   ├── DATABASE_DESIGN.md     # modelo de datos y diccionario de datos
│   ├── WIREFRAMES.md          # wireframes de todas las pantallas
│   ├── MANUAL_ACTIONS.md      # acciones que debe hacer el usuario manualmente
│   ├── DECISIONS.md           # decisiones y contradicciones registradas
│   └── PROGRESS.md            # registro de avance por sesión
├── frontend/                  # (Fase 2) aplicación Angular
└── supabase/                  # (Fase 2) migraciones, funciones y seed
```

Las carpetas `frontend/` y `supabase/` aún no existen; se crean en la Fase 2.

## Roles

Administrador, Analista ambiental, Técnico de campo. Detalle completo en [docs/ROLE_MATRIX.md](docs/ROLE_MATRIX.md).

## Cómo continuar

Ver "Próxima actividad recomendada" en [docs/PROGRESS.md](docs/PROGRESS.md).
