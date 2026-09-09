-- RPC para crear una nueva version de umbral (RF-16) de forma atomica:
-- desactiva la version anterior e inserta la nueva en la misma
-- transaccion, respetando el indice unico parcial que exige como maximo
-- un umbral activo por parametro (thresholds_one_active_per_parameter).
-- Sin esto, hacerlo como dos llamadas separadas desde el cliente dejaria
-- una ventana donde ambas versiones podrian quedar activas a la vez.

create or replace function public.admin_create_threshold_version(
  _parameter_id uuid,
  _critical_low numeric,
  _warning_low numeric,
  _warning_high numeric,
  _critical_high numeric,
  _consecutive_breaches_to_alert integer
)
returns public.thresholds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_version integer;
  v_row public.thresholds%rowtype;
begin
  if not public.is_admin() then
    raise exception 'No autorizado para configurar umbrales' using errcode = '42501';
  end if;

  if not exists (select 1 from public.parameters where id = _parameter_id) then
    raise exception 'Parametro no encontrado';
  end if;

  select coalesce(max(version), 0) + 1 into v_next_version
  from public.thresholds
  where parameter_id = _parameter_id;

  update public.thresholds
  set is_active = false
  where parameter_id = _parameter_id and is_active;

  insert into public.thresholds (
    parameter_id, version, critical_low, warning_low, warning_high, critical_high,
    consecutive_breaches_to_alert, is_active, is_demo, created_by
  ) values (
    _parameter_id, v_next_version, _critical_low, _warning_low, _warning_high, _critical_high,
    coalesce(_consecutive_breaches_to_alert, 1), true, false, auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.admin_create_threshold_version(uuid, numeric, numeric, numeric, numeric, integer) to authenticated;
