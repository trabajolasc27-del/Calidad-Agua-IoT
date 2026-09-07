-- Funciones RPC para el ciclo de vida de una alerta: NEW -> ACKNOWLEDGED ->
-- ATTENDED -> CLOSED. Son el UNICO camino permitido para mutar public.alerts
-- (ver docs/API_CONTRACT.md seccion 3): no existe policy de UPDATE directa
-- sobre la tabla, asi que esto no se puede saltar desde el cliente.
-- Solo Administrador y Analista ambiental pueden invocarlas (D-007).

create or replace function public.acknowledge_alert(_alert_id uuid)
returns public.alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.alerts%rowtype;
begin
  if not (public.is_admin() or public.is_analyst()) then
    raise exception 'No autorizado para reconocer alertas' using errcode = '42501';
  end if;

  select * into a from public.alerts where id = _alert_id for update;
  if not found then
    raise exception 'Alerta no encontrada';
  end if;
  if a.status <> 'NEW' then
    raise exception 'Solo se puede reconocer una alerta en estado NEW (actual: %)', a.status;
  end if;

  update public.alerts
  set status = 'ACKNOWLEDGED',
      acknowledged_at = now(),
      acknowledged_by = auth.uid()
  where id = _alert_id
  returning * into a;

  insert into public.alert_history (alert_id, from_status, to_status, changed_by)
  values (_alert_id, 'NEW', 'ACKNOWLEDGED', auth.uid());

  return a;
end;
$$;

create or replace function public.attend_alert(_alert_id uuid, _comment text)
returns public.alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.alerts%rowtype;
begin
  if not (public.is_admin() or public.is_analyst()) then
    raise exception 'No autorizado para atender alertas' using errcode = '42501';
  end if;

  select * into a from public.alerts where id = _alert_id for update;
  if not found then
    raise exception 'Alerta no encontrada';
  end if;
  if a.status <> 'ACKNOWLEDGED' then
    raise exception 'Solo se puede atender una alerta en estado ACKNOWLEDGED (actual: %)', a.status;
  end if;

  update public.alerts
  set status = 'ATTENDED',
      attended_at = now(),
      attended_by = auth.uid(),
      follow_up_comment = coalesce(_comment, follow_up_comment)
  where id = _alert_id
  returning * into a;

  insert into public.alert_history (alert_id, from_status, to_status, changed_by, comment)
  values (_alert_id, 'ACKNOWLEDGED', 'ATTENDED', auth.uid(), _comment);

  return a;
end;
$$;

create or replace function public.close_alert(_alert_id uuid, _comment text)
returns public.alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.alerts%rowtype;
begin
  if not (public.is_admin() or public.is_analyst()) then
    raise exception 'No autorizado para cerrar alertas' using errcode = '42501';
  end if;

  select * into a from public.alerts where id = _alert_id for update;
  if not found then
    raise exception 'Alerta no encontrada';
  end if;
  if a.status <> 'ATTENDED' then
    raise exception 'Solo se puede cerrar una alerta en estado ATTENDED (actual: %)', a.status;
  end if;

  update public.alerts
  set status = 'CLOSED',
      closed_at = now(),
      closed_by = auth.uid(),
      follow_up_comment = coalesce(_comment, follow_up_comment)
  where id = _alert_id
  returning * into a;

  insert into public.alert_history (alert_id, from_status, to_status, changed_by, comment)
  values (_alert_id, 'ATTENDED', 'CLOSED', auth.uid(), _comment);

  return a;
end;
$$;

grant execute on function public.acknowledge_alert(uuid) to authenticated;
grant execute on function public.attend_alert(uuid, text) to authenticated;
grant execute on function public.close_alert(uuid, text) to authenticated;
