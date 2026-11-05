import { query } from '../db.js'

// Columnas que se devuelven siempre. El conteo de uso y la auditoría se piden
// aparte porque solo los necesita el administrador (HU17, HU19).
const SELECT_ZONA = `
  select z.id_zona as id, z.codigo, z.nombre, z.descripcion, z.orden, z.activa,
         z.fecha_creacion, z.fecha_modificacion,
         m.nombre as modifica_nombre, m.apellido as modifica_apellido
    from zonas z
    left join usuarios m on m.id_usuario = z.id_usuario_modifica`

function aZona(fila) {
  return {
    id: fila.id,
    codigo: fila.codigo,
    nombre: fila.nombre,
    descripcion: fila.descripcion,
    orden: fila.orden,
    activa: fila.activa,
    fechaCreacion: fila.fecha_creacion,
    // HU19 · CA 19.4: cuándo fue el último cambio y quién lo hizo.
    ultimaModificacion: fila.fecha_modificacion
      ? {
          fecha: fila.fecha_modificacion,
          autor: fila.modifica_nombre ? `${fila.modifica_nombre} ${fila.modifica_apellido}` : null,
        }
      : null,
  }
}

// HU16 · CA 16.1 a 16.5. El orden es siempre por el campo «orden» y el nombre
// desempata; nunca alfabético puro, para que «Manzana 10» no caiga antes que
// «Manzana 2». Quien no es administrador solo ve las zonas activas.
export async function listarZonas({ busqueda = '', estado = 'todas', soloActivas = false } = {}) {
  const condiciones = []
  const valores = []

  if (soloActivas || estado === 'activas') condiciones.push('z.activa')
  else if (estado === 'inactivas') condiciones.push('not z.activa')

  const texto = busqueda.trim()
  if (texto) {
    valores.push(`%${texto}%`)
    condiciones.push(`(z.codigo ilike $${valores.length} or z.nombre ilike $${valores.length})`)
  }

  const { rows } = await query(
    `${SELECT_ZONA}
     ${condiciones.length ? `where ${condiciones.join(' and ')}` : ''}
     order by z.orden, z.nombre`,
    valores,
  )
  return rows.map(aZona)
}

export async function obtenerZona(id) {
  const { rows } = await query(`${SELECT_ZONA} where z.id_zona = $1`, [id])
  return rows[0] ? aZona(rows[0]) : null
}

// HU17 · CA 17.1 y HU15 · CA 15.1: cuántos registros dependen de la zona.
// Es el dato que convierte una confirmación genérica en una decisión
// informada, y la razón por la que la baja es lógica y no física.
export async function usoDeZona(id) {
  const { rows } = await query(
    `select (select count(*) from usuarios where id_zona = $1)                      as vecinos,
            (select count(*) from publicaciones where id_zona = $1)                 as publicaciones,
            (select count(*) from alertas a
               join publicaciones p on p.id_publicacion = a.id_publicacion
              where p.id_zona = $1)                                                 as alertas`,
    [id],
  )
  return {
    vecinos: Number(rows[0].vecinos),
    publicaciones: Number(rows[0].publicaciones),
    alertas: Number(rows[0].alertas),
  }
}

// HU13 · CA 13.1 y 13.3: nace activa y con la fecha de creación del momento.
export async function crearZona({ codigo, nombre, descripcion, orden, activa = true }) {
  const { rows } = await query(
    `insert into zonas (codigo, nombre, descripcion, orden, activa)
     values ($1, $2, $3, $4, $5)
     returning id_zona`,
    [codigo, nombre, descripcion, orden, activa],
  )
  return rows[0].id_zona
}

// HU14 · CA 14.1 y 14.3. El código no está en la lista a propósito: es
// inmutable (CA 14.2). HU19 · CA 19.3: cada cambio sella la auditoría.
export async function actualizarZona(id, { nombre, descripcion, orden }, idAdministrador) {
  const { rowCount } = await query(
    `update zonas
        set nombre = $2, descripcion = $3, orden = $4,
            fecha_modificacion = now(), id_usuario_modifica = $5
      where id_zona = $1`,
    [id, nombre, descripcion, orden, idAdministrador],
  )
  return rowCount > 0
}

// HU15 · CA 15.2 y 15.4: la baja es lógica. El registro no se borra nunca,
// así que los vecinos y las publicaciones de esa zona quedan intactos.
export async function cambiarEstadoZona(id, activa, idAdministrador) {
  const { rowCount } = await query(
    `update zonas
        set activa = $2, fecha_modificacion = now(), id_usuario_modifica = $3
      where id_zona = $1`,
    [id, activa, idAdministrador],
  )
  return rowCount > 0
}

// Para dar un mensaje útil cuando el nombre choca: saber si la zona que lo
// ocupa está activa o inactiva le dice al administrador si conviene
// reactivarla en lugar de crear una nueva.
export async function zonaPorNombre(nombre, idExcluido = null) {
  const { rows } = await query(
    `select id_zona as id, codigo, nombre, activa
       from zonas
      where lower(nombre) = lower($1)
        and ($2::int is null or id_zona <> $2)
      limit 1`,
    [nombre, idExcluido],
  )
  return rows[0] ?? null
}

export async function zonaPorCodigo(codigo) {
  const { rows } = await query(
    'select id_zona as id, codigo, nombre, activa from zonas where codigo = $1 limit 1',
    [codigo],
  )
  return rows[0] ?? null
}
