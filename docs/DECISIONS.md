# Registro de Decisiones y Contradicciones

Este documento registra decisiones técnicas y académicas tomadas durante el desarrollo, así como contradicciones o vacíos de información detectados. Ninguna decisión marcada como **Abierta** o **Propuesta** debe tratarse como definitiva hasta su confirmación.

Formato: `ID | Fecha | Descripción | Origen | Estado`

---

## D-001 — Cambio de alcance respecto al antecedente PuraMetric

**Fecha:** 2026-09-01
**Estado:** Confirmado (instrucción explícita del usuario)

El único documento previo encontrado en el repositorio es `Purametric (1).docx`, un reporte académico (Instituto Tecnológico de Villahermosa, materia "Programación Lógica y Funcional") que describe un dispositivo híbrido agua+gases con ESP32, sensores de pH, turbidez, MQ-2 (gas LP), MQ-7 (CO), y en el diagrama esquemático también menciona MQ-135 y MQ-136.

Este proyecto ("Plataforma IoT para la gestión y evaluación automatizada de la calidad del agua en regiones vulnerables") **cambia el alcance oficial**:

- Se conserva: pH, turbidez, arquitectura ESP32 + IoT + dashboard web, filosofía de bajo costo.
- Se elimina: todos los sensores de gas (MQ-2, MQ-7, MQ-9, MQ-135, MQ-136), alertas por gas LP/CO, y cualquier funcionalidad relacionada con calidad del aire.
- Se añade: oxígeno disuelto (mg/L) y temperatura (°C) como parámetros oficiales.

El documento PuraMetric se conserva únicamente como antecedente conceptual (motivación, enfoque de bajo costo, estructura flotante reciclada). No se reutilizará su firmware, su lógica de alertas fija (`if (vPH < 6.5 || vPH > 8.5 || vTurb > 5.0)`) ni sus umbrales, ya que esta plataforma exige umbrales configurables y versionables, no codificados en el firmware.

**Cómo aplicar:** ningún commit debe agregar sensores de gas, pines MQ-*, ni lógica relacionada, salvo autorización expresa y documentada del usuario.

---

## D-002 — Vacío de hardware: sin sensor de oxígeno disuelto ni de temperatura en el antecedente

**Fecha:** 2026-09-01
**Estado:** Abierto — requiere acción manual del usuario

El antecedente PuraMetric no contempla sensor de oxígeno disuelto ni sensor de temperatura en su lista de componentes ni en su diagrama esquemático (pines definidos: `pinPH=32`, `pinTurb=33`, `pinGas=34`, `pinCO=35`). Para cumplir el alcance oficial de esta plataforma se requiere seleccionar y adquirir:

- Un sensor de oxígeno disuelto compatible con ESP32 (salida analógica o digital), con su datasheet.
- Un sensor de temperatura apto para inmersión (comúnmente usado también para compensar lecturas de pH y OD), con su datasheet.

Ver [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) acción #3. Mientras no se resuelva, el desarrollo de software continúa con el simulador HTTP, que genera los 4 parámetros de forma sintética.

---

## D-003 — Mecanismo de autenticación de dispositivos ESP32

**Fecha:** 2026-09-01
**Estado:** Propuesto — decisión técnica reversible, se adopta como línea base

Se define: cada dispositivo tiene un `device_id` público (código, ej. `NODO-001`) y un secreto emitido una sola vez por un administrador al darlo de alta. El secreto se transmite en el header `Authorization: Bearer <secreto>` en cada solicitud HTTPS del ESP32. En base de datos solo se almacena el hash del secreto (`device_credentials.secret_hash`), nunca el valor en claro. La Edge Function de ingesta valida el hash antes de aceptar cualquier lote.

Alternativas descartadas por complejidad para un prototipo académico: certificados mTLS por dispositivo, JWT firmados por el propio ESP32.

**Cómo aplicar:** cualquier endpoint de ingesta debe rechazar (401) solicitudes sin este header o con secreto inválido, antes de tocar la base de datos.

---

## D-004 — Modelo de mediciones en formato "largo" (una fila por parámetro)

**Fecha:** 2026-09-01
**Estado:** Confirmado (decisión de diseño)

