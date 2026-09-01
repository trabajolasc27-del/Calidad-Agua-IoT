# Matriz de Roles y Permisos

Tres roles: **Administrador (A)**, **Analista ambiental (N)**, **Técnico de campo (T)**.

Cada permiso debe implementarse **dos veces**: en la interfaz (ocultar/deshabilitar acciones no permitidas) y en Row Level Security de PostgreSQL (rechazar la operación aunque se invoque directamente). Ocultar un botón nunca es suficiente por sí solo.

Leyenda: ✅ permitido · ✅* solo sobre dispositivos asignados · 👁 solo lectura · ❌ no permitido · — propuesta pendiente de confirmación (ver [DECISIONS.md](DECISIONS.md))

| Función | Administrador | Analista ambiental | Técnico de campo |
|---|---|---|---|
| Administrar usuarios (alta/edición/rol) | ✅ | ❌ | ❌ |
| Administrar dispositivos (alta/edición/activación) | ✅ | ❌ | ❌ |
| Consultar dispositivos y su detalle | ✅ | ✅ | ✅* |
| Consultar última comunicación (`last_seen`) | ✅ | ✅ | ✅* |
| Administrar ubicaciones | ✅ | ❌ | ❌ |
| Consultar ubicaciones y mapa | ✅ | ✅ | 👁 |
| Configurar parámetros y umbrales | ✅ | ❌ | ❌ |
| Consultar umbrales vigentes | ✅ | 👁 | ❌ |
| Consultar dashboard | ✅ | ✅ | ✅* |
| Consultar mediciones e historiales | ✅ | ✅ | ✅* |
| Analizar gráficas y tendencias | ✅ | ✅ | ✅* |
| Consultar alertas | ✅ | ✅ | 👁* (propuesta D-007) |
| Reconocer / atender / cerrar alertas | ✅ | ✅ | ❌ |
| Registrar calibraciones y mantenimiento | ✅ | ❌ | ✅* |
| Consultar calibraciones y mantenimiento | ✅ | 👁 (propuesta D-008) | ✅* |
| Generar reportes (PDF/Excel) | ✅ | ✅ | ❌ |
| Cambiar umbrales normativos | ✅ | ❌ | ❌ |
| Ver/editar el propio perfil | ✅ | ✅ | ✅ |

## Notas de implementación (Fase 2)

- El rol se almacena en `profiles.role` (enum `admin`, `analyst`, `field_tech`) vinculado 1:1 a `auth.users` de Supabase.
- La asignación Técnico de campo → dispositivo se modela con la tabla `device_assignments` (ver [DATABASE_DESIGN.md](DATABASE_DESIGN.md)); las políticas RLS que dependen de "dispositivo asignado" consultan esa tabla.
- Ninguna política RLS debe basarse en un valor enviado por el cliente (p. ej. un rol en el JWT sin verificar contra `profiles`); siempre se resuelve el rol desde la tabla `profiles` del usuario autenticado (`auth.uid()`).
- Las filas marcadas "propuesta pendiente de confirmación" se implementarán con esta interpretación por defecto, mencionándolo en el punto de control de Fase 1, y podrán ajustarse sin costo antes de escribir las políticas RLS reales en Fase 2.
