-- Tablas de catalogo y organizacion: perfiles, ubicaciones, dispositivos,
-- credenciales de dispositivo, asignaciones tecnico->dispositivo y parametros.
-- Ver docs/DATABASE_DESIGN.md secciones 3.1 a 3.6.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.user_role not null default 'field_tech',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Extiende auth.users con datos de aplicacion. El rol por defecto es field_tech (el mas restringido); un administrador debe promoverlo explicitamente.';

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location_id uuid references public.locations (id) on delete set null,
  status public.device_status not null default 'active',
  last_seen_at timestamptz,
  firmware_version text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index devices_location_id_idx on public.devices (location_id);
create index devices_status_idx on public.devices (status);

create table public.device_credentials (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  secret_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

comment on column public.device_credentials.secret_hash is
  'Hash (pgcrypto crypt/blowfish) del secreto del dispositivo. El valor en claro nunca se almacena, solo se muestra una vez al crearlo (ver D-003).';

create unique index device_credentials_active_idx
  on public.device_credentials (device_id)
  where revoked_at is null;

create table public.device_assignments (
  device_id uuid not null references public.devices (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (device_id, profile_id)
);

create table public.parameters (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  unit text not null,
  physical_min numeric,
  physical_max numeric,
  is_active boolean not null default true
);

comment on table public.parameters is
  'Catalogo de parametros medidos. physical_min/physical_max son limites fisicos plausibles para validar entrada, no valores normativos.';