En vez de columnas fijas (`ph`, `dissolved_oxygen`, `turbidity`, `temperature`) en la tabla de mediciones, se usa un modelo `measurement_batches` (cabecera del lote recibido) + `measurements` (una fila por parámetro, referenciando el catálogo `parameters`). Esto cumple el requisito explícito de "almacenarse de forma flexible para permitir agregar parámetros" sin migrar el esquema cada vez que se sume un parámetro nuevo.

Ver [DATABASE_DESIGN.md](DATABASE_DESIGN.md).

---

## D-005 — Motor de evaluación centralizado en la base de datos

**Fecha:** 2026-09-01
**Estado:** Confirmado (decisión de diseño)

El motor de reglas (comparación contra umbrales, asignación de `CONFORME/ALERTA/CRITICO`, apertura de alertas) se implementa como función de PostgreSQL invocada transaccionalmente por la Edge Function de ingesta — no como lógica dispersa en Angular ni duplicada en varias funciones. Esto cumple la regla explícita: "No escribas valores de umbral directamente en componentes de Angular ni en funciones dispersas. Centraliza la evaluación."

---

## D-006 — Protocolo de comunicación: solo REST HTTPS

**Fecha:** 2026-09-01
**Estado:** Confirmado (regla explícita del usuario)

No se implementará MQTT en esta primera versión. El ESP32 se comunica exclusivamente mediante solicitudes HTTPS POST con cuerpo JSON hacia una Supabase Edge Function.

---

## D-007 — Visibilidad de alertas para el rol Técnico de campo

**Fecha:** 2026-09-01 · **Confirmado:** 2026-09-01
**Estado:** Confirmado por el usuario

La matriz de roles proporcionada por el usuario no incluye explícitamente "atender alertas" dentro de las funciones del Técnico de campo (solo Administrador y Analista ambiental la tienen). El Técnico de campo tiene **acceso de solo lectura** a las alertas de sus dispositivos asignados (útil para su trabajo de mantenimiento en campo), pero **sin poder** reconocer, atender ni cerrar alertas. Ver [ROLE_MATRIX.md](ROLE_MATRIX.md).

**Cómo aplicar:** esta interpretación queda fija; se implementa así en las políticas RLS de la Fase 2.

---

## D-008 — Analista ambiental y acceso a calibraciones/mantenimiento

**Fecha:** 2026-09-01 · **Confirmado:** 2026-09-01
**Estado:** Confirmado por el usuario

La matriz de roles no asigna explícitamente calibraciones/mantenimiento al Analista ambiental. El Analista tiene acceso de **solo lectura** (apoya el análisis de tendencias e historiales), dejando el registro (creación) exclusivo al Técnico de campo y al Administrador.

---

## D-009 — Hosting y dominio de despliegue final

**Fecha:** 2026-09-01
**Estado:** Abierto

No se ha decidido el proveedor de hosting para el frontend Angular (Netlify, Vercel, Supabase Hosting u otro) ni si existirá un dominio propio. Se abordará con instrucciones específicas en la Fase 5, según lo indicado por el usuario.

---

## D-010 — Versiones exactas de dependencias

**Fecha:** 2026-09-01
**Estado:** Resuelto — 2026-09-01, con los valores reales leídos del entorno y de `frontend/package.json` tras ejecutar el scaffolding.

No se declaran números de versión exactos de Angular, Node.js, Supabase CLI, etc. en esta fase de diseño porque aún no se ha ejecutado ningún `npm init`/`ng new` real. Declarar una versión no verificada violaría la regla de no inventar información. Las versiones exactas se documentarán aquí mismo en el momento en que se ejecute el scaffolding (Fase 2, semana 4), leyendo el resultado real de los comandos.

**Versiones fijadas (Fase 2, semana 4):**

| Herramienta / paquete | Versión |
|---|---|
| Node.js | 24.14.0 |
| npm | 11.9.0 |
| Angular CLI / `@angular/*` | 21.2.8 (core), 21.2.14 (`@angular/cdk`, `@angular/material`) |
| `@supabase/supabase-js` | ^2.115.0 |
| TypeScript | ~5.9.2 |
| Test runner | Vitest ^4.0.8 |
| Supabase CLI (via `npx supabase`) | 2.116.0 |
| Docker | 29.5.2 |

