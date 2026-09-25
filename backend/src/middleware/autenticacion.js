import { ErrorApi } from '../errores.js'
import { verificarToken } from '../services/sesiones.js'
import { buscarPorSesion, usuarioPublico } from '../services/usuarios.js'

const sesionInvalida = () =>
  new ErrorApi(401, 'SESION_INVALIDA', 'Tu sesión terminó. Iniciá sesión de nuevo.')

// Protege las rutas privadas: exige un JWT vigente cuya sesión siga abierta
// en la tabla sesiones (así el cierre de sesión lo invalida al instante).
export async function requiereSesion(req, _res, next) {
  const [tipo, token] = (req.get('authorization') ?? '').split(' ')
  if (tipo !== 'Bearer' || !token) return next(sesionInvalida())

  let payload
  try {
    payload = verificarToken(token)
  } catch {
    return next(sesionInvalida())
  }

  const idUsuario = Number(payload.sub)
  const idSesion = Number(payload.sid)
  if (!Number.isSafeInteger(idUsuario) || !Number.isSafeInteger(idSesion)) return next(sesionInvalida())

  const fila = await buscarPorSesion(idUsuario, idSesion)
  if (!fila) return next(sesionInvalida())

  req.usuario = usuarioPublico(fila)
  req.idSesion = idSesion
  next()
}
