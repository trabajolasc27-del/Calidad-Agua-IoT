# Plan de Trabajo — 16 Semanas

Estado global: **Fase 1 en progreso.** El detalle día a día del avance real vive en [PROGRESS.md](PROGRESS.md); este documento es el plan, no el registro de ejecución.

## Fase 1 — Semanas 1 a 3: Análisis y diseño
- [x] Inspeccionar el repositorio (`D:\IOT`, único archivo previo: `Purametric (1).docx`, antecedente conceptual).
- [x] Consolidar requerimientos ([REQUIREMENTS.md](REQUIREMENTS.md)).
- [x] Crear casos de uso ([USE_CASES.md](USE_CASES.md)).
- [x] Crear matriz de roles ([ROLE_MATRIX.md](ROLE_MATRIX.md)).
- [x] Diseñar arquitectura ([ARCHITECTURE.md](ARCHITECTURE.md)).
- [x] Diseñar modelo de base de datos y diccionario de datos ([DATABASE_DESIGN.md](DATABASE_DESIGN.md)).
- [x] Definir contrato JSON y endpoints ([API_CONTRACT.md](API_CONTRACT.md)).
- [x] Diseñar wireframes de todas las pantallas ([WIREFRAMES.md](WIREFRAMES.md)).
- [x] Registrar contradicciones e información pendiente ([DECISIONS.md](DECISIONS.md)).
- [ ] **Punto de control:** presentar documentos y acciones manuales al usuario, esperar autorización para Fase 2.

## Fase 2 — Semanas 4 a 6: Fundamentos
- [x] Crear/configurar el proyecto Angular.
- [x] Configurar variables de entorno (`.env`, no versionado).
- [x] Preparar Supabase (proyecto remoto real, conectado vía GitHub — ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #1).
- [x] Escribir migraciones versionadas según [DATABASE_DESIGN.md](DATABASE_DESIGN.md) — 17 migraciones aplicadas al proyecto real.
- [x] Crear datos de demostración (`seed.sql`, `is_demo = true`).
- [x] Implementar autenticación (login, logout, recuperación de contraseña) — verificado en vivo con una cuenta real.
- [x] Implementar roles y políticas RLS — verificado: RLS rechaza escrituras no autorizadas de `anon`, funciones admin verifican rol internamente.
- [x] Implementar administración de usuarios, dispositivos, ubicaciones, parámetros y umbrales — las 5 pantallas, verificadas en vivo contra el proyecto real.
- [ ] Agregar pruebas automatizadas (unitarias del motor de evaluación, de servicios). **Pendiente real** — lo hecho hasta ahora es verificación manual/en vivo, no una suite automatizada.
- [ ] **Punto de control:** compilación ✅, revisión de seguridad básica ✅ (parcial, hecha pieza por pieza en cada pantalla). Falta la suite de pruebas automatizada antes de dar la Fase 2 por cerrada del todo.

## Fase 3 — Semanas 7 a 9: Recepción y visualización
- [ ] Crear la Edge Function `ingest-measurement`.
- [ ] Implementar autenticación de dispositivo y control de duplicados.
- [ ] Crear simulador IoT (perfiles normal/alerta/crítico).
- [ ] Guardar lotes y mediciones de forma transaccional.
- [ ] Implementar dashboard, gráficas y mapa.
- [ ] Implementar actualización en tiempo real (Supabase Realtime).
- [ ] Agregar reconexión y manejo de errores de red.
- [ ] **Punto de control:** demostrar el recorrido simulador → API → base de datos → dashboard. Si se requiere el ESP32 físico, detenerse y solicitar acceso/datos (ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #3).

## Fase 4 — Semanas 10 a 12: Evaluación, alertas y reportes
- [ ] Implementar el motor de reglas (función SQL) y sus pruebas unitarias.
- [ ] Configurar estados y transiciones de alerta (`acknowledge`/`attend`/`close`).
- [ ] Crear gestión de alertas en la interfaz.
- [ ] Crear historiales con filtros.
- [ ] Implementar estadísticas de reportes (min/max/promedio, conteos).
- [ ] Exportar PDF y Excel.
- [ ] Integrar notificaciones por correo (Brevo) — requiere acción manual antes de configurar, ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) #2.
- [ ] **Punto de control:** antes de configurar Brevo, entregar instrucciones para crear cuenta, verificar remitente y guardar la API key como secreto (nunca en el chat).

## Fase 5 — Semanas 13 a 16: Integración, pruebas y cierre
- [ ] Integrar el ESP32 real y verificar el contrato JSON contra hardware.
- [ ] Corregir problemas de conexión encontrados con hardware real.
- [ ] Probar datos duplicados, faltantes y fuera de rango contra el sistema real.
- [ ] Ejecutar pruebas unitarias, de integración, de autorización y responsivas.
- [ ] Simular múltiples nodos concurrentes.
- [ ] Pruebas de usabilidad y corrección de errores encontrados.
- [ ] Preparar despliegue (hosting, dominio, variables de entorno, secretos — acción manual, ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md)).
- [ ] Crear manual de usuario y manual del desarrollador.
- [ ] Documentar instalación y recuperación ante fallos.
- [ ] Preparar evidencias y resultados finales.
- [ ] **Punto de control:** antes de publicar, explicar acciones manuales necesarias para autorizar hosting, dominio, variables de entorno y secretos.

## Regla de avance

Ninguna fase se marca completa sin verificación real (compilación, prueba, o demostración funcional). Ninguna casilla `[x]` se marca si la actividad correspondiente no está implementada y comprobada.
