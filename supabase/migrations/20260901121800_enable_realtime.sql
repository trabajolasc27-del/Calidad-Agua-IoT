-- Supabase Realtime necesita que cada tabla se agregue explicitamente a
-- la publicacion "supabase_realtime" -- esto es independiente de RLS
-- (que sigue filtrando que filas puede ver cada cliente conectado). Sin
-- esto, el Dashboard no recibiria actualizaciones en vivo (RF-26).

alter publication supabase_realtime add table public.measurement_batches;
alter publication supabase_realtime add table public.alerts;
