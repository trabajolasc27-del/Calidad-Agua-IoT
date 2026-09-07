-- Datos de demostracion para desarrollo local y pruebas.
-- Todo lo insertado aqui esta marcado is_demo = true donde la tabla lo
-- permite, y ninguno de estos valores (umbrales incluidos) debe
-- interpretarse como normativo. Un administrador real debe revisar y, en su
-- caso, reemplazar los umbrales antes de usar la plataforma en produccion.
--
-- Los usuarios (con su rol) NO se crean aqui: se dan de alta via Supabase
-- Auth (invitacion o alta manual de un administrador); el trigger
-- on_auth_user_created (20260901120700_new_user_profile.sql) crea su fila
-- en profiles automaticamente al primer inicio de sesion.

insert into public.parameters (code, name, unit, physical_min, physical_max, is_active)
values
  ('ph', 'pH', 'pH', 0, 14, true),
  ('dissolved_oxygen', 'Oxigeno disuelto', 'mg/L', 0, 20, true),
  ('turbidity', 'Turbidez', 'NTU', 0, 4000, true),
  ('temperature', 'Temperatura', 'C', -5, 50, true)
on conflict (code) do nothing;

insert into public.locations (name, description, latitude, longitude, is_demo)
select 'Pozo Norte (demo)', 'Ubicacion de demostracion, sin correspondencia con un sitio real.', 17.989500, -92.947500, true
where not exists (select 1 from public.locations where name = 'Pozo Norte (demo)');

insert into public.locations (name, description, latitude, longitude, is_demo)
select 'Laguna El Camaron (demo)', 'Ubicacion de demostracion, sin correspondencia con un sitio real.', 17.950000, -92.930000, true
where not exists (select 1 from public.locations where name = 'Laguna El Camaron (demo)');

insert into public.devices (code, name, location_id, status, is_demo)
select 'NODO-DEMO-001', 'Nodo de demostracion 1', l.id, 'active', true
from public.locations l
where l.name = 'Pozo Norte (demo)'
on conflict (code) do nothing;

-- Credencial de demostracion. El secreto en claro ('demo-secret-nodo-001')
-- solo sirve para pruebas locales del simulador; nunca se usa en produccion.
insert into public.device_credentials (device_id, secret_hash)
select d.id, crypt('demo-secret-nodo-001', gen_salt('bf'))
from public.devices d
where d.code = 'NODO-DEMO-001'
  and not exists (
    select 1 from public.device_credentials dc
    where dc.device_id = d.id and dc.revoked_at is null
  );

-- Umbrales de demostracion (is_demo = true) por cada parametro oficial.
insert into public.thresholds
  (parameter_id, version, critical_low, warning_low, warning_high, critical_high, consecutive_breaches_to_alert, is_active, is_demo)
select p.id, 1, 5.5, 6.5, 8.5, 9.5, 2, true, true
from public.parameters p where p.code = 'ph'
on conflict (parameter_id, version) do nothing;

insert into public.thresholds
  (parameter_id, version, critical_low, warning_low, warning_high, critical_high, consecutive_breaches_to_alert, is_active, is_demo)
select p.id, 1, 2.0, 4.0, null, null, 2, true, true
from public.parameters p where p.code = 'dissolved_oxygen'
on conflict (parameter_id, version) do nothing;

insert into public.thresholds
  (parameter_id, version, critical_low, warning_low, warning_high, critical_high, consecutive_breaches_to_alert, is_active, is_demo)
select p.id, 1, null, null, 5.0, 10.0, 2, true, true
from public.parameters p where p.code = 'turbidity'
on conflict (parameter_id, version) do nothing;

insert into public.thresholds
  (parameter_id, version, critical_low, warning_low, warning_high, critical_high, consecutive_breaches_to_alert, is_active, is_demo)
select p.id, 1, 5.0, 10.0, 32.0, 38.0, 2, true, true
from public.parameters p where p.code = 'temperature'
on conflict (parameter_id, version) do nothing;

-- Un lote de medicion de ejemplo, evaluado con el motor real
-- (public.evaluate_batch) para demostrar el flujo completo de punta a punta.
do $$
declare
  v_device_id uuid;
  v_batch_id uuid;
begin
  select id into v_device_id from public.devices where code = 'NODO-DEMO-001';

  if v_device_id is not null
     and not exists (select 1 from public.measurement_batches where device_id = v_device_id and sequence = 1) then

    insert into public.measurement_batches (device_id, sequence, measured_at, raw_payload)
    values (v_device_id, 1, now() - interval '10 minutes', '{"source":"seed-demo"}'::jsonb)
    returning id into v_batch_id;

    insert into public.measurements (batch_id, parameter_id, value)
    select v_batch_id, p.id, v.value
    from public.parameters p
    join (values
      ('ph', 7.1),
      ('dissolved_oxygen', 6.8),
      ('turbidity', 4.2),
      ('temperature', 28.3)
    ) as v (code, value) on v.code = p.code;

    perform public.evaluate_batch(v_batch_id);
  end if;
end $$;
