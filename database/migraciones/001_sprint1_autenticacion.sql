-- =============================================================================
-- Migración Sprint 1 — Inicio de sesión (HU01 a HU05)
--
-- Para aplicar sobre la base de PP2 que ya está cargada en Supabase, sin
-- borrar datos. Se puede ejecutar más de una vez.
-- =============================================================================

-- HU03 (CA 3.3) y HU05 (CA 5.5): el token JWT lleva el id de la sesión.
-- Cerrar sesión o restablecer la contraseña completa fecha_cierre y el token
-- deja de ser aceptado al instante, aunque todavía no haya vencido.
alter table sesiones add column if not exists fecha_cierre timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ck_sesiones_cierre') then
    alter table sesiones add constraint ck_sesiones_cierre
      check (fecha_cierre is null or fecha_cierre >= fecha_inicio);
  end if;
end $$;

-- HU04: el bloqueo por reintentos recorre los accesos recientes de una cuenta.
create index if not exists ix_sesiones_usuario_fecha on sesiones (id_usuario, fecha_inicio desc);

-- HU05: enlaces de recuperación de contraseña (se guarda solo el hash).
create table if not exists tokens_recuperacion (
    id_token         bigint       generated always as identity,
    id_usuario       integer      not null,
    token_hash       varchar(255) not null,
    fecha_creacion   timestamptz  not null default now(),
    fecha_expiracion timestamptz  not null,
    usado            boolean      not null default false,

    constraint pk_tokens_recuperacion primary key (id_token),
    constraint uq_tokens_hash         unique (token_hash),
    constraint fk_tokens_usuario      foreign key (id_usuario)
        references usuarios (id_usuario) on update cascade on delete cascade,
    constraint ck_tokens_expiracion   check (fecha_expiracion > fecha_creacion)
);

create index if not exists ix_tokens_usuario on tokens_recuperacion (id_usuario);

-- Seguridad en Supabase: sin RLS, cualquiera con la anon key podría leer
-- usuarios.password_hash a través de la Data API. Con RLS activo y sin
-- políticas, solo el backend (que se conecta como postgres) accede.
alter table roles               enable row level security;
alter table zonas               enable row level security;
alter table categorias          enable row level security;
alter table usuarios            enable row level security;
alter table sesiones            enable row level security;
alter table publicaciones       enable row level security;
alter table alertas             enable row level security;
alter table reportes_moderacion enable row level security;
alter table tokens_recuperacion enable row level security;
