-- =============================================================================
-- Barrio Watch — Modelo físico completo (PP2 + Sprint 1)
-- Motor: PostgreSQL (Supabase)
--
-- ATENCIÓN: este script es idempotente porque arranca ELIMINANDO las tablas.
-- Úsenlo para crear la base desde cero (desarrollo local, una base nueva).
-- Si ya tienen el modelo de PP2 cargado en Supabase y no quieren perder los
-- datos, ejecuten solamente migraciones/001_sprint1_autenticacion.sql.
-- =============================================================================

-- Bloque 0 — Limpieza previa (orden inverso al de dependencias) ---------------
drop table if exists tokens_recuperacion cascade;
drop table if exists reportes_moderacion cascade;
drop table if exists alertas cascade;
drop table if exists publicaciones cascade;
drop table if exists sesiones cascade;
drop table if exists usuarios cascade;
drop table if exists categorias cascade;
drop table if exists zonas cascade;
drop table if exists roles cascade;

-- Bloque 1 — Tablas maestras --------------------------------------------------
create table roles (
    id_rol      integer      generated always as identity,
    nombre      varchar(20)  not null,
    descripcion varchar(200),

    constraint pk_roles        primary key (id_rol),
    constraint uq_roles_nombre unique (nombre),
    constraint ck_roles_nombre check (nombre in ('vecino', 'moderador', 'administrador'))
);

create table zonas (
    id_zona     integer      generated always as identity,
    nombre      varchar(100) not null,
    descripcion varchar(255),
    activa      boolean      not null default true,

    constraint pk_zonas        primary key (id_zona),
    constraint uq_zonas_nombre unique (nombre),
    constraint ck_zonas_nombre check (length(trim(nombre)) > 0)
);

create table categorias (
    id_categoria integer     generated always as identity,
    nombre       varchar(50) not null,
    descripcion  varchar(200),

    constraint pk_categorias        primary key (id_categoria),
    constraint uq_categorias_nombre unique (nombre)
);