Fuente: `frontend/package.json` y salida real de `ng version` / `docker --version` / `npx supabase --version`, no valores supuestos.

---

## D-011 — Repositorio Git local sin remoto

**Fecha:** 2026-09-01 · **Superada por D-012 el 2026-09-01**
**Estado:** Confirmado (histórico)

Se inicializó un repositorio Git local en `D:\IOT` para versionar código y documentación desde la Fase 1. No se ha configurado ningún remoto. Ver D-012 para el esquema definitivo de remoto + despliegue.

---

## D-012 — Repositorio remoto en GitHub, conectado a un proyecto Supabase nuevo e independiente de Quesisimo

**Fecha:** 2026-09-01
**Estado:** Confirmado por el usuario — pendiente de ejecución manual

El usuario ya tiene cuenta de Supabase (usada previamente para el proyecto "Quesisimo") y solicitó reutilizar el mismo flujo de integración GitHub↔Supabase para el despliegue de migraciones, pero de forma completamente aislada: un **proyecto Supabase nuevo** (base de datos, Auth y claves propias, sin relación con el de Quesisimo) conectado a un **repositorio de GitHub nuevo** dedicado exclusivamente a `D:\IOT`.

Esto evita cualquier riesgo de que una migración o configuración de este proyecto afecte la base de datos de Quesisimo: al ser proyectos Supabase distintos vinculados a repositorios distintos, no existe ningún punto de conexión entre ambos.

Pasos detallados en [MANUAL_ACTIONS.md](MANUAL_ACTIONS.md) acción #1 (fusiona lo que antes eran las acciones #1 y #5).

**Cómo aplicar:** una vez el usuario comparta la URL del repositorio de GitHub, se agrega como remoto local y se le pide confirmación puntual antes de cualquier `git push`, siguiendo el protocolo de seguridad de Git. La estructura `supabase/migrations/` se crea en la Fase 2 pensando ya en este flujo de despliegue automático vía GitHub.

**Actualización 2026-09-01:** ejecutado. Remoto `origin` = `https://github.com/trabajolasc27-del/Calidad-Agua-IoT.git`, rama local renombrada de `master` a `main` y publicada (`git push -u origin main`). Proyecto Supabase nuevo: `https://zeoedihibvbkclqsqhrf.supabase.co` (ref `zeoedihibvbkclqsqhrf`), con la integración GitHub→Supabase conectada al repositorio y rama correctos. La `anon key` se guardó en `D:\IOT\.env` (ignorado por Git).

---

## D-013 — Librería de UI: Angular Material

**Fecha:** 2026-09-01
**Estado:** Confirmado (decisión técnica)

Se elige **Angular Material** sobre Bootstrap para el frontend: se integra nativamente con el ecosistema Angular (formularios reactivos, CDK de accesibilidad, theming), lo que ayuda a cumplir RNF-02 (comunicar gravedad con texto+ícono, no solo color) y RNF-01 (responsividad) sin depender de una librería de CSS externa. Se documentará la versión exacta instalada junto con el resto de dependencias (ver D-010).

---

## D-014 — pgcrypto vive en el esquema `extensions`, no en `public`

**Fecha:** 2026-09-08
**Estado:** Confirmado (hallazgo técnico, verificado en el proyecto real)

Al probar `verify_device_secret` end-to-end apareció `function crypt(text, text) does not exist` dentro de una función con `set search_path = public`. La causa: en este proyecto Supabase, pgcrypto (y probablemente otras extensiones) se instala en el esquema `extensions`, no en `public`. Cualquier función `SECURITY DEFINER` que restrinja su `search_path` a `public` por seguridad (patrón usado en todo este proyecto) y necesite `crypt()`/`gen_salt()`/`gen_random_uuid()` explícitamente debe declarar `set search_path = public, extensions`.

**Cómo aplicar:** al escribir una nueva función seguridad-definer que use una función de una extensión, verificar primero en qué esquema quedó instalada esa extensión (`select extname, extnamespace::regnamespace from pg_extension;`) en vez de asumir `public`.

---

