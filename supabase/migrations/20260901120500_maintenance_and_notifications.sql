-- Calibraciones, mantenimiento y bitacora de notificaciones.
-- Ver docs/DATABASE_DESIGN.md 3.12-3.14.

create table public.calibrations (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  parameter_id uuid references public.parameters (id),
  performed_at timestamptz not null default now(),
  performed_by uuid references public.profiles (id),
  notes text,
  next_due_at timestamptz
);

create index calibrations_device_performed_idx on public.calibrations (device_id, performed_at);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  type public.maintenance_type not null,
  performed_at timestamptz not null default now(),
  performed_by uuid references public.profiles (id),
  notes text,
  next_due_at timestamptz
);

create index maintenance_records_device_performed_idx on public.maintenance_records (device_id, performed_at);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references public.alerts (id) on delete set null,
  recipient text not null,
  channel text not null default 'email',
  status public.notification_status not null,
  provider_message_id text,
  error_message text,
  sent_at timestamptz not null default now()
);

comment on column public.notification_logs.error_message is
  'Nunca debe contener credenciales, API keys ni el payload completo enviado a Brevo.';

create index notification_logs_alert_idx on public.notification_logs (alert_id);
