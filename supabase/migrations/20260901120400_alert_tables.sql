-- Alertas y su historial de transiciones de estado.
-- Ver docs/DATABASE_DESIGN.md 3.10-3.11 y docs/API_CONTRACT.md seccion 3.

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  parameter_id uuid not null references public.parameters (id),
  first_measurement_id uuid references public.measurements (id),
  severity public.alert_severity not null,
  status public.alert_status not null default 'NEW',
  opened_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles (id),
  attended_at timestamptz,
  attended_by uuid references public.profiles (id),
  closed_at timestamptz,
  closed_by uuid references public.profiles (id),
  follow_up_comment text,
  threshold_id_applied uuid references public.thresholds (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index alerts_device_status_idx on public.alerts (device_id, status);
create index alerts_status_idx on public.alerts (status);

-- Evita alertas duplicadas: como mucho una alerta no cerrada por dispositivo+parametro.
create unique index alerts_open_unique_idx
  on public.alerts (device_id, parameter_id)
  where status <> 'CLOSED';

comment on table public.alerts is
  'Las mutaciones de estado (reconocer/atender/cerrar) se hacen exclusivamente via las funciones RPC de 20260901121100_alert_transitions.sql, nunca por UPDATE directo del cliente.';

create table public.alert_history (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts (id) on delete cascade,
  from_status public.alert_status,
  to_status public.alert_status not null,
  changed_by uuid references public.profiles (id),
  comment text,
  changed_at timestamptz not null default now()
);

create index alert_history_alert_changed_idx on public.alert_history (alert_id, changed_at);
