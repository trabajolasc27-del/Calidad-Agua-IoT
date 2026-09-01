# Registro de Progreso

## Sesión 1 — 2026-09-01

### Fase actual
**Fase 1 (Semanas 1–3): Análisis y diseño — en progreso.** Documentación base creada; pendiente el punto de control con el usuario antes de iniciar la Fase 2.

### Actividades terminadas (implementadas y verificadas)
- Inspección del repositorio `D:\IOT`: se encontró un único archivo previo, `Purametric (1).docx` (antecedente conceptual, ITVH, agua + gases). Extraído y analizado su contenido íntegro.
- Repositorio Git local inicializado en `D:\IOT` (sin remoto).
- Estructura documental creada en `docs/` con los 10 documentos requeridos + 2 documentos de apoyo (casos de uso, wireframes).
- Requerimientos funcionales y no funcionales consolidados, alineados al alcance oficial (pH, oxígeno disuelto, turbidez, temperatura).
- 10 casos de uso principales redactados.
- Matriz de roles (Administrador / Analista ambiental / Técnico de campo) definida, con 2 puntos marcados como propuesta pendiente de confirmación (D-007, D-008).
- Arquitectura definida (diagrama de componentes y de secuencia de ingesta), con selección tecnológica y justificación.
- Modelo de datos completo (14 tablas + 7 enums), diccionario de datos, índices, resumen de políticas RLS por tabla y rol.
- Contrato JSON de ingesta IoT definido, con los 7 códigos de respuesta HTTP exigidos y sus condiciones exactas.
- Wireframes funcionales (no visuales) de las 9 pantallas obligatorias.
- Registro de decisiones y contradicciones (11 entradas, D-001 a D-011), incluyendo el vacío de hardware para oxígeno disuelto/temperatura detectado en el antecedente.
- Acciones manuales documentadas (Supabase, Brevo, hardware ESP32, hosting, repositorio remoto opcional).
- `.env.example` y `.gitignore` creados, sin secretos reales.

### Actividades pendientes (dentro de Fase 1)
- Confirmación del usuario sobre las decisiones propuestas D-007 y D-008 (alcance de lectura de alertas y de calibraciones/mantenimiento para roles Técnico de campo/Analista).
- Autorización explícita del usuario para avanzar a la Fase 2.

### Pruebas ejecutadas
Ninguna. No existe código de aplicación todavía (solo documentación); no aplica compilación ni pruebas en esta fase.

### Errores conocidos
Ninguno.

### Decisiones tomadas
Ver [DECISIONS.md](DECISIONS.md) completo. Resumen: cambio de alcance confirmado respecto a PuraMetric (D-001), modelo de mediciones en formato largo (D-004), motor de evaluación centralizado en PostgreSQL (D-005), solo REST HTTPS (D-006), autenticación de dispositivo por secreto hasheado (D-003). Dos decisiones abiertas de rol (D-007, D-008) y dos abiertas de infraestructura (hosting D-009, versiones exactas D-010).

### Acciones manuales pendientes
1. Crear proyecto Supabase y compartir URL + anon key (ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #1) — necesario para iniciar Fase 2.
2. Crear cuenta Brevo y verificar remitente (necesario recién en Fase 4, se puede preparar antes).
3. Adquirir sensor de oxígeno disuelto y sensor de temperatura compatibles con ESP32, y compartir modelo/datasheet (necesario para Fase 5; no bloquea Fases 2–4, que usan el simulador).
4. Decidir hosting/dominio (necesario recién en Fase 5).
5. (Opcional) Crear repositorio remoto en GitHub/GitLab.

### Próxima actividad recomendada
Esperar la revisión y autorización del usuario sobre los documentos de la Fase 1 (en particular D-007 y D-008), y sobre si se desea comenzar ya la acción manual #1 (Supabase) para no bloquear el arranque de la Fase 2. Una vez autorizado, iniciar Fase 2, semana 4: scaffolding del proyecto Angular y preparación de Supabase (local y/o remoto).

### Cómo continuar en otra sesión
Indicar: **"Continúa con la Fase 2 del proyecto IOT"** (y, si ya se realizó, incluir la Project URL y anon key de Supabase). Si hay correcciones a D-007/D-008 o a cualquier otro documento de la Fase 1, indicarlas primero para actualizar la documentación antes de generar código.
