-- Traduccion de atributos y campos de la base de datos al espanol, pedida
-- por los docentes del usuario para tramites institucionales con el
-- proyecto (ver docs/DECISIONS.md D-021 para el mapa completo de nombres y
-- el razonamiento). Alcance acordado con el usuario: tablas, columnas de
-- negocio, valores de tipos enumerados, funciones de negocio y politicas
-- RLS. Se quedan en ingles los campos tecnicos universales (id, created_at,
-- updated_at, is_active, is_demo) -- son convencion estandar de cualquier
-- motor de base de datos, no vocabulario del negocio -- y las 3 funciones
-- de infraestructura ligadas al esquema propio de Supabase Auth
-- (set_updated_at, handle_new_user, handle_user_email_update): su NOMBRE
-- no cambia, pero su CUERPO si se actualiza donde referencian perfiles.
--
-- Orden critico dentro de este script (todo en una sola transaccion via la
-- Management API, sin trafico concurrente real en este proyecto de
-- desarrollo):
--   Fase A: renombrar tipos, tablas y columnas (Postgres reescribe solo los
--     indices/constraints/politicas que dependen de ellos por OID; los
--     CUERPOS de funciones plpgsql son texto plano y NO se reescriben solos).
--   Fase B: las politicas RLS dependen de is_admin()/is_analyst()/
--     is_device_assigned() por OID -- hay que eliminarlas ANTES de poder
--     eliminar esas funciones, y solo despues recrear ambas cosas con los
--     nombres nuevos.

-- ============================================================
-- FASE A: tipos, tablas, columnas y datos
-- ============================================================

-- -- Tipos enumerados --
alter type public.user_role rename to rol_usuario;
alter type public.rol_usuario rename value 'admin' to 'administrador';
alter type public.rol_usuario rename value 'analyst' to 'analista';
alter type public.rol_usuario rename value 'field_tech' to 'tecnico_campo';

alter type public.device_status rename to estado_dispositivo;
alter type public.estado_dispositivo rename value 'active' to 'activo';
alter type public.estado_dispositivo rename value 'inactive' to 'inactivo';

alter type public.evaluation_result rename to resultado_evaluacion;
-- CONFORME/ALERTA/CRITICO ya estan en espanol, sin cambio de valores.

alter type public.alert_severity rename to gravedad_alerta;
alter type public.gravedad_alerta rename value 'WARNING' to 'ALERTA';
alter type public.gravedad_alerta rename value 'CRITICAL' to 'CRITICO';

alter type public.alert_status rename to estado_alerta;
alter type public.estado_alerta rename value 'NEW' to 'NUEVA';
alter type public.estado_alerta rename value 'ACKNOWLEDGED' to 'RECONOCIDA';
alter type public.estado_alerta rename value 'ATTENDED' to 'ATENDIDA';
alter type public.estado_alerta rename value 'CLOSED' to 'CERRADA';

alter type public.maintenance_type rename to tipo_mantenimiento;
alter type public.tipo_mantenimiento rename value 'CALIBRATION' to 'CALIBRACION';
alter type public.tipo_mantenimiento rename value 'MAINTENANCE' to 'MANTENIMIENTO';

alter type public.notification_status rename to estado_notificacion;
alter type public.estado_notificacion rename value 'SENT' to 'ENVIADO';
alter type public.estado_notificacion rename value 'FAILED' to 'FALLIDO';

-- -- Tablas --
alter table public.profiles rename to perfiles;
alter table public.locations rename to ubicaciones;
alter table public.devices rename to dispositivos;
alter table public.device_credentials rename to credenciales_dispositivo;
alter table public.device_assignments rename to asignaciones_dispositivo;
alter table public.parameters rename to parametros;
alter table public.thresholds rename to umbrales;
alter table public.measurement_batches rename to lotes_medicion;
alter table public.measurements rename to mediciones;
alter table public.alerts rename to alertas;
alter table public.alert_history rename to historial_alertas;
alter table public.calibrations rename to calibraciones;
alter table public.maintenance_records rename to registros_mantenimiento;
alter table public.notification_logs rename to registros_notificacion;

-- -- Columnas --
alter table public.perfiles rename column full_name to nombre_completo;
alter table public.perfiles rename column role to rol;
alter table public.perfiles rename column email to correo;

alter table public.ubicaciones rename column name to nombre;
alter table public.ubicaciones rename column description to descripcion;
alter table public.ubicaciones rename column latitude to latitud;
alter table public.ubicaciones rename column longitude to longitud;

