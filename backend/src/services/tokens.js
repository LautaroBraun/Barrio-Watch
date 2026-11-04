import { createHash, randomBytes } from 'node:crypto'
import { query } from '../db.js'
import { ErrorApi } from '../errores.js'

// Del token solo se guarda el hash: si alguien leyera la tabla, no podría
// armar el enlace. Vale tanto para recuperar la contraseña (HU05) como para
// verificar el correo (HU06).
export const hashToken = (token) => createHash('sha256').update(token).digest('hex')

export const TIPOS = { RECUPERACION: 'recuperacion', VERIFICACION: 'verificacion' }

export async function crearToken({ idUsuario, tipo, minutosVigencia }) {
  const token = randomBytes(32).toString('base64url')
  await query(
    `insert into tokens (id_usuario, tipo, token_hash, fecha_expiracion)
     values ($1, $2, $3, now() + make_interval(mins => $4))`,
    [idUsuario, tipo, hashToken(token), minutosVigencia],
  )
  return token
}

// Minutos transcurridos desde el último token de ese tipo que se le emitió a
// la cuenta. Null si nunca se emitió ninguno. HU06 · CA 6.5 lo usa para no
// mandar un correo nuevo si el anterior salió hace menos de cinco minutos.
export async function minutosDesdeUltimoToken(idUsuario, tipo) {
  const { rows } = await query(
    `select extract(epoch from (now() - max(fecha_creacion))) / 60 as minutos
       from tokens
      where id_usuario = $1 and tipo = $2`,
    [idUsuario, tipo],
  )
  const minutos = rows[0]?.minutos
  return minutos === null || minutos === undefined ? null : Number(minutos)
}

export async function buscarToken(ejecutor, token, tipo, bloquear = false) {
  if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null
  const { rows } = await ejecutor.query(
    `select t.id_token, t.id_usuario, t.usado, t.fecha_expiracion <= now() as vencido,
            u.nombre, u.email, u.email_verificado
       from tokens t
       join usuarios u on u.id_usuario = t.id_usuario
      where t.token_hash = $1
        and t.tipo = $2
      ${bloquear ? 'for update of t' : ''}`,
    [hashToken(token), tipo],
  )
  return rows[0] ?? null
}

// HU05 · CA 5.4 y HU06 · CA 6.3: el enlace inválido, usado o vencido se
// rechaza explicando cuál de las tres cosas pasó, no con un error genérico.
export function comprobarToken(fila, { vigenciaTexto }) {
  if (!fila) {
    throw new ErrorApi(
      400,
      'ENLACE_INVALIDO',
      'Este enlace no es válido. Revisá que lo hayas copiado completo o pedí uno nuevo.',
    )
  }
  if (fila.usado) {
    throw new ErrorApi(410, 'ENLACE_USADO', 'Este enlace ya fue utilizado. Cada enlace sirve para una sola vez.')
  }
  if (fila.vencido) {
    throw new ErrorApi(410, 'ENLACE_VENCIDO', `Este enlace venció. Los enlaces valen ${vigenciaTexto} desde que se emiten.`)
  }
}
