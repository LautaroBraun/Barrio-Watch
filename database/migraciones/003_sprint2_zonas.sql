-- =============================================================================
-- Migración Sprint 2 — Gestión de la entidad de soporte «zonas» (HU13 a HU19)
--
-- Agrega a la tabla zonas el código único, el orden de visualización y los
-- campos de auditoría. Se aplica sobre la base ya cargada, sin borrar datos,
-- y se puede ejecutar más de una vez.
--
-- El paso delicado es «codigo»: es obligatorio y único, pero la tabla ya tiene
-- filas. Por eso va en tres tiempos (agregar nulo → completar → exigir),
-- que es el único orden en que PostgreSQL acepta la operación.
-- =============================================================================

-- Paso 1 — Las columnas nuevas nacen admitiendo nulos ------------------------
alter table zonas add column if not exists codigo              varchar(10);
alter table zonas add column if not exists orden               integer     not null default 0;
alter table zonas add column if not exists fecha_creacion      timestamptz not null default now();
alter table zonas add column if not exists fecha_modificacion  timestamptz;
alter table zonas add column if not exists id_usuario_modifica integer;

-- Paso 2 — Se completan las filas existentes ---------------------------------
-- A cada zona ya cargada se le arma un código a partir de su id (MZ-01, MZ-02)
-- y se le da un orden inicial que respeta la secuencia de alta.
update zonas set codigo = 'MZ-' || lpad(id_zona::text, 2, '0') where codigo is null;
update zonas set orden  = id_zona where orden = 0;

-- Paso 3 — Recién ahora se puede exigir el valor y declarar las restricciones -
alter table zonas alter column codigo set not null;

do $$
begin
  -- HU18 · CA 18.1: el código sigue el formato MZ-05 y no se repite.
  if not exists (select 1 from pg_constraint where conname = 'uq_zonas_codigo') then
    alter table zonas add constraint uq_zonas_codigo unique (codigo);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'ck_zonas_codigo_formato') then
    alter table zonas add constraint ck_zonas_codigo_formato
      check (codigo ~ '^[A-Z]{2}-[0-9]{2,3}$');
  end if;
  -- HU18 · CA 18.3: el orden de visualización no admite negativos.
  if not exists (select 1 from pg_constraint where conname = 'ck_zonas_orden') then
    alter table zonas add constraint ck_zonas_orden check (orden >= 0);
  end if;
  -- HU19 · CA 19.3: queda registrado quién hizo el último cambio. Si esa
  -- cuenta se elimina, la zona sobrevive con el autor en nulo.
  if not exists (select 1 from pg_constraint where conname = 'fk_zonas_usuario_modifica') then
    alter table zonas add constraint fk_zonas_usuario_modifica
      foreign key (id_usuario_modifica) references usuarios (id_usuario)
      on update cascade on delete set null;
  end if;
  -- La auditoría es un par: o están los dos campos, o no está ninguno.
  if not exists (select 1 from pg_constraint where conname = 'ck_zonas_auditoria') then
    alter table zonas add constraint ck_zonas_auditoria check (
      (fecha_modificacion is null and id_usuario_modifica is null)
      or fecha_modificacion is not null);
  end if;
end $$;

-- HU16 · CA 16.1: el listado se ordena por «orden», no alfabéticamente.
create index if not exists ix_zonas_orden on zonas (orden, nombre);
