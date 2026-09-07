-- Umbrales versionables y mediciones en formato "largo" (una fila por
-- parametro por lote), ver D-004 y docs/DATABASE_DESIGN.md 3.7-3.9.

create table public.thresholds (
  id uuid primary key default gen_random_uuid(),
  parameter_id uuid not null references public.parameters (id) on delete cascade,
  version integer not null,
  critical_low numeric,
  warning_low numeric,
  warning_high numeric,
  critical_high numeric,
  consecutive_breaches_to_alert integer not null default 1,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (parameter_id, version)
);

comment on table public.thresholds is
  'Umbrales configurables por un administrador. Los valores sembrados por seed.sql son demostrativos (is_demo = true) y no representan un limite normativo.';

-- Solo puede existir un umbral activo por parametro a la vez.
create unique index thresholds_one_active_per_parameter
  on public.thresholds (parameter_id)
  where is_active;

create index thresholds_parameter_active_idx on public.thresholds (parameter_id, is_active);

create table public.measurement_batches (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  sequence bigint not null,
  measured_at timestamptz not null,
  received_at timestamptz not null default now(),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (device_id, sequence)
);

comment on constraint measurement_batches_device_id_sequence_key on public.measurement_batches is
  'Sustenta el rechazo 409 de lotes duplicados del contrato de ingesta (ver docs/API_CONTRACT.md).';

create index measurement_batches_device_measured_idx
  on public.measurement_batches (device_id, measured_at);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.measurement_batches (id) on delete cascade,
  parameter_id uuid not null references public.parameters (id),
  value numeric not null,
  evaluation_result public.evaluation_result,
  threshold_id_applied uuid references public.thresholds (id),
  created_at timestamptz not null default now()
);

comment on column public.measurements.threshold_id_applied is
  'Umbral vigente en el momento de la evaluacion. Se conserva aunque el umbral cambie despues (RNF-05).';

create index measurements_batch_idx on public.measurements (batch_id);
create index measurements_parameter_created_idx on public.measurements (parameter_id, created_at);
create index measurements_evaluation_result_idx on public.measurements (evaluation_result);
