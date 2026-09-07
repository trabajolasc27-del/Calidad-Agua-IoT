-- Crea automaticamente una fila en profiles cuando Supabase Auth registra
-- un usuario nuevo (alta manual por un administrador, invitacion, etc.).
-- El rol por defecto es el mas restringido (field_tech); un administrador
-- debe asignar el rol definitivo despues (RF-07).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'field_tech')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
