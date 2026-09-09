-- RPC para que un Administrador emita/rote la credencial de un
-- dispositivo desde la propia app (RF-11/RF-12), sin necesitar acceso
-- directo a SQL. El secreto se genera y se hashea del lado del servidor
-- (D-003); se devuelve en claro UNA sola vez como resultado de esta
-- llamada -- nunca se guarda en claro en ningun lado.

create or replace function public.admin_rotate_device_credential(_device_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado para emitir credenciales de dispositivo' using errcode = '42501';
  end if;

  if not exists (select 1 from public.devices where id = _device_id) then
    raise exception 'Dispositivo no encontrado';
  end if;

  v_secret := encode(gen_random_bytes(24), 'hex');

  update public.device_credentials
  set revoked_at = now()
  where device_id = _device_id and revoked_at is null;

  insert into public.device_credentials (device_id, secret_hash)
  values (_device_id, crypt(v_secret, gen_salt('bf')));

  return v_secret;
end;
$$;

grant execute on function public.admin_rotate_device_credential(uuid) to authenticated;
