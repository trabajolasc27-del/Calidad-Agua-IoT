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
**Estado:** Abierto — se fijará en Fase 2

No se declaran números de versión exactos de Angular, Node.js, Supabase CLI, etc. en esta fase de diseño porque aún no se ha ejecutado ningún `npm init`/`ng new` real. Declarar una versión no verificada violaría la regla de no inventar información. Las versiones exactas se documentarán aquí mismo en el momento en que se ejecute el scaffolding (Fase 2, semana 4), leyendo el resultado real de los comandos.

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
