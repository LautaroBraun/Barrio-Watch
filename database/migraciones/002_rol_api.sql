-- =============================================================================
-- Usuario de base propio para la API desplegada (Vercel).
--
-- La API no usa el usuario postgres: se conecta como barrio_api, que solo
-- puede leer y escribir estas tablas. RLS sigue bloqueando a la anon key.
-- Reemplazá CAMBIAR_POR_UNA_CONTRASEÑA antes de ejecutarlo.
--
-- Conexión (Supavisor, modo transacción):
--   postgresql://barrio_api.<ref-del-proyecto>:<contraseña>@aws-1-us-west-1.pooler.supabase.com:6543/postgres
-- =============================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'barrio_api') then
    create role barrio_api login password 'CAMBIAR_POR_UNA_CONTRASEÑA';
  end if;
end $$;

-- La tabla de tokens se llamó tokens_recuperacion hasta la migración 004; el
-- renombre conserva permisos y políticas, así que este script sirve para
-- cualquiera de los dos estados y solo toca las tablas que existen.
grant usage on schema public to barrio_api;

do $$
declare t text;
begin
  foreach t in array array['roles','zonas','categorias','usuarios','sesiones','publicaciones','alertas','reportes_moderacion','tokens','tokens_recuperacion'] loop
    if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      continue;
    end if;
    execute format('grant select, insert, update, delete on %I to barrio_api', t);
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'api_barrio_watch') then
      execute format('create policy api_barrio_watch on %I for all to barrio_api using (true) with check (true)', t);
    end if;
  end loop;
end $$;

grant usage, select on all sequences in schema public to barrio_api;