## D-015 — Creación de usuarios vía Edge Function + pantalla de establecer contraseña

**Fecha:** 2026-09-08
**Estado:** Confirmado (verificado end-to-end con un usuario real)

RF-06/RF-07 requieren que un Administrador cree usuarios desde la app. Crear una cuenta de Supabase Auth necesita la `service_role key`, que nunca vive en el frontend (RNF-04), así que se implementó la Edge Function `admin-create-user`: verifica que quien llama sea admin (usando su propia sesión) y usa `auth.admin.inviteUserByEmail` con la `service_role key` del lado del servidor.

Al probarlo con un usuario real aparecieron dos problemas que no eran evidentes de antemano:

1. **`site_url` del proyecto apuntaba a `http://localhost:3000`** (el valor por defecto de Supabase para cualquier proyecto nuevo), no a `http://localhost:4200` donde corre esta app. El enlace del correo de invitación llevaba a una página inexistente. Se corrigió actualizando `site_url` y `uri_allow_list` **directamente vía la Management API** (no con `supabase config push`, que hubiera sobrescrito ajustes remotos no relacionados como Twilio SMS — el propio CLI advierte de este riesgo).
2. **Faltaba una pantalla que recibiera el enlace y dejara fijar la contraseña.** Ni la invitación ni la recuperación de contraseña (RF-03) sirven de nada si no hay una página que tome el token de la URL y llame `supabase.auth.updateUser({ password })`. Se agregó `SetPassword` en `/restablecer-contrasena`, compartida por ambos flujos.

**Cómo aplicar:** cualquier flujo de Supabase Auth que dependa de un correo con enlace (invitación, recuperación, magic link) necesita: (a) `site_url`/`uri_allow_list` apuntando al origen real de la app, y (b) una ruta en el frontend que reciba ese enlace y complete la acción — no basta con disparar el correo.

---

## D-016 — ESP32 físico de prueba con hardware provisional (sin sensores de agua reales)

**Fecha:** 2026-09-08
**Estado:** Confirmado por el usuario

El usuario ya tiene un ESP32 armado en protoboard con un sensor ultrasónico HC-SR04, un fotorresistor (LDR) y un LED — ninguno de estos es un sensor de calidad del agua del alcance oficial (ver D-002). Se preguntó explícitamente la intención y el usuario confirmó: usarlo **solo para validar la conectividad** ESP32 → Edge Function → base de datos → Historial, con valores de prueba claramente marcados como no reales, antes de tener los sensores calibrados definitivos.

Se creó el dispositivo `NODO-ESP32-01` en la base de datos real (`is_demo = false`, porque es hardware físico real, aunque los *valores* que envía sean de prueba) con su propia credencial, distinto de `NODO-DEMO-001` (que sigue siendo 100% sintético vía el simulador Node). Firmware en `firmware/esp32-test/`.

**Cómo aplicar:** cuando lleguen los sensores reales de pH/oxígeno disuelto/turbidez/temperatura, se reemplaza únicamente el bloque de lectura de sensores del firmware — el resto (WiFi, hora por NTP, autenticación, envío) no cambia. No usar `NODO-ESP32-01` como si sus lecturas fueran datos reales de calidad del agua en ningún reporte o demostración.

---

## D-017 — Ubicación fija (asignada por admin) vs. GPS en vivo por dispositivo

**Fecha:** 2026-09-09
**Estado:** Abierto — se sigue con el modelo fijo hasta que el usuario decida

El usuario planteó que la ubicación de un dispositivo debería verse "por GPS". El diseño actual (`locations` con latitud/longitud fija + `devices.location_id`, mapa en RF-09/RF-10) ya cubre "ver dónde está cada nodo", pero asume una ubicación **fija**, asignada una vez por un Administrador (coherente con un nodo instalado en un pozo/cisterna/laguna que no se mueve).

Si en cambio se quiere que el propio ESP32 reporte su coordenada GPS en cada lectura (dispositivo móvil o cuya posición no se conoce de antemano), eso requiere: (a) un módulo GPS adicional en el hardware (no considerado en el BOM ni en D-002), y (b) guardar latitud/longitud por medición en vez de solo por dispositivo — un cambio de modelo de datos no trivial.

