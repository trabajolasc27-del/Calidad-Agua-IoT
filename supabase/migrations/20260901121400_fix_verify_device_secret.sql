-- Corrige verify_device_secret, dos bugs encontrados al probar la funcion
-- real end-to-end con el simulador (ambos daban 500 antes de llegar a la
-- logica de negocio):
--
-- 1. La clausula "returns table (device_id uuid, ...)" declara device_id
--    como variable de salida visible en toda la funcion, lo que choca con
--    la columna device_credentials.device_id dentro de la consulta interna
--    ("column reference device_id is ambiguous"). Se soluciona calificando
--    la columna con un alias de tabla.
-- 2. pgcrypto (crypt/gen_salt) esta instalado por Supabase en el esquema
--    "extensions", no en "public". Con "set search_path = public" a secas,
--    Postgres no encuentra crypt() ("function crypt(text, text) does not
--    exist"). Se agrega "extensions" al search_path de la funcion.

create or replace function public.verify_device_secret(_device_code text, _secret text)
returns table (device_id uuid, auth_result text)
language plpgsql
security definer
set search_path = public, extensions
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

  select dc.* into c
  from public.device_credentials dc
  where dc.device_id = d.id and dc.revoked_at is null
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
