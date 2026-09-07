-- Verificacion del secreto de un dispositivo (D-003). Solo la Edge Function
-- de ingesta (via service_role) puede invocar esta funcion; nunca se expone
-- a "anon" ni "authenticated".

create or replace function public.verify_device_secret(_device_code text, _secret text)
returns table (device_id uuid, auth_result text)
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.devices%rowtype;
  c public.device_credentials%rowtype;
begin
  select * into d from public.devices where code = _device_code;
  if not found then
    return query select null::uuid, 'not_found';
    return;
  end if;

  select * into c
  from public.device_credentials
  where device_id = d.id and revoked_at is null
  limit 1;

  if not found or crypt(_secret, c.secret_hash) <> c.secret_hash then
    return query select d.id, 'invalid_secret';
    return;
  end if;

  if d.status <> 'active' then
    return query select d.id, 'inactive';
    return;
  end if;

  return query select d.id, 'ok';
end;
$$;

revoke all on function public.verify_device_secret(text, text) from public;
grant execute on function public.verify_device_secret(text, text) to service_role;