alter table public.dispositivos rename column code to codigo;
alter table public.dispositivos rename column name to nombre;
alter table public.dispositivos rename column location_id to ubicacion_id;
alter table public.dispositivos rename column status to estado;
alter table public.dispositivos rename column last_seen_at to ultima_comunicacion;
alter table public.dispositivos rename column firmware_version to version_firmware;

alter table public.credenciales_dispositivo rename column device_id to dispositivo_id;
alter table public.credenciales_dispositivo rename column secret_hash to hash_secreto;
alter table public.credenciales_dispositivo rename column revoked_at to revocado_en;

alter table public.asignaciones_dispositivo rename column device_id to dispositivo_id;
alter table public.asignaciones_dispositivo rename column profile_id to perfil_id;
alter table public.asignaciones_dispositivo rename column assigned_at to asignado_en;

alter table public.parametros rename column code to codigo;
alter table public.parametros rename column name to nombre;
alter table public.parametros rename column unit to unidad;
alter table public.parametros rename column physical_min to minimo_fisico;
alter table public.parametros rename column physical_max to maximo_fisico;

alter table public.umbrales rename column parameter_id to parametro_id;
alter table public.umbrales rename column critical_low to critico_bajo;
alter table public.umbrales rename column warning_low to alerta_bajo;
alter table public.umbrales rename column warning_high to alerta_alto;
alter table public.umbrales rename column critical_high to critico_alto;
alter table public.umbrales rename column consecutive_breaches_to_alert to lecturas_consecutivas_alerta;
alter table public.umbrales rename column created_by to creado_por;

alter table public.lotes_medicion rename column device_id to dispositivo_id;
alter table public.lotes_medicion rename column sequence to secuencia;
alter table public.lotes_medicion rename column measured_at to medido_en;
alter table public.lotes_medicion rename column received_at to recibido_en;
alter table public.lotes_medicion rename column raw_payload to carga_original;

alter table public.mediciones rename column batch_id to lote_id;
alter table public.mediciones rename column parameter_id to parametro_id;
alter table public.mediciones rename column value to valor;
alter table public.mediciones rename column evaluation_result to resultado_evaluacion;
alter table public.mediciones rename column threshold_id_applied to umbral_aplicado_id;

alter table public.alertas rename column device_id to dispositivo_id;
alter table public.alertas rename column parameter_id to parametro_id;
alter table public.alertas rename column first_measurement_id to primera_medicion_id;
alter table public.alertas rename column severity to gravedad;
alter table public.alertas rename column status to estado;
alter table public.alertas rename column opened_at to abierta_en;
alter table public.alertas rename column acknowledged_at to reconocida_en;
alter table public.alertas rename column acknowledged_by to reconocida_por;
alter table public.alertas rename column attended_at to atendida_en;
alter table public.alertas rename column attended_by to atendida_por;
alter table public.alertas rename column closed_at to cerrada_en;
alter table public.alertas rename column closed_by to cerrada_por;
alter table public.alertas rename column follow_up_comment to comentario_seguimiento;
alter table public.alertas rename column threshold_id_applied to umbral_aplicado_id;

alter table public.historial_alertas rename column alert_id to alerta_id;
alter table public.historial_alertas rename column from_status to estado_origen;
alter table public.historial_alertas rename column to_status to estado_destino;
alter table public.historial_alertas rename column changed_by to cambiado_por;
alter table public.historial_alertas rename column comment to comentario;
alter table public.historial_alertas rename column changed_at to cambiado_en;

alter table public.calibraciones rename column device_id to dispositivo_id;
alter table public.calibraciones rename column parameter_id to parametro_id;
alter table public.calibraciones rename column performed_at to realizada_en;
alter table public.calibraciones rename column performed_by to realizada_por;
alter table public.calibraciones rename column notes to notas;
alter table public.calibraciones rename column next_due_at to proxima_fecha;

alter table public.registros_mantenimiento rename column device_id to dispositivo_id;
alter table public.registros_mantenimiento rename column type to tipo;
alter table public.registros_mantenimiento rename column performed_at to realizado_en;
alter table public.registros_mantenimiento rename column performed_by to realizado_por;
alter table public.registros_mantenimiento rename column notes to notas;
alter table public.registros_mantenimiento rename column next_due_at to proxima_fecha;

