-- Motor de evaluacion (D-005). Centraliza la comparacion contra umbrales y
-- la apertura de alertas; es la unica fuente de verdad para estas reglas
-- (no se duplica en Angular ni en la Edge Function de ingesta).

-- Evalua un valor individual contra el umbral activo de su parametro.
-- Devuelve null como resultado si el parametro no tiene umbral activo
-- configurado todavia (la medicion se guarda igual, sin evaluar).
create or replace function public.evaluate_measurement_value(_parameter_id uuid, _value numeric)
returns table (result public.evaluation_result, threshold_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  t public.thresholds%rowtype;
begin
  select * into t
  from public.thresholds
  where parameter_id = _parameter_id and is_active
  limit 1;

  if not found then
    return query select null::public.evaluation_result, null::uuid;
    return;
  end if;

  if (t.critical_low is not null and _value < t.critical_low)
     or (t.critical_high is not null and _value > t.critical_high) then
    return query select 'CRITICO'::public.evaluation_result, t.id;
  elsif (t.warning_low is not null and _value < t.warning_low)
     or (t.warning_high is not null and _value > t.warning_high) then
    return query select 'ALERTA'::public.evaluation_result, t.id;
  else
    return query select 'CONFORME'::public.evaluation_result, t.id;
  end if;
end;
$$;

-- Evalua todas las mediciones de un lote recien insertado, guarda el
-- resultado de cada una y abre alertas cuando corresponde. Se invoca desde
-- la Edge Function de ingesta dentro de la misma transaccion del INSERT.
create or replace function public.evaluate_batch(_batch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  device uuid;
  m record;
  eval record;
  t public.thresholds%rowtype;
  breach_streak integer;
  existing_open_alert uuid;
  new_alert_id uuid;
  new_severity public.alert_severity;
begin
  select device_id into device from public.measurement_batches where id = _batch_id;

  for m in
    select id, parameter_id, value
    from public.measurements
    where batch_id = _batch_id
  loop
    select * into eval from public.evaluate_measurement_value(m.parameter_id, m.value);

    update public.measurements
    set evaluation_result = eval.result,
        threshold_id_applied = eval.threshold_id
    where id = m.id;

    -- Sin umbral activo o dentro de rango: nada mas que hacer con esta medicion.
    if eval.result is null or eval.result = 'CONFORME' then
      continue;
    end if;

    select * into t from public.thresholds where id = eval.threshold_id;

    -- Cuenta cuantas de las ultimas N mediciones de este dispositivo+parametro
    -- (N = umbral.consecutive_breaches_to_alert) estan fuera de rango.
    select count(*) into breach_streak
    from (
      select ms.evaluation_result
      from public.measurements ms
      join public.measurement_batches mb on mb.id = ms.batch_id
      where mb.device_id = device
        and ms.parameter_id = m.parameter_id
      order by ms.created_at desc
      limit t.consecutive_breaches_to_alert
    ) recent
    where recent.evaluation_result <> 'CONFORME';

    if breach_streak < t.consecutive_breaches_to_alert then
      continue;
    end if;

    -- No duplicar: si ya existe una alerta no cerrada para este dispositivo+parametro, no crear otra.
    select id into existing_open_alert
    from public.alerts
    where device_id = device
      and parameter_id = m.parameter_id
      and status <> 'CLOSED'
    limit 1;

    if existing_open_alert is not null then
      continue;
    end if;

    new_severity := case when eval.result = 'CRITICO' then 'CRITICAL' else 'WARNING' end;

    insert into public.alerts (device_id, parameter_id, first_measurement_id, severity, threshold_id_applied)
    values (device, m.parameter_id, m.id, new_severity, eval.threshold_id)
    returning id into new_alert_id;

    insert into public.alert_history (alert_id, from_status, to_status, changed_by, comment)
    values (new_alert_id, null, 'NEW', null, 'Alerta abierta automaticamente por el motor de evaluacion');
  end loop;
end;
$$;

-- Plumbing interno: solo debe invocarse desde public.ingest_measurement_batch
-- (o desde una migracion/seed corriendo como postgres), nunca directo desde
-- el cliente via RPC -- de lo contrario cualquier usuario autenticado podria
-- re-disparar la evaluacion de un lote ajeno.
revoke all on function public.evaluate_measurement_value(uuid, numeric) from public;
revoke all on function public.evaluate_batch(uuid) from public;
grant execute on function public.evaluate_measurement_value(uuid, numeric) to service_role;
grant execute on function public.evaluate_batch(uuid) to service_role;
