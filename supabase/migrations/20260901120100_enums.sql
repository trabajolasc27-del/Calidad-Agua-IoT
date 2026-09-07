-- Tipos enumerados del dominio. Ver docs/DATABASE_DESIGN.md seccion 2.

create type public.user_role as enum ('admin', 'analyst', 'field_tech');
create type public.device_status as enum ('active', 'inactive');
create type public.evaluation_result as enum ('CONFORME', 'ALERTA', 'CRITICO');
create type public.alert_severity as enum ('WARNING', 'CRITICAL');
create type public.alert_status as enum ('NEW', 'ACKNOWLEDGED', 'ATTENDED', 'CLOSED');
create type public.maintenance_type as enum ('CALIBRATION', 'MAINTENANCE');
create type public.notification_status as enum ('SENT', 'FAILED');