**Cómo aplicar:** la pantalla de Ubicaciones se construye con el modelo fijo mientras no haya una decisión explícita en contra. Si el usuario confirma que quiere GPS en vivo, esto se retoma como un cambio de alcance de hardware y de base de datos, no como un ajuste menor de UI.

## D-018 — Downgrade de `pdfmake` a la serie 0.2.x para exportación de reportes

**Fecha:** 2026-09-09
**Estado:** Confirmado (decisión técnica, sin impacto en alcance funcional)

`npm install pdfmake` instaló por defecto la versión 0.3.11, que reescribió la librería para uso principalmente en Node (depende de `pdfkit` completo, requiere registrar fuentes como archivos en vez de la `vfs` clásica en base64, y no trae tipos de TypeScript). Adoptar esa API en un build de navegador con esbuild/Angular habría significado resolver polyfills de Node (fs, zlib) y una superficie de API no documentada para uso en cliente — alto riesgo de una sesión de depuración larga para una funcionalidad secundaria (exportar PDF).

Se bajó la versión a `pdfmake@0.2.23` (última de la serie 0.2.x), que expone la API clásica y ampliamente documentada para navegador (`pdfMake.vfs = ...; pdfMake.createPdf(docDefinition).download()`), con tipos vía `@types/pdfmake@0.2.13`. Se agregó `"pdfmake"` (y `"exceljs"`, que emite una advertencia similar de CommonJS) a `allowedCommonJsDependencies` en `angular.json`.

**Cómo aplicar:** si en el futuro se necesita una función de `pdfmake` que solo existe en 0.3.x, evaluar si conviene mover la generación de PDF a un endpoint/Edge Function en vez de en el navegador, en lugar de forzar la 0.3.x en el cliente.

## D-019 — Vulnerabilidad transitiva moderada en `uuid` (vía `exceljs`) — no se aplica el fix sugerido

**Fecha:** 2026-09-09
**Estado:** Confirmado (decisión técnica, documentada en vez de "resuelta")

`npm audit` reporta 2 vulnerabilidades moderadas en `uuid`, dependencia transitiva de `exceljs@4.4.0`. El fix sugerido por `npm audit fix --force` baja `exceljs` a `3.4.0`, un cambio mayor (breaking) de una librería que en este proyecto solo se usa para generar un archivo `.xlsx` de reporte a partir de datos ya validados y calculados en el cliente (no se procesa ningún archivo `.xlsx` de entrada no confiable). La vulnerabilidad reportada en `uuid` no aplica a este patrón de uso.

**Cómo aplicar:** no forzar el downgrade. Si en el futuro `exceljs` se usa para leer archivos `.xlsx` subidos por un usuario (superficie de ataque distinta), revisar esta decisión.

## D-020 — Alertas no mostraban el valor detectado (hallazgo por comparación contra los documentos oficiales de residencia)

**Fecha:** 2026-09-14
**Estado:** Confirmado y corregido

El usuario compartió 3 documentos oficiales del proyecto de residencia (`Proyecto Residencia Software 2026-2.docx`, el protocolo institucional CI-02/2026 en PDF, y el "Reporte preliminar de residencia profesional" `ITVH-RP-012848-Proyecto.pdf` — este último es el documento específico de 16 semanas/4 etapas que efectivamente rige la evaluación de este proyecto, no el protocolo institucional más amplio de 11 meses) porque su docente señaló que las pantallas no muestran todo lo que deben mostrar.

Comparando contra `ITVH-RP-012848-Proyecto.pdf` §3.2 ("...registrando el dispositivo, parámetro, **valor detectado**, fecha, nivel de gravedad y seguimiento...") y contra el propio [REQUIREMENTS.md](REQUIREMENTS.md) RF-32 ("...con parámetro, **valor**, dispositivo, gravedad, fecha y responsable"), se confirmó que ni el listado de Alertas, ni su diálogo de detalle, ni el panel de "alertas activas" del Dashboard mostraban nunca el valor de la medición que originó la alerta — solo parámetro, severidad, estado y fecha. El dato sí existía en la base de datos (`alerts.first_measurement_id → measurements.value`), simplemente nunca se consultaba ni se pintaba.

