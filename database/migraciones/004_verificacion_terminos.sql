-- =============================================================================
-- Migración Sprint 1 · Ampliación — HU06, HU07 y HU08
--
--   HU06 · Verificación del correo electrónico
--   HU07 · Aceptación de términos y política de privacidad
--   HU08 · Teléfono de contacto opcional (la columna ya existía en el modelo
--          de PP2, así que acá solo se documenta)
--
-- Incluye la generalización de la tabla de tokens, que pasa de servir solo a
-- la recuperación de contraseña a distinguir el tipo de enlace. El renombre
-- se aplica junto con el código que la consume: ejecutar esta migración sin
-- desplegar el backend correspondiente rompe la recuperación de contraseña.
-- =============================================================================

-- HU06 · CA 6.4 y HU07 · CA 7.2 -------------------------------------------- --
alter table usuarios add column if not exists email_verificado          boolean not null default false;
alter table usuarios add column if not exists fecha_aceptacion_terminos timestamptz;
alter table usuarios add column if not exists version_terminos          varchar(10);

do $$
begin
  -- La aceptación es un par indivisible: la fecha sin la versión no sirve
  -- como respaldo, porque no se sabría qué texto aceptó el vecino.
  if not exists (select 1 from pg_constraint where conname = 'ck_usuarios_terminos') then
    alter table usuarios add constraint ck_usuarios_terminos check (
      (fecha_aceptacion_terminos is null and version_terminos is null)
      or (fecha_aceptacion_terminos is not null and version_terminos is not null));
  end if;
end $$;

-- HU06 · Generalización de la tabla de tokens ------------------------------- --
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'tokens_recuperacion')
     and not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'tokens') then
    alter table tokens_recuperacion rename to tokens;
    alter table tokens rename constraint pk_tokens_recuperacion to pk_tokens;
    alter index  ix_tokens_usuario rename to ix_tokens_usuario_tipo;
  end if;
end $$;

alter table tokens add column if not exists tipo varchar(20) not null default 'recuperacion';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_tokens_tipo') then
    alter table tokens add constraint ck_tokens_tipo
      check (tipo in ('recuperacion', 'verificacion'));
  end if;
end $$;

create index if not exists ix_tokens_usuario_tipo on tokens (id_usuario, tipo);

alter table tokens enable row level security;

-- Las cuentas que ya existían antes de esta migración quedarían como «sin
-- verificar» y perderían el acceso de escritura de un día para el otro. Se
-- las da por verificadas: ya venían operando en la plataforma.
update usuarios set email_verificado = true where fecha_alta < now();