alter table public.registros_notificacion rename column alert_id to alerta_id;
alter table public.registros_notificacion rename column recipient to destinatario;
alter table public.registros_notificacion rename column channel to canal;
alter table public.registros_notificacion rename column status to estado;
alter table public.registros_notificacion rename column provider_message_id to id_mensaje_proveedor;
alter table public.registros_notificacion rename column error_message to mensaje_error;
alter table public.registros_notificacion rename column sent_at to enviado_en;

-- -- Datos: codigos del catalogo de parametros (dato, no esquema) --
update public.parametros set codigo = 'oxigeno_disuelto' where codigo = 'dissolved_oxygen';
update public.parametros set codigo = 'turbidez' where codigo = 'turbidity';
update public.parametros set codigo = 'temperatura' where codigo = 'temperature';
-- 'ph' se queda igual: es la misma abreviatura en espanol.

-- ============================================================
-- FASE B: politicas RLS y funciones (nombre + cuerpo)
-- ============================================================

-- -- B1: eliminar las 34 politicas viejas (dependen de is_admin/is_analyst/
-- is_device_assigned por OID; hay que quitarlas antes de poder eliminar
-- esas funciones) --
drop policy profiles_select on public.perfiles;
drop policy profiles_update on public.perfiles;
drop policy profiles_admin_insert on public.perfiles;
drop policy profiles_admin_delete on public.perfiles;

drop policy locations_select on public.ubicaciones;
drop policy locations_admin_insert on public.ubicaciones;
drop policy locations_admin_update on public.ubicaciones;
drop policy locations_admin_delete on public.ubicaciones;

drop policy devices_select on public.dispositivos;
drop policy devices_admin_insert on public.dispositivos;
drop policy devices_admin_update on public.dispositivos;
drop policy devices_admin_delete on public.dispositivos;

drop policy device_credentials_admin_select on public.credenciales_dispositivo;
drop policy device_credentials_admin_insert on public.credenciales_dispositivo;
drop policy device_credentials_admin_update on public.credenciales_dispositivo;

drop policy device_assignments_select on public.asignaciones_dispositivo;
drop policy device_assignments_admin_insert on public.asignaciones_dispositivo;
drop policy device_assignments_admin_delete on public.asignaciones_dispositivo;

drop policy parameters_select on public.parametros;
drop policy parameters_admin_insert on public.parametros;
drop policy parameters_admin_update on public.parametros;
drop policy parameters_admin_delete on public.parametros;

drop policy thresholds_select on public.umbrales;
drop policy thresholds_admin_insert on public.umbrales;
drop policy thresholds_admin_update on public.umbrales;

drop policy measurement_batches_select on public.lotes_medicion;
drop policy measurements_select on public.mediciones;
drop policy alerts_select on public.alertas;
drop policy alert_history_select on public.historial_alertas;

drop policy calibrations_select on public.calibraciones;
drop policy calibrations_insert on public.calibraciones;

drop policy maintenance_records_select on public.registros_mantenimiento;
drop policy maintenance_records_insert on public.registros_mantenimiento;

drop policy notification_logs_admin_select on public.registros_notificacion;

-- -- B2: eliminar funciones auxiliares de RLS (ya sin politicas que dependan de ellas) --
drop function public.is_device_assigned(uuid);
drop function public.is_admin();
drop function public.is_analyst();
drop function public.current_role();

-- -- B3: eliminar funciones de negocio (ninguna tiene dependientes por OID) --
drop function public.evaluate_measurement_value(uuid, numeric);
drop function public.evaluate_batch(uuid);
drop function public.acknowledge_alert(uuid);
drop function public.attend_alert(uuid, text);
drop function public.close_alert(uuid, text);
drop function public.verify_device_secret(text, text);
drop function public.ingest_measurement_batch(uuid, bigint, timestamptz, jsonb, jsonb);
drop function public.admin_rotate_device_credential(uuid);
drop function public.admin_create_threshold_version(uuid, numeric, numeric, numeric, numeric, integer);

-- -- B4: recrear funciones auxiliares de RLS con nombre y cuerpo nuevos --
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.perfiles where id = auth.uid();
$$;

create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rol_actual() = 'administrador';
$$;

create or replace function public.es_analista()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.rol_actual() = 'analista';
$$;

create or replace function public.es_dispositivo_asignado(_id_dispositivo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.asignaciones_dispositivo
    where dispositivo_id = _id_dispositivo
      and perfil_id = auth.uid()
  );
