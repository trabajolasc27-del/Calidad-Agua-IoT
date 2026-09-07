-- Funciones auxiliares para las politicas RLS. Resuelven siempre el rol
-- desde la tabla profiles del usuario autenticado (auth.uid()), nunca desde
-- un valor enviado por el cliente.

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_analyst()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'analyst';
$$;

create or replace function public.is_device_assigned(_device_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.device_assignments
    where device_id = _device_id
      and profile_id = auth.uid()
  );
$$;

-- Explicito a proposito: estas funciones se invocan DENTRO de las clausulas
-- USING/WITH CHECK de las politicas RLS (siguiente migracion), evaluadas en
-- el contexto del rol "anon"/"authenticated" que hace la consulta. Si ese
-- rol no tiene EXECUTE, Postgres responde "permission denied for function"
-- y CADA politica que las use falla. No se asume el privilegio por defecto.
-- Tambien a "anon": is_admin()/is_analyst() evaluan auth.uid() = null de
-- forma segura (siempre false) para un visitante sin sesion; el objetivo es
-- que una consulta sin sesion devuelva 0 filas, no un error de permisos.
grant execute on function public.current_role() to authenticated, anon;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.is_analyst() to authenticated, anon;
grant execute on function public.is_device_assigned(uuid) to authenticated, anon;