**Cómo se corrigió:** se agregó el embed `measurements!first_measurement_id(value)` a las consultas de `alerts.service.ts` (listado) y `dashboard.service.ts` (`getActiveAlerts`), se extendieron los modelos `Alert`/`DashboardAlert` con el valor, y se muestra en `alerts.html`, `alert-detail-dialog.html` y `dashboard.html`. Primero se validó que la sintaxis del embed fuera válida contra el esquema real (petición REST anónima devolvió `200 []` en vez de un error de relación) y que `ng build`/`tsc` quedaran limpios. Más tarde, ya con el usuario con sesión iniciada, se verificó en vivo de punta a punta: se disparó una alerta real de turbidez con el simulador (dos lecturas consecutivas, porque el umbral exige `consecutive_breaches_to_alert = 2`), el valor se vio correctamente en el Dashboard (vía Realtime), en el listado de Alertas y en el detalle, y se recorrió el ciclo completo Reconocer → Atender → Cerrar desde la interfaz para dejar la alerta de prueba limpia.

**Cómo aplicar:** el resto del análisis de los 3 documentos contra el estado actual del proyecto (parámetros, roles, wireframes, motor de evaluación, historial, reportes) no encontró otras discrepancias de alcance — todos confirman las 4 mediciones oficiales (pH, oxígeno disuelto, turbidez, temperatura), los 3 roles y el plan de 16 semanas/4 etapas ya seguido. Las brechas reales pendientes (pruebas automatizadas, manuales de usuario/técnico, pantalla de Perfil, calibraciones/mantenimiento) ya estaban registradas en [PROJECT_PLAN.md](PROJECT_PLAN.md)/[PROGRESS.md](PROGRESS.md) antes de este hallazgo.

## D-021 — Atributos y campos de la base de datos traducidos al español (requisito de trámites institucionales)

**Fecha:** 2026-09-14
**Estado:** Confirmado y aplicado

Los docentes del usuario indicaron que los atributos y campos de la base de datos deben quedar en español porque se harán trámites administrativos con el proyecto — explícitamente no el código de la aplicación (nombres de métodos, clases, archivos, rutas), solo los identificadores que viven en la base de datos.

Alcance confirmado por el usuario entre dos preguntas de alcance:
1. **Profundidad máxima**: nombres de tabla, columnas de negocio, valores de tipos enumerados, **y** el contrato JSON que envía el ESP32 (lo que obligó a actualizar también `firmware/esp32-test/esp32-test.ino`).
2. **Campos técnicos universales sin tocar**: `id`, `created_at`, `updated_at`, `is_active`, `is_demo` se quedan en inglés — convención estándar de cualquier motor de base de datos, no vocabulario del negocio. Todo lo demás (nombres de tabla, columnas de negocio, timestamps de negocio como `opened_at`→`abierta_en`, valores de enum) se tradujo.