-- Bloque 2 — Tablas principales -----------------------------------------------
create table usuarios (
    id_usuario    integer      generated always as identity,
    nombre        varchar(100) not null,
    apellido      varchar(100) not null,
    email         varchar(150) not null,
    password_hash varchar(255) not null,
    telefono      varchar(30),
    id_rol        integer      not null,
    id_zona       integer      not null,
    estado        boolean      not null default true,
    fecha_alta    timestamptz  not null default now(),

    constraint pk_usuarios          primary key (id_usuario),
    constraint uq_usuarios_email    unique (email),
    constraint ck_usuarios_nombre   check (length(trim(nombre)) > 0),
    constraint ck_usuarios_apellido check (length(trim(apellido)) > 0),
    constraint ck_usuarios_email    check (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$'),
    constraint fk_usuarios_rol      foreign key (id_rol)
        references roles (id_rol) on update cascade on delete restrict,
    constraint fk_usuarios_zona     foreign key (id_zona)
        references zonas (id_zona) on update cascade on delete restrict
);

-- fecha_cierre se incorporó en el Sprint 1: permite invalidar el token al
-- cerrar sesión (CA 3.3) y al restablecer la contraseña (CA 5.5).
create table sesiones (
    id_sesion    bigint      generated always as identity,
    id_usuario   integer     not null,
    fecha_inicio timestamptz not null default now(),
    direccion_ip varchar(45),
    exitoso      boolean     not null default true,
    fecha_cierre timestamptz,

    constraint pk_sesiones         primary key (id_sesion),
    constraint fk_sesiones_usuario foreign key (id_usuario)
        references usuarios (id_usuario) on update cascade on delete cascade,
    constraint ck_sesiones_cierre  check (fecha_cierre is null or fecha_cierre >= fecha_inicio)
);

create table publicaciones (
    id_publicacion integer      generated always as identity,
    titulo         varchar(150) not null,
    descripcion    text         not null,
    id_usuario     integer      not null,
    id_categoria   integer      not null,
    id_zona        integer      not null,
    ubicacion      varchar(255),
    estado         varchar(20)  not null default 'publicada',
    fecha          timestamptz  not null default now(),

    constraint pk_publicaciones           primary key (id_publicacion),
    constraint ck_publicaciones_titulo    check (length(trim(titulo)) >= 5),
    constraint ck_publicaciones_estado    check (estado in ('publicada', 'oculta', 'eliminada')),
    constraint fk_publicaciones_usuario   foreign key (id_usuario)
        references usuarios (id_usuario) on update cascade on delete restrict,
    constraint fk_publicaciones_categoria foreign key (id_categoria)
        references categorias (id_categoria) on update cascade on delete restrict,
    constraint fk_publicaciones_zona      foreign key (id_zona)
        references zonas (id_zona) on update cascade on delete restrict
);

create table alertas (
    id_alerta      integer     generated always as identity,
    id_publicacion integer     not null,
    nivel_urgencia varchar(10) not null default 'media',
    verificada     boolean     not null default false,
    fecha_hecho    timestamptz not null default now(),

    constraint pk_alertas             primary key (id_alerta),
    constraint uq_alertas_publicacion unique (id_publicacion),
    constraint fk_alertas_publicacion foreign key (id_publicacion)
        references publicaciones (id_publicacion) on update cascade on delete cascade,
    constraint ck_alertas_nivel       check (nivel_urgencia in ('baja', 'media', 'alta', 'critica'))
);

create table reportes_moderacion (
    id_reporte         integer      generated always as identity,
    id_publicacion     integer      not null,
    id_usuario_reporta integer      not null,
    id_moderador       integer,
    motivo             varchar(255) not null,
    estado             varchar(20)  not null default 'pendiente',
    fecha_reporte      timestamptz  not null default now(),
    fecha_resolucion   timestamptz,

    constraint pk_reportes             primary key (id_reporte),
    constraint uq_reportes_denuncia    unique (id_publicacion, id_usuario_reporta),
    constraint ck_reportes_estado      check (estado in ('pendiente', 'aprobado', 'rechazado')),
    constraint ck_reportes_resolucion  check (
        (estado = 'pendiente' and fecha_resolucion is null) or
        (estado <> 'pendiente' and fecha_resolucion is not null)
    ),
    constraint fk_reportes_publicacion foreign key (id_publicacion)
        references publicaciones (id_publicacion) on update cascade on delete cascade,
    constraint fk_reportes_denunciante foreign key (id_usuario_reporta)
        references usuarios (id_usuario) on update cascade on delete restrict,
    constraint fk_reportes_moderador   foreign key (id_moderador)
        references usuarios (id_usuario) on update cascade on delete set null
);

-- Sprint 1 · HU05 — enlaces de recuperación de contraseña.
-- Se guarda el hash del token, nunca el token en sí.
create table tokens_recuperacion (
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

-- Bloque 3 — Índices de apoyo -------------------------------------------------
create index ix_usuarios_zona           on usuarios (id_zona);
create index ix_publicaciones_zona      on publicaciones (id_zona);
create index ix_publicaciones_categoria on publicaciones (id_categoria);
create index ix_publicaciones_usuario   on publicaciones (id_usuario);
create index ix_publicaciones_fecha     on publicaciones (fecha desc);
create index ix_reportes_estado         on reportes_moderacion (estado);
-- Sprint 1: el bloqueo por reintentos (HU04) recorre los accesos de una cuenta.
create index ix_sesiones_usuario_fecha  on sesiones (id_usuario, fecha_inicio desc);
create index ix_tokens_usuario          on tokens_recuperacion (id_usuario);

-- Seguridad en Supabase: la Data API (PostgREST) expone el esquema public con
-- la anon key. Activamos RLS sin políticas para que nadie pueda leer estas
-- tablas desde el navegador; el backend se conecta como postgres y no se ve
-- afectado.
alter table roles               enable row level security;
alter table zonas               enable row level security;
alter table categorias          enable row level security;
alter table usuarios            enable row level security;
alter table sesiones            enable row level security;
alter table publicaciones       enable row level security;
alter table alertas             enable row level security;
alter table reportes_moderacion enable row level security;
alter table tokens_recuperacion enable row level security;

-- Bloque 4 — Datos de prueba --------------------------------------------------
insert into roles (nombre, descripcion) values
  ('vecino',        'Habitante del barrio. Publica, consulta y reporta contenido de su zona.'),
  ('moderador',     'Vecino de confianza que revisa reportes y verifica alertas de su zona.'),
  ('administrador', 'Gestiona usuarios, roles, zonas y categorías de la plataforma.');

insert into zonas (nombre, descripcion) values
  ('Manzana 1', 'Sector norte del barrio'),
  ('Manzana 2', 'Sector sur del barrio'),
  ('Manzana 3', 'Sector este, frente a la plaza');

insert into categorias (nombre, descripcion) values
  ('Seguridad',   'Incidentes, robos, situaciones sospechosas y alertas.'),
  ('Servicios',   'Cortes de luz, agua, gas, recolección y reclamos al municipio.'),
  ('Eventos',     'Ferias, reuniones vecinales y actividades del barrio.'),
  ('Ayuda mutua', 'Pedidos y ofrecimientos de ayuda entre vecinos.');

-- Contraseña de todas las cuentas de prueba: Barrio2026
insert into usuarios (nombre, apellido, email, password_hash, telefono, id_rol, id_zona) values
  ('Lautaro', 'Laborda',    'lautaro@barriowatch.com', '$2b$10$tCNep4nOGFutbb.25Pn0X.fEgFcc.QOok4WlvTFTffCBuzMicW9NC', null, 3, 1),
  ('Lucas',   'Nozikovsky', 'lucas@barriowatch.com',   '$2b$10$tCNep4nOGFutbb.25Pn0X.fEgFcc.QOok4WlvTFTffCBuzMicW9NC', null, 2, 1),
  ('Juan',    'Rasjido',    'juan@barriowatch.com',    '$2b$10$tCNep4nOGFutbb.25Pn0X.fEgFcc.QOok4WlvTFTffCBuzMicW9NC', null, 1, 2),
  ('Marta',   'Quiroga',    'marta@barriowatch.com',   '$2b$10$tCNep4nOGFutbb.25Pn0X.fEgFcc.QOok4WlvTFTffCBuzMicW9NC', null, 1, 3);

insert into sesiones (id_usuario, fecha_inicio, direccion_ip, exitoso) values
  (1, now() - interval '2 days', '190.12.34.56', true),
  (3, now() - interval '1 day',  '181.45.67.89', false),
  (3, now() - interval '1 day' + interval '1 minute', '181.45.67.89', true);

insert into publicaciones (titulo, descripcion, id_usuario, id_categoria, id_zona, ubicacion, estado, fecha) values
  ('Auto dando vueltas de noche',
   'Un Gol gris sin patente pasó tres veces por la cuadra entre las 2 y las 3 de la mañana. Si alguien tiene cámara, avise.',
   2, 1, 1, 'Belgrano y Sarmiento', 'publicada', now() - interval '3 hours'),
  ('Corte de agua programado el jueves',
   'La cooperativa avisó que el jueves de 8 a 14 cortan el agua por arreglos en la red. Llenen baldes el miércoles.',
   1, 2, 1, 'Toda la manzana', 'publicada', now() - interval '1 day'),
  ('Feria de platos en la plaza',
   'El sábado a las 17 armamos feria de comidas caseras en la plaza. Traigan mesa y reposera.',
   4, 3, 3, 'Plaza San Martín', 'publicada', now() - interval '2 days'),
  ('Busco quien me ayude con las compras',
   'Me operaron la rodilla y por dos semanas no puedo cargar peso. Si alguien va al súper, le paso la lista.',
   3, 4, 2, 'Pasaje Los Olmos 145', 'publicada', now() - interval '5 hours'),
  ('Cuidado con el de la casa verde',
   'Seguro que el vecino de la casa verde es el que anda robando, tiene cara de chorro. Escrachémoslo.',
   3, 1, 2, 'Pasaje Los Olmos', 'oculta', now() - interval '4 days');

insert into alertas (id_publicacion, nivel_urgencia, verificada, fecha_hecho) values
  (1, 'alta',  true,  now() - interval '4 hours'),
  (5, 'media', false, now() - interval '4 days');

insert into reportes_moderacion (id_publicacion, id_usuario_reporta, id_moderador, motivo, estado, fecha_reporte, fecha_resolucion) values
  (5, 4, 2, 'Acusa a un vecino sin pruebas.', 'aprobado', now() - interval '4 days', now() - interval '3 days'),
  (2, 3, null, 'Creo que la fecha del corte está mal.', 'pendiente', now() - interval '6 hours', null);
