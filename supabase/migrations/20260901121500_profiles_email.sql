-- profiles no tenia correo: vive en auth.users, un esquema que el
-- frontend no puede leer directamente vía PostgREST. Se denormaliza aqui
-- para poder listar usuarios (RF-06) sin exponer todo el esquema auth.

alter table public.profiles add column if not exists email text;

-- Backfill de las filas que ya existian antes de esta columna.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id
  and p.email is null;

-- El trigger de alta (20260901120700_new_user_profile.sql) tambien debe
-- guardar el correo desde ahora.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'field_tech', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Si el correo cambia despues (recuperacion, cambio manual), se mantiene
-- sincronizado con profiles.email.
create or replace function public.handle_user_email_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.handle_user_email_update();
