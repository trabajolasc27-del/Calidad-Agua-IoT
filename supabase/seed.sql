-- Datos de demostracion para desarrollo local y pruebas.
-- Todo lo insertado aqui esta marcado is_demo = true donde la tabla lo
-- permite, y ninguno de estos valores (umbrales incluidos) debe
-- interpretarse como normativo. Un administrador real debe revisar y, en su
-- caso, reemplazar los umbrales antes de usar la plataforma en produccion.
--
-- Los usuarios (con su rol) NO se crean aqui: se dan de alta via Supabase
-- Auth (invitacion o alta manual de un administrador); el trigger
-- on_auth_user_created (20260901120700_new_user_profile.sql) crea su fila
-- en perfiles automaticamente al primer inicio de sesion.
--
-- Nombres de tabla/columna en espanol desde D-021
-- (20260914120000_spanish_rename.sql).

insert into public.parametros (codigo, nombre, unidad, minimo_fisico, maximo_fisico, is_active)
values
  ('ph', 'pH', 'pH', 0, 14, true),
  ('oxigeno_disuelto', 'Oxigeno disuelto', 'mg/L', 0, 20, true),
  ('turbidez', 'Turbidez', 'NTU', 0, 4000, true),
  ('temperatura', 'Temperatura', 'C', -5, 50, true)
on conflict (codigo) do nothing;

insert into public.ubicaciones (nombre, descripcion, latitud, longitud, is_demo)
select 'Pozo Norte (demo)', 'Ubicacion de demostracion, sin correspondencia con un sitio real.', 17.989500, -92.947500, true
where not exists (select 1 from public.ubicaciones where nombre = 'Pozo Norte (demo)');

insert into public.ubicaciones (nombre, descripcion, latitud, longitud, is_demo)
select 'Laguna El Camaron (demo)', 'Ubicacion de demostracion, sin correspondencia con un sitio real.', 17.950000, -92.930000, true
where not exists (select 1 from public.ubicaciones where nombre = 'Laguna El Camaron (demo)');

insert into public.dispositivos (codigo, nombre, ubicacion_id, estado, is_demo)
select 'NODO-DEMO-001', 'Nodo de demostracion 1', l.id, 'activo', true
from public.ubicaciones l
where l.nombre = 'Pozo Norte (demo)'
on conflict (codigo) do nothing;

-- Credencial de demostracion. El secreto en claro ('demo-secret-nodo-001')
-- solo sirve para pruebas locales del simulador; nunca se usa en produccion.
insert into public.credenciales_dispositivo (dispositivo_id, hash_secreto)
select d.id, crypt('demo-secret-nodo-001', gen_salt('bf'))
from public.dispositivos d
where d.codigo = 'NODO-DEMO-001'
  and not exists (
    select 1 from public.credenciales_dispositivo cd
    where cd.dispositivo_id = d.id and cd.revocado_en is null
  );

-- Umbrales de demostracion (is_demo = true) por cada parametro oficial.
insert into public.umbrales
  (parametro_id, version, critico_bajo, alerta_bajo, alerta_alto, critico_alto, lecturas_consecutivas_alerta, is_active, is_demo)
select p.id, 1, 5.5, 6.5, 8.5, 9.5, 2, true, true
from public.parametros p where p.codigo = 'ph'
on conflict (parametro_id, version) do nothing;

insert into public.umbrales
  (parametro_id, version, critico_bajo, alerta_bajo, alerta_alto, critico_alto, lecturas_consecutivas_alerta, is_active, is_demo)
select p.id, 1, 2.0, 4.0, null, null, 2, true, true
from public.parametros p where p.codigo = 'oxigeno_disuelto'
on conflict (parametro_id, version) do nothing;

insert into public.umbrales
  (parametro_id, version, critico_bajo, alerta_bajo, alerta_alto, critico_alto, lecturas_consecutivas_alerta, is_active, is_demo)
select p.id, 1, null, null, 5.0, 10.0, 2, true, true
from public.parametros p where p.codigo = 'turbidez'
on conflict (parametro_id, version) do nothing;

insert into public.umbrales
  (parametro_id, version, critico_bajo, alerta_bajo, alerta_alto, critico_alto, lecturas_consecutivas_alerta, is_active, is_demo)
select p.id, 1, 5.0, 10.0, 32.0, 38.0, 2, true, true
from public.parametros p where p.codigo = 'temperatura'
on conflict (parametro_id, version) do nothing;

-- Un lote de medicion de ejemplo, evaluado con el motor real
-- (public.evaluar_lote) para demostrar el flujo completo de punta a punta.
do $$
declare
  v_id_dispositivo uuid;
  v_id_lote uuid;
begin
  select id into v_id_dispositivo from public.dispositivos where codigo = 'NODO-DEMO-001';

  if v_id_dispositivo is not null
     and not exists (select 1 from public.lotes_medicion where dispositivo_id = v_id_dispositivo and secuencia = 1) then

    insert into public.lotes_medicion (dispositivo_id, secuencia, medido_en, carga_original)
    values (v_id_dispositivo, 1, now() - interval '10 minutes', '{"source":"seed-demo"}'::jsonb)
    returning id into v_id_lote;

    insert into public.mediciones (lote_id, parametro_id, valor)
    select v_id_lote, p.id, v.valor
    from public.parametros p
    join (values
      ('ph', 7.1),
      ('oxigeno_disuelto', 6.8),
      ('turbidez', 4.2),
      ('temperatura', 28.3)
    ) as v (codigo, valor) on v.codigo = p.codigo;

    perform public.evaluar_lote(v_id_lote);
  end if;
end $$;