$$;

grant execute on function public.rol_actual() to authenticated, anon;
grant execute on function public.es_administrador() to authenticated, anon;
grant execute on function public.es_analista() to authenticated, anon;
grant execute on function public.es_dispositivo_asignado(uuid) to authenticated, anon;

-- -- B5: recrear funciones de negocio con nombre, parametros y cuerpo nuevos --

create or replace function public.evaluar_valor_medicion(_id_parametro uuid, _valor numeric)
returns table (resultado public.resultado_evaluacion, id_umbral uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t public.umbrales%rowtype;
begin
  select * into t
  from public.umbrales
  where parametro_id = _id_parametro and is_active
  limit 1;

  if not found then
    return query select null::public.resultado_evaluacion, null::uuid;
    return;
  end if;

  if (t.critico_bajo is not null and _valor < t.critico_bajo)
     or (t.critico_alto is not null and _valor > t.critico_alto) then
    return query select 'CRITICO'::public.resultado_evaluacion, t.id;
  elsif (t.alerta_bajo is not null and _valor < t.alerta_bajo)
     or (t.alerta_alto is not null and _valor > t.alerta_alto) then
    return query select 'ALERTA'::public.resultado_evaluacion, t.id;
  else
    return query select 'CONFORME'::public.resultado_evaluacion, t.id;
  end if;
end;
$$;

create or replace function public.evaluar_lote(_id_lote uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  dispositivo uuid;
  m record;
  eval record;
  t public.umbrales%rowtype;
  racha_incumplimiento integer;
  alerta_abierta_existente uuid;
  id_alerta_nueva uuid;
  nueva_gravedad public.gravedad_alerta;
begin
  select dispositivo_id into dispositivo from public.lotes_medicion where id = _id_lote;

  for m in
    select id, parametro_id, valor
    from public.mediciones
    where lote_id = _id_lote
  loop
    select * into eval from public.evaluar_valor_medicion(m.parametro_id, m.valor);

    update public.mediciones
    set resultado_evaluacion = eval.resultado,
        umbral_aplicado_id = eval.id_umbral
    where id = m.id;

    if eval.resultado is null or eval.resultado = 'CONFORME' then
      continue;
    end if;

    select * into t from public.umbrales where id = eval.id_umbral;

    select count(*) into racha_incumplimiento
    from (
      select ms.resultado_evaluacion
      from public.mediciones ms
      join public.lotes_medicion mb on mb.id = ms.lote_id
      where mb.dispositivo_id = dispositivo
        and ms.parametro_id = m.parametro_id
      order by ms.created_at desc
      limit t.lecturas_consecutivas_alerta
    ) recientes
    where recientes.resultado_evaluacion <> 'CONFORME';

    if racha_incumplimiento < t.lecturas_consecutivas_alerta then
      continue;
    end if;

    select id into alerta_abierta_existente
    from public.alertas
    where dispositivo_id = dispositivo
      and parametro_id = m.parametro_id
      and estado <> 'CERRADA'
    limit 1;

    if alerta_abierta_existente is not null then
      continue;
    end if;

    nueva_gravedad := case when eval.resultado = 'CRITICO' then 'CRITICO' else 'ALERTA' end;

    insert into public.alertas (dispositivo_id, parametro_id, primera_medicion_id, gravedad, umbral_aplicado_id)
    values (dispositivo, m.parametro_id, m.id, nueva_gravedad, eval.id_umbral)
    returning id into id_alerta_nueva;

    insert into public.historial_alertas (alerta_id, estado_origen, estado_destino, cambiado_por, comentario)
    values (id_alerta_nueva, null, 'NUEVA', null, 'Alerta abierta automaticamente por el motor de evaluacion');
  end loop;
end;
$$;

revoke all on function public.evaluar_valor_medicion(uuid, numeric) from public;
revoke all on function public.evaluar_lote(uuid) from public;
grant execute on function public.evaluar_valor_medicion(uuid, numeric) to service_role;
grant execute on function public.evaluar_lote(uuid) to service_role;

create or replace function public.reconocer_alerta(_id_alerta uuid)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.alertas%rowtype;
begin
  if not (public.es_administrador() or public.es_analista()) then
    raise exception 'No autorizado para reconocer alertas' using errcode = '42501';
  end if;

  select * into a from public.alertas where id = _id_alerta for update;
  if not found then
    raise exception 'Alerta no encontrada';
  end if;
  if a.estado <> 'NUEVA' then
    raise exception 'Solo se puede reconocer una alerta en estado NUEVA (actual: %)', a.estado;
  end if;

  update public.alertas
  set estado = 'RECONOCIDA',
      reconocida_en = now(),
      reconocida_por = auth.uid()
  where id = _id_alerta
  returning * into a;

  insert into public.historial_alertas (alerta_id, estado_origen, estado_destino, cambiado_por)
  values (_id_alerta, 'NUEVA', 'RECONOCIDA', auth.uid());

  return a;
end;
$$;

create or replace function public.atender_alerta(_id_alerta uuid, _comentario text)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.alertas%rowtype;
begin
  if not (public.es_administrador() or public.es_analista()) then
    raise exception 'No autorizado para atender alertas' using errcode = '42501';
  end if;

  select * into a from public.alertas where id = _id_alerta for update;
  if not found then
    raise exception 'Alerta no encontrada';
  end if;
  if a.estado <> 'RECONOCIDA' then
    raise exception 'Solo se puede atender una alerta en estado RECONOCIDA (actual: %)', a.estado;
  end if;

  update public.alertas
  set estado = 'ATENDIDA',
      atendida_en = now(),
      atendida_por = auth.uid(),
      comentario_seguimiento = coalesce(_comentario, comentario_seguimiento)
  where id = _id_alerta
  returning * into a;

  insert into public.historial_alertas (alerta_id, estado_origen, estado_destino, cambiado_por, comentario)
  values (_id_alerta, 'RECONOCIDA', 'ATENDIDA', auth.uid(), _comentario);

  return a;
end;
$$;

create or replace function public.cerrar_alerta(_id_alerta uuid, _comentario text)
returns public.alertas
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.alertas%rowtype;
begin
  if not (public.es_administrador() or public.es_analista()) then
    raise exception 'No autorizado para cerrar alertas' using errcode = '42501';
  end if;

  select * into a from public.alertas where id = _id_alerta for update;
  if not found then
    raise exception 'Alerta no encontrada';
  end if;
  if a.estado <> 'ATENDIDA' then
    raise exception 'Solo se puede cerrar una alerta en estado ATENDIDA (actual: %)', a.estado;
  end if;

  update public.alertas
  set estado = 'CERRADA',
      cerrada_en = now(),
      cerrada_por = auth.uid(),
      comentario_seguimiento = coalesce(_comentario, comentario_seguimiento)
  where id = _id_alerta
  returning * into a;

  insert into public.historial_alertas (alerta_id, estado_origen, estado_destino, cambiado_por, comentario)
  values (_id_alerta, 'ATENDIDA', 'CERRADA', auth.uid(), _comentario);

  return a;
end;
$$;

grant execute on function public.reconocer_alerta(uuid) to authenticated;
grant execute on function public.atender_alerta(uuid, text) to authenticated;
grant execute on function public.cerrar_alerta(uuid, text) to authenticated;

create or replace function public.verificar_secreto_dispositivo(_codigo_dispositivo text, _secreto text)
returns table (id_dispositivo uuid, resultado_autenticacion text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  d public.dispositivos%rowtype;
  c public.credenciales_dispositivo%rowtype;
begin
  select * into d from public.dispositivos where codigo = _codigo_dispositivo;
  if not found then
    return query select null::uuid, 'not_found';
    return;
  end if;

  select cd.* into c
  from public.credenciales_dispositivo cd
  where cd.dispositivo_id = d.id and cd.revocado_en is null
  limit 1;

  if not found or crypt(_secreto, c.hash_secreto) <> c.hash_secreto then
    return query select d.id, 'invalid_secret';
    return;
  end if;

  if d.estado <> 'activo' then
    return query select d.id, 'inactive';
    return;
  end if;

  return query select d.id, 'ok';
end;
$$;

revoke all on function public.verificar_secreto_dispositivo(text, text) from public;
grant execute on function public.verificar_secreto_dispositivo(text, text) to service_role;

create or replace function public.ingerir_lote_medicion(
  _id_dispositivo uuid,
  _secuencia bigint,
  _medido_en timestamptz,
  _carga_original jsonb,
  _valores jsonb -- objeto {"ph": 7.1, "oxigeno_disuelto": 6.8, ...}
)
returns table (id_lote uuid, codigo_parametro text, resultado_evaluacion public.resultado_evaluacion)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id_lote uuid;
  p record;
begin
  begin
    insert into public.lotes_medicion (dispositivo_id, secuencia, medido_en, carga_original)
    values (_id_dispositivo, _secuencia, _medido_en, _carga_original)
    returning id into v_id_lote;
  exception when unique_violation then
    raise exception 'DUPLICATE_BATCH';
  end;

  for p in
    select key as codigo, (value)::numeric as val
    from jsonb_each_text(_valores)
  loop
    insert into public.mediciones (lote_id, parametro_id, valor)
    select v_id_lote, params.id, p.val
    from public.parametros params
    where params.codigo = p.codigo;
  end loop;

  update public.dispositivos set ultima_comunicacion = now() where id = _id_dispositivo;

  perform public.evaluar_lote(v_id_lote);

  return query
  select v_id_lote, params.codigo, m.resultado_evaluacion
  from public.mediciones m
  join public.parametros params on params.id = m.parametro_id
  where m.lote_id = v_id_lote;
end;
$$;

revoke all on function public.ingerir_lote_medicion(uuid, bigint, timestamptz, jsonb, jsonb) from public;
grant execute on function public.ingerir_lote_medicion(uuid, bigint, timestamptz, jsonb, jsonb) to service_role;

create or replace function public.admin_rotar_credencial_dispositivo(_id_dispositivo uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secreto text;
begin
  if not public.es_administrador() then
    raise exception 'No autorizado para emitir credenciales de dispositivo' using errcode = '42501';
  end if;

  if not exists (select 1 from public.dispositivos where id = _id_dispositivo) then
    raise exception 'Dispositivo no encontrado';
  end if;

  v_secreto := encode(gen_random_bytes(24), 'hex');

  update public.credenciales_dispositivo
  set revocado_en = now()
  where dispositivo_id = _id_dispositivo and revocado_en is null;

  insert into public.credenciales_dispositivo (dispositivo_id, hash_secreto)
  values (_id_dispositivo, crypt(v_secreto, gen_salt('bf')));

  return v_secreto;
end;
$$;

grant execute on function public.admin_rotar_credencial_dispositivo(uuid) to authenticated;

create or replace function public.admin_crear_version_umbral(
  _id_parametro uuid,
  _critico_bajo numeric,
  _alerta_bajo numeric,
  _alerta_alto numeric,
  _critico_alto numeric,
  _lecturas_consecutivas_alerta integer
)
returns public.umbrales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_siguiente_version integer;
  v_fila public.umbrales%rowtype;
begin
  if not public.es_administrador() then
    raise exception 'No autorizado para configurar umbrales' using errcode = '42501';
  end if;

  if not exists (select 1 from public.parametros where id = _id_parametro) then
    raise exception 'Parametro no encontrado';
  end if;

  select coalesce(max(version), 0) + 1 into v_siguiente_version
  from public.umbrales
  where parametro_id = _id_parametro;

  update public.umbrales
  set is_active = false
  where parametro_id = _id_parametro and is_active;

  insert into public.umbrales (
    parametro_id, version, critico_bajo, alerta_bajo, alerta_alto, critico_alto,
    lecturas_consecutivas_alerta, is_active, is_demo, creado_por
  ) values (
    _id_parametro, v_siguiente_version, _critico_bajo, _alerta_bajo, _alerta_alto, _critico_alto,
    coalesce(_lecturas_consecutivas_alerta, 1), true, false, auth.uid()
  )
  returning * into v_fila;

  return v_fila;
end;
$$;

grant execute on function public.admin_crear_version_umbral(uuid, numeric, numeric, numeric, numeric, integer) to authenticated;

-- -- B6: recrear las 34 politicas con nombre, tabla y funciones nuevas --

create policy perfiles_seleccionar on public.perfiles
  for select using (id = auth.uid() or public.es_administrador());
create policy perfiles_actualizar on public.perfiles
  for update using (id = auth.uid() or public.es_administrador());
create policy perfiles_admin_insertar on public.perfiles
  for insert with check (public.es_administrador());
create policy perfiles_admin_eliminar on public.perfiles
  for delete using (public.es_administrador());

create policy ubicaciones_seleccionar on public.ubicaciones
  for select using (auth.uid() is not null);
create policy ubicaciones_admin_insertar on public.ubicaciones
  for insert with check (public.es_administrador());
create policy ubicaciones_admin_actualizar on public.ubicaciones
  for update using (public.es_administrador());
create policy ubicaciones_admin_eliminar on public.ubicaciones
  for delete using (public.es_administrador());

create policy dispositivos_seleccionar on public.dispositivos
  for select using (
    public.es_administrador() or public.es_analista() or public.es_dispositivo_asignado(id)
  );
create policy dispositivos_admin_insertar on public.dispositivos
  for insert with check (public.es_administrador());
create policy dispositivos_admin_actualizar on public.dispositivos
  for update using (public.es_administrador());
create policy dispositivos_admin_eliminar on public.dispositivos
  for delete using (public.es_administrador());

create policy credenciales_dispositivo_admin_seleccionar on public.credenciales_dispositivo
  for select using (public.es_administrador());
create policy credenciales_dispositivo_admin_insertar on public.credenciales_dispositivo
  for insert with check (public.es_administrador());
create policy credenciales_dispositivo_admin_actualizar on public.credenciales_dispositivo
  for update using (public.es_administrador());

create policy asignaciones_dispositivo_seleccionar on public.asignaciones_dispositivo
  for select using (
    public.es_administrador() or public.es_analista() or perfil_id = auth.uid()
  );
create policy asignaciones_dispositivo_admin_insertar on public.asignaciones_dispositivo
  for insert with check (public.es_administrador());
create policy asignaciones_dispositivo_admin_eliminar on public.asignaciones_dispositivo
  for delete using (public.es_administrador());

create policy parametros_seleccionar on public.parametros
  for select using (auth.uid() is not null);
create policy parametros_admin_insertar on public.parametros
  for insert with check (public.es_administrador());
create policy parametros_admin_actualizar on public.parametros
  for update using (public.es_administrador());
create policy parametros_admin_eliminar on public.parametros
  for delete using (public.es_administrador());

create policy umbrales_seleccionar on public.umbrales
  for select using (public.es_administrador() or public.es_analista());
create policy umbrales_admin_insertar on public.umbrales
  for insert with check (public.es_administrador());
create policy umbrales_admin_actualizar on public.umbrales
  for update using (public.es_administrador());

create policy lotes_medicion_seleccionar on public.lotes_medicion
  for select using (
    public.es_administrador() or public.es_analista() or public.es_dispositivo_asignado(dispositivo_id)
  );

create policy mediciones_seleccionar on public.mediciones
  for select using (
    public.es_administrador()
    or public.es_analista()
    or public.es_dispositivo_asignado(
      (select dispositivo_id from public.lotes_medicion b where b.id = lote_id)
    )
  );

create policy alertas_seleccionar on public.alertas
  for select using (
    public.es_administrador() or public.es_analista() or public.es_dispositivo_asignado(dispositivo_id)
  );

create policy historial_alertas_seleccionar on public.historial_alertas
  for select using (
    public.es_administrador()
    or public.es_analista()
    or public.es_dispositivo_asignado(
      (select dispositivo_id from public.alertas a where a.id = alerta_id)
    )
  );

create policy calibraciones_seleccionar on public.calibraciones
  for select using (
    public.es_administrador() or public.es_analista() or public.es_dispositivo_asignado(dispositivo_id)
  );
create policy calibraciones_insertar on public.calibraciones
  for insert with check (
    public.es_administrador() or public.es_dispositivo_asignado(dispositivo_id)
  );

create policy registros_mantenimiento_seleccionar on public.registros_mantenimiento
  for select using (
    public.es_administrador() or public.es_analista() or public.es_dispositivo_asignado(dispositivo_id)
  );
create policy registros_mantenimiento_insertar on public.registros_mantenimiento
  for insert with check (
    public.es_administrador() or public.es_dispositivo_asignado(dispositivo_id)
  );

create policy registros_notificacion_admin_seleccionar on public.registros_notificacion
  for select using (public.es_administrador());

-- -- B7: corregir el cuerpo de las funciones de infraestructura de Auth --
-- (su nombre no cambia: son triggers ligados al esquema auth.users, no
-- vocabulario del negocio; pero su cuerpo si escribe en perfiles y debe
-- usar las columnas nuevas o se rompe el alta de cada usuario nuevo).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo, rol, correo)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'tecnico_campo', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.perfiles set correo = new.email where id = new.id;
  return new;
end;
$$;

-- set_updated_at() no se toca: solo lee/escribe new.updated_at, una columna
-- tecnica que no cambio de nombre.
