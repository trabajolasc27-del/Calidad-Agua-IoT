-- Insercion transaccional de un lote completo: cabecera + mediciones,
-- actualizacion de last_seen y evaluacion, todo en una sola funcion para
-- que la Edge Function de ingesta la invoque como una unica transaccion
-- atomica (docs/API_CONTRACT.md, UC-02).

create or replace function public.ingest_measurement_batch(
  _device_id uuid,
  _sequence bigint,
  _measured_at timestamptz,
  _raw_payload jsonb,
  _values jsonb -- objeto {"ph": 7.1, "dissolved_oxygen": 6.8, ...}
)
returns table (batch_id uuid, parameter_code text, evaluation_result public.evaluation_result)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_id uuid;
  p record;
begin
  begin
    insert into public.measurement_batches (device_id, sequence, measured_at, raw_payload)
    values (_device_id, _sequence, _measured_at, _raw_payload)
    returning id into v_batch_id;
  exception when unique_violation then
    -- Mismo device_id + sequence ya recibido: la Edge Function traduce esto a HTTP 409.
    raise exception 'DUPLICATE_BATCH';
  end;

  for p in
    select key as code, (value)::numeric as val
    from jsonb_each_text(_values)
  loop
    insert into public.measurements (batch_id, parameter_id, value)
    select v_batch_id, params.id, p.val
    from public.parameters params
    where params.code = p.code;
  end loop;

  update public.devices set last_seen_at = now() where id = _device_id;

  perform public.evaluate_batch(v_batch_id);

  return query
  select v_batch_id, params.code, m.evaluation_result
  from public.measurements m
  join public.parameters params on params.id = m.parameter_id
  where m.batch_id = v_batch_id;
end;
$$;

revoke all on function public.ingest_measurement_batch(uuid, bigint, timestamptz, jsonb, jsonb) from public;
grant execute on function public.ingest_measurement_batch(uuid, bigint, timestamptz, jsonb, jsonb) to service_role;
