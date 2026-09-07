-- Extensiones requeridas por el esquema.
-- pgcrypto aporta gen_random_uuid() para las llaves primarias y
-- crypt()/gen_salt() para hashear los secretos de dispositivo (ver D-003).
create extension if not exists "pgcrypto";
