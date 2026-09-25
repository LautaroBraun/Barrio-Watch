import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { query } from '../db.js'

export async function registrarAcceso(idUsuario, ip, exitoso) {
  const { rows } = await query(
    `insert into sesiones (id_usuario, direccion_ip, exitoso)
     values ($1, $2, $3)
     returning id_sesion`,
    [idUsuario, ip?.slice(0, 45) ?? null, exitoso],
  )
  return rows[0].id_sesion
}

// HU04 · Política de bloqueo: cinco intentos fallidos consecutivos bloquean la
// cuenta durante 15 minutos. El contador se reinicia con cada acceso exitoso
// (y también al restablecer la contraseña, que prueba que la persona es dueña
// del correo). Mientras dura el bloqueo las credenciales no se procesan, así
// que esos intentos no se registran y no alargan el bloqueo.
export async function estadoBloqueo(idUsuario) {
  const { rows } = await query(
    `select fecha_inicio, now() as ahora
       from sesiones
      where id_usuario = $1
        and not exitoso
        and fecha_inicio > greatest(
              coalesce((select max(fecha_inicio) from sesiones
                         where id_usuario = $1 and exitoso), '-infinity'),
              coalesce((select max(fecha_creacion) from tokens_recuperacion
                         where id_usuario = $1 and usado), '-infinity'))
      order by fecha_inicio desc
      limit 200`,
    [idUsuario],
  )
  if (rows.length === 0) return { bloqueadaHasta: null, fallidosSeguidos: 0 }

  const ahora = rows[0].ahora
  const duracion = config.minutosBloqueo * 60_000
  let fallidos = 0
  let bloqueadaHasta = null

  // Se recorre en orden cronológico: cada tanda de 5 fallos abre un bloqueo;
  // el primer fallo posterior a que el bloqueo vence arranca una tanda nueva.
  for (const { fecha_inicio: fecha } of rows.reverse()) {
    if (bloqueadaHasta && fecha >= bloqueadaHasta) {
      fallidos = 0
      bloqueadaHasta = null
    }
    fallidos += 1
    if (fallidos === config.intentosMaximos) {
      bloqueadaHasta = new Date(fecha.getTime() + duracion)
    }
  }

  if (bloqueadaHasta && ahora >= bloqueadaHasta) {
    return { bloqueadaHasta: null, fallidosSeguidos: 0 }
  }
  return { bloqueadaHasta, fallidosSeguidos: fallidos }
}

export function firmarToken(idUsuario, idSesion) {
  return jwt.sign({ sid: String(idSesion) }, config.jwtSecret, {
    subject: String(idUsuario),
    expiresIn: `${config.duracionSesionHoras}h`,
    algorithm: 'HS256',
  })
}

export function verificarToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] })
}

export async function cerrarSesion(idSesion) {
  await query(
    `update sesiones set fecha_cierre = now()
      where id_sesion = $1 and fecha_cierre is null`,
    [idSesion],
  )
}

// HU05 · CA 5.5: tras cambiar la contraseña se cierran las sesiones abiertas
// de la cuenta en todos los dispositivos.
export async function cerrarTodasLasSesiones(cliente, idUsuario) {
  await cliente.query(
    `update sesiones set fecha_cierre = now()
      where id_usuario = $1 and exitoso and fecha_cierre is null`,
    [idUsuario],
  )
}
