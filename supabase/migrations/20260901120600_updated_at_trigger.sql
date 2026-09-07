-- Mantiene updated_at al dia en las tablas mutables que lo tienen.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.locations
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.devices
  for each row execute function public.set_updated_at();

create trigger set_updated_at before update on public.alerts
  for each row execute function public.set_updated_at();