**Qué se hizo:**
- Migración `20260901120000... / 20260914120000_spanish_rename.sql`: renombra los 7 tipos enumerados (y sus valores), las 14 tablas y sus columnas de negocio, y reescribe (drop + create, porque el cuerpo de una función plpgsql es texto plano y Postgres no lo reescribe solo al renombrar una tabla/columna) las 4 funciones auxiliares de RLS y las 9 funciones de negocio con sus nuevos nombres, parámetros `_x` y cuerpo. Las ~34 políticas RLS se recrearon (se tuvieron que eliminar primero: dependen de `is_admin()`/`is_analyst()`/`is_device_assigned()` por OID, así que no se podían eliminar esas funciones mientras las políticas viejas siguieran apuntándolas). Los valores del catálogo `parametros.codigo` también cambiaron (`dissolved_oxygen`→`oxigeno_disuelto`, `turbidity`→`turbidez`, `temperature`→`temperatura`; `ph` se queda igual). Se aplicó contra el proyecto real vía la Management API (el CLI de Supabase sigue bloqueado) y se verificó con consultas de solo lectura que el esquema cambió y los datos reales (dispositivos, umbrales, alertas ya cerradas) sobrevivieron intactos.
- Las 3 funciones de infraestructura ligadas al esquema propio de Supabase Auth (`set_updated_at`, `handle_new_user`, `handle_user_email_update`) **conservan su nombre** — no son vocabulario del negocio — pero `handle_new_user`/`handle_user_email_update` sí necesitaron el cuerpo actualizado, porque escriben en `perfiles.nombre_completo`/`rol`/`correo`: de no corregirlas, cada alta de usuario nuevo se habría roto silenciosamente.
- Edge Functions `ingest-measurement` y `admin-create-user` reescritas con los nuevos nombres de tabla/columna/función y el nuevo contrato JSON, y **redesplegadas manualmente vía la Management API** (`POST /v1/projects/{ref}/functions/deploy?slug=<slug>`, multipart con el archivo `index.ts` y un campo `metadata` JSON `{entrypoint_path, name, verify_jwt}`) — se confirmó en vivo que un simple `git push` a `main` **no** redespliega las Edge Functions automáticamente en este proyecto (a diferencia de las migraciones, que tampoco se auto-aplican y siempre se hicieron vía Management API por el mismo motivo: el CLI de Supabase está bloqueado). Verificado end-to-end reenviando una lectura real con el simulador contra la función ya redesplegada: `201` con el contrato nuevo (`id_lote`, `resultados.{ph,oxigeno_disuelto,turbidez,temperatura}`).
- Firmware `esp32-test.ino` y `tools/simulator/simulate.mjs` actualizados al nuevo contrato JSON (`codigo_dispositivo`, `secuencia`, `medido_en`, `valores.{ph,oxigeno_disuelto,turbidez,temperatura}`).
- Frontend: los 7 modelos (`*.model.ts`), los 12 servicios (`*.service.ts`) y las plantillas `.html` que leían esos campos, actualizados. `tsc --noEmit` primero y luego `ng build` (que sí revisa los bindings de plantilla) sirvieron de red de seguridad real: cada propiedad vieja que quedara sin actualizar aparecía como error de compilación.
- `supabase/seed.sql` y la documentación (`DATABASE_DESIGN.md`, `API_CONTRACT.md`, `ARCHITECTURE.md`, `ROLE_MATRIX.md`, `USE_CASES.md`, `tools/api-tests/ingest-measurement.http`) actualizados a los nuevos nombres.

**Decisiones de límite tomadas durante la ejecución (no preguntadas explícitamente, resueltas por consistencia):**
- Los códigos de error HTTP (`INVALID_FORMAT`, `UNAUTHORIZED`, etc.) se quedaron en inglés: son constantes de diseño de API, no atributos de base de datos.
- El cuerpo que recibe la Edge Function `admin-create-user` (`email`/`full_name`/`role`/`redirect_to`) se quedó con esos nombres de clave — es un contrato interno invocado solo por nuestro propio frontend, no el contrato JSON del ESP32 que sí se aprobó traducir — pero el *valor* de `role` ya viaja en español porque `UserRole` ahora es `'administrador' | 'analista' | 'tecnico_campo'`.
- Los formularios reactivos de Angular (`FormGroup`) que no se pasan tal cual a una llamada de Supabase se dejaron con claves en inglés (código de aplicación), mapeando al español solo en el punto donde se llama al servicio.

**Qué falta (no bloqueante):** la sesión del navegador expiró de nuevo durante la ejecución y no corresponde iniciar sesión por el usuario, así que el recorrido visual completo (Dashboard, Mapa, Historial, Alertas, Reportes, Administración) quedó pendiente de que el usuario confirme con sesión propia. Todo lo demás sí quedó verificado en vivo: el esquema real (consultas de solo lectura), los datos reales sobreviviendo el rename, las consultas exactas que usa el frontend (`perfiles`, `dispositivos` con embed a `ubicaciones`) validadas contra el esquema real vía REST anónimo, y la tubería completa de ingesta (simulador → Edge Function redesplegada → RPC → tablas nuevas) con una lectura real respondiendo `201`.

**Cómo aplicar:** cualquier trabajo futuro sobre la base de datos debe usar los nombres en español de aquí en adelante. Si se agrega una tabla o columna nueva, seguir el mismo criterio: vocabulario de negocio en español, campos técnicos universales en inglés.
