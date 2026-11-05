import { ErrorApi } from '../errores.js'
import { verificarToken } from '../services/sesiones.js'
import { buscarPorSesion, usuarioPublico } from '../services/usuarios.js'

const sesionInvalida = () =>
  new ErrorApi(401, 'SESION_INVALIDA', 'Tu sesión terminó. Iniciá sesión de nuevo.')

// Resuelve el usuario a partir del encabezado Authorization. Devuelve null
// cuando no hay token, cuando el token no es válido o cuando la sesión ya se
// cerró: quién decide qué hacer con eso es cada middleware de abajo.
async function resolverSesion(req) {
  const [tipo, token] = (req.get('authorization') ?? '').split(' ')
  if (tipo !== 'Bearer' || !token) return null

  let payload
  try {
    payload = verificarToken(token)
  } catch {
    return null
  }

  const idUsuario = Number(payload.sub)
  const idSesion = Number(payload.sid)
  if (!Number.isSafeInteger(idUsuario) || !Number.isSafeInteger(idSesion)) return null

  const fila = await buscarPorSesion(idUsuario, idSesion)
  if (!fila) return null

  return { usuario: usuarioPublico(fila), idSesion }
}

// Protege las rutas privadas: exige un JWT vigente cuya sesión siga abierta
// en la tabla sesiones (así el cierre de sesión lo invalida al instante).
export async function requiereSesion(req, _res, next) {
  const sesion = await resolverSesion(req)
  if (!sesion) return next(sesionInvalida())
  req.usuario = sesion.usuario
  req.idSesion = sesion.idSesion
  next()
}

// HU16 · CA 16.5: el listado de zonas lo usa tanto el formulario de registro,
// donde todavía no hay sesión, como el administrador ya identificado. Esta
// variante no rechaza a nadie: solo deja en req.usuario a quien se identificó,
// para que la propia ruta decida qué mostrarle.
export async function sesionOpcional(req, _res, next) {
  const sesion = await resolverSesion(req)
  if (sesion) {
    req.usuario = sesion.usuario
    req.idSesion = sesion.idSesion
  }
  next()
}

// HU19 · CA 19.2: la gestión del catálogo es exclusiva del administrador.
// Se aplica en el servidor, no solo escondiendo botones en la interfaz: un
// vecino que invoque el endpoint a mano recibe 403 y no se ejecuta nada.
export function requiereAdministrador(req, _res, next) {
  if (!req.usuario) return next(sesionInvalida())
  if (req.usuario.rol !== 'administrador') {
    return next(new ErrorApi(403, 'ACCESO_DENEGADO', 'Acceso denegado'))
  }
  next()
}

// HU06 · CA 6.4: mientras la cuenta no verifique su correo, el acceso es de
// solo lectura. Se reserva para los endpoints que crean contenido.
export function requiereEmailVerificado(req, _res, next) {
  if (!req.usuario) return next(sesionInvalida())
  if (!req.usuario.emailVerificado) {
    return next(
      new ErrorApi(
        403,
        'EMAIL_NO_VERIFICADO',
        'Verificá tu correo electrónico para poder publicar y reportar en el barrio.',
      ),
    )
  }
  next()
}
