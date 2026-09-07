-- Politicas de Row Level Security. Traducen 1:1 la matriz de roles de
-- docs/ROLE_MATRIX.md y el resumen de docs/DATABASE_DESIGN.md seccion 5.
-- Regla transversal: measurement_batches y measurements no tienen policy de
-- INSERT/UPDATE/DELETE para "authenticated" -- solo la Edge Function de
-- ingesta, usando la service_role key, puede escribir ahi (bypassea RLS).

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.devices enable row level security;
alter table public.device_credentials enable row level security;
alter table public.device_assignments enable row level security;
alter table public.parameters enable row level security;
alter table public.thresholds enable row level security;
alter table public.measurement_batches enable row level security;
alter table public.measurements enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_history enable row level security;
alter table public.calibrations enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.notification_logs enable row level security;

-- profiles: cada quien ve/edita su propio perfil; admin ve/edita todos.
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

create policy profiles_admin_insert on public.profiles
  for insert with check (public.is_admin());

create policy profiles_admin_delete on public.profiles
  for delete using (public.is_admin());

-- locations: todo autenticado puede leer; solo admin escribe.
create policy locations_select on public.locations
  for select using (auth.uid() is not null);

create policy locations_admin_insert on public.locations
  for insert with check (public.is_admin());

create policy locations_admin_update on public.locations
  for update using (public.is_admin());

create policy locations_admin_delete on public.locations
  for delete using (public.is_admin());

-- devices: admin y analista ven todos; tecnico de campo solo los asignados.
create policy devices_select on public.devices
  for select using (
    public.is_admin() or public.is_analyst() or public.is_device_assigned(id)
  );

create policy devices_admin_insert on public.devices
  for insert with check (public.is_admin());

create policy devices_admin_update on public.devices
  for update using (public.is_admin());

create policy devices_admin_delete on public.devices
  for delete using (public.is_admin());

-- device_credentials: exclusivo de admin (el secreto en claro no se guarda,
-- ver D-003; nunca se inserta desde el cliente autenticado por usuario).
create policy device_credentials_admin_select on public.device_credentials
  for select using (public.is_admin());

create policy device_credentials_admin_insert on public.device_credentials
  for insert with check (public.is_admin());

create policy device_credentials_admin_update on public.device_credentials
  for update using (public.is_admin());

-- device_assignments
create policy device_assignments_select on public.device_assignments
  for select using (
    public.is_admin() or public.is_analyst() or profile_id = auth.uid()
  );

create policy device_assignments_admin_insert on public.device_assignments
  for insert with check (public.is_admin());

create policy device_assignments_admin_delete on public.device_assignments
  for delete using (public.is_admin());

-- parameters: catalogo visible para todos, editable solo por admin.
create policy parameters_select on public.parameters
  for select using (auth.uid() is not null);

create policy parameters_admin_insert on public.parameters
  for insert with check (public.is_admin());

create policy parameters_admin_update on public.parameters
  for update using (public.is_admin());

create policy parameters_admin_delete on public.parameters
  for delete using (public.is_admin());

-- thresholds: admin CRUD, analista solo lectura, tecnico sin acceso (D-007).
create policy thresholds_select on public.thresholds
  for select using (public.is_admin() or public.is_analyst());

create policy thresholds_admin_insert on public.thresholds
  for insert with check (public.is_admin());

create policy thresholds_admin_update on public.thresholds
  for update using (public.is_admin());

-- measurement_batches: solo lectura para admin/analista/tecnico-asignado.
create policy measurement_batches_select on public.measurement_batches
  for select using (
    public.is_admin() or public.is_analyst() or public.is_device_assigned(device_id)
  );

-- measurements: idem, resolviendo el dispositivo via el lote.
create policy measurements_select on public.measurements
  for select using (
    public.is_admin()
    or public.is_analyst()
    or public.is_device_assigned(
      (select device_id from public.measurement_batches b where b.id = batch_id)
    )
  );

-- alerts: solo lectura por RLS. Las transiciones de estado pasan por las
-- funciones RPC de 20260901121100_alert_transitions.sql (D-007: el tecnico
-- de campo solo lee, nunca reconoce/atiende/cierra).
create policy alerts_select on public.alerts
  for select using (
    public.is_admin() or public.is_analyst() or public.is_device_assigned(device_id)
  );

-- alert_history
create policy alert_history_select on public.alert_history
  for select using (
    public.is_admin()
    or public.is_analyst()
    or public.is_device_assigned(
      (select device_id from public.alerts a where a.id = alert_id)
    )
  );

-- calibrations: admin y tecnico-asignado escriben; analista solo lee (D-008).
create policy calibrations_select on public.calibrations
  for select using (
    public.is_admin() or public.is_analyst() or public.is_device_assigned(device_id)
  );

create policy calibrations_insert on public.calibrations
  for insert with check (
    public.is_admin() or public.is_device_assigned(device_id)
  );

-- maintenance_records: misma regla que calibrations.
create policy maintenance_records_select on public.maintenance_records
  for select using (
    public.is_admin() or public.is_analyst() or public.is_device_assigned(device_id)
  );

create policy maintenance_records_insert on public.maintenance_records
  for insert with check (
    public.is_admin() or public.is_device_assigned(device_id)
  );

-- notification_logs: exclusivo de admin.
create policy notification_logs_admin_select on public.notification_logs
  for select using (public.is_admin());
