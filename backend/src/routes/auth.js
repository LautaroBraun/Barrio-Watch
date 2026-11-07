import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { MENSAJES, normalizarEmail, validarEmail, validarPassword } from '@barrio-watch/shared'
import { config } from '../config.js'
import { query, transaccion } from '../db.js'
import { ErrorApi } from '../errores.js'
import { requiereSesion, sesionOpcional } from '../middleware/autenticacion.js'
import {
  cerrarSesion,
  cerrarTodasLasSesiones,
  estadoBloqueo,
  firmarToken,
  registrarAcceso,
} from '../services/sesiones.js'
import {
  TIPOS,
  buscarToken,
  comprobarToken,
  crearToken,
  minutosDesdeUltimoToken,
} from '../services/tokens.js'
import { enSegundoPlano } from '../services/segundoPlano.js'
import { buscarPorEmail, buscarPorId, marcarEmailVerificado, usuarioPublico } from '../services/usuarios.js'
import { enviarEnlaceVerificacion } from '../services/verificacion.js'
import { COSTO_BCRYPT } from './usuarios.js'

// Hash de una contraseña cualquiera: se compara contra él cuando el correo no
// existe, para que la respuesta tarde lo mismo y no delate qué cuentas hay.
const HASH_FICTICIO = bcrypt.hashSync('barrio-watch-ficticio', COSTO_BCRYPT)

const MENSAJE_CREDENCIALES = 'El correo o la contraseña son incorrectos'
const MENSAJE_RECUPERACION = 'Si el correo está registrado, te enviamos un enlace de recuperación'
const MENSAJE_VERIFICACION = 'Si la cuenta existe y todavía no está confirmada, te enviamos un enlace nuevo'

const credencialesInvalidas = () => new ErrorApi(401, 'CREDENCIALES_INVALIDAS', MENSAJE_CREDENCIALES)

const cuentaBloqueada = (bloqueadaHasta) =>
  new ErrorApi(
    423,
    'CUENTA_BLOQUEADA',
    `Por seguridad bloqueamos el acceso durante ${config.minutosBloqueo} minutos después de ${config.intentosMaximos} intentos fallidos.`,
    { bloqueadaHasta: bloqueadaHasta.toISOString() },
  )

const VIGENCIA_RECUPERACION = () => `${config.minutosVigenciaEnlace} minutos`
const VIGENCIA_VERIFICACION = () => `${config.horasVigenciaVerificacion} horas`

export function crearRutasAuth({ correo }) {
  const router = Router()

  // HU03 · Inicio de sesión + HU04 · Verificación de credenciales
  router.post('/login', async (req, res) => {
    const email = normalizarEmail(req.body?.email)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''

    if (!email || !password) {
      const campos = {}
      if (!email) campos.email = MENSAJES.obligatorio
      if (!password) campos.password = MENSAJES.obligatorio
      throw new ErrorApi(400, 'DATOS_INVALIDOS', 'Completá tu correo y tu contraseña', { campos })
    }

    const usuario = await buscarPorEmail(email)
    if (!usuario) {
      await bcrypt.compare(password, HASH_FICTICIO)
      throw credencialesInvalidas()
    }

    // CA 4.3: con la cuenta bloqueada ni siquiera se procesan las credenciales.
    const bloqueo = await estadoBloqueo(usuario.id_usuario)
    if (bloqueo.bloqueadaHasta) throw cuentaBloqueada(bloqueo.bloqueadaHasta)

    const coincide = await bcrypt.compare(password, usuario.password_hash)
    if (!coincide) {
      // CA 4.2: el intento rechazado queda auditado con exitoso = false.
      await registrarAcceso(usuario.id_usuario, req.ip, false)
      const despues = await estadoBloqueo(usuario.id_usuario)
      if (despues.bloqueadaHasta) throw cuentaBloqueada(despues.bloqueadaHasta)
      throw credencialesInvalidas()
    }

    // CA 4.4: la cuenta dada de baja no entra aunque la contraseña sea correcta.
    if (!usuario.estado) {
      await registrarAcceso(usuario.id_usuario, req.ip, false)
      throw new ErrorApi(403, 'CUENTA_INHABILITADA', 'Esta cuenta no está habilitada. Contactá a un administrador')
    }

    // CA 3.4: el acceso exitoso queda registrado con fecha, IP y exitoso = true.
    const idSesion = await registrarAcceso(usuario.id_usuario, req.ip, true)
    const token = firmarToken(usuario.id_usuario, idSesion)
    const expiraEn = new Date(Date.now() + config.duracionSesionHoras * 3_600_000)

    res.json({ token, expiraEn: expiraEn.toISOString(), usuario: usuarioPublico(usuario) })
  })

  // CA 3.2: el frontend recupera la sesión al recargar la página.
  router.get('/sesion', requiereSesion, (req, res) => {
    res.json({ usuario: req.usuario })
  })

  // CA 3.3: cerrar sesión invalida el token de inmediato.
  router.post('/logout', requiereSesion, async (req, res) => {
    await cerrarSesion(req.idSesion)
    res.status(204).end()
  })

  // HU05 · CA 5.1 y 5.2: pedir el enlace de recuperación
  router.post('/recuperar', async (req, res) => {
    const error = validarEmail(req.body?.email)
    if (error) throw new ErrorApi(400, 'DATOS_INVALIDOS', error, { campos: { email: error } })

    const usuario = await buscarPorEmail(normalizarEmail(req.body.email))
    if (usuario?.estado) {
      const token = await crearToken({
        idUsuario: usuario.id_usuario,
        tipo: TIPOS.RECUPERACION,
        minutosVigencia: config.minutosVigenciaEnlace,
      })
      const enlace = `${config.frontendUrl}/restablecer?token=${token}`
      // Acá el envío no se espera a propósito: si la respuesta tardara solo
      // cuando la cuenta existe, el tiempo delataría qué correos están
      // registrados. enSegundoPlano mantiene viva la función serverless hasta
      // que el correo salga, sin demorar la respuesta.
      enSegundoPlano(
        correo
          .enviarRecuperacion({ email: usuario.email, nombre: usuario.nombre, enlace })
          .catch((e) => console.error('[correo] No se pudo enviar el enlace de recuperación:', e)),
      )
    }

    // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
    res.json({ mensaje: MENSAJE_RECUPERACION })
  })

  router.post('/restablecer/verificar', async (req, res) => {
    const fila = await buscarToken({ query }, req.body?.token, TIPOS.RECUPERACION)
    comprobarToken(fila, { vigenciaTexto: VIGENCIA_RECUPERACION() })
    res.json({ valido: true, nombre: fila.nombre })
  })

  // HU05 · CA 5.3 y 5.5: definir la nueva contraseña
  router.post('/restablecer', async (req, res) => {
    const error = validarPassword(req.body?.password)
    if (error) throw new ErrorApi(400, 'DATOS_INVALIDOS', error, { campos: { password: error } })

    const passwordHash = await bcrypt.hash(req.body.password, COSTO_BCRYPT)

    await transaccion(async (cliente) => {
      const fila = await buscarToken(cliente, req.body?.token, TIPOS.RECUPERACION, true)
      comprobarToken(fila, { vigenciaTexto: VIGENCIA_RECUPERACION() })

      await cliente.query('update usuarios set password_hash = $1 where id_usuario = $2', [passwordHash, fila.id_usuario])
      // Se consume este enlace y cualquier otro pendiente de la misma cuenta.
      await cliente.query(
        `update tokens set usado = true
          where id_usuario = $1 and tipo = $2 and not usado`,
        [fila.id_usuario, TIPOS.RECUPERACION],
      )
      await cerrarTodasLasSesiones(cliente, fila.id_usuario)
    })

    res.json({ mensaje: 'Tu contraseña fue actualizada. Ya podés iniciar sesión con la nueva.' })
  })

  // HU06 · CA 6.2 y 6.3 — confirmar el correo desde el enlace
  router.post('/verificar', async (req, res) => {
    const resultado = await transaccion(async (cliente) => {
      const fila = await buscarToken(cliente, req.body?.token, TIPOS.VERIFICACION, true)

      // Un enlace ya usado sobre una cuenta que efectivamente quedó verificada
      // no es un error para quien lo abre dos veces: ya está, está confirmada.
      if (fila?.usado && fila.email_verificado) return { yaEstaba: true, nombre: fila.nombre }

      comprobarToken(fila, { vigenciaTexto: VIGENCIA_VERIFICACION() })

      await marcarEmailVerificado(cliente, fila.id_usuario)
      // Se consume este enlace y cualquier otro de verificación pendiente.
      await cliente.query(
        `update tokens set usado = true
          where id_usuario = $1 and tipo = $2 and not usado`,
        [fila.id_usuario, TIPOS.VERIFICACION],
      )
      return { yaEstaba: false, nombre: fila.nombre }
    })

    res.json({
      verificado: true,
      nombre: resultado.nombre,
      mensaje: resultado.yaEstaba
        ? 'Tu correo ya estaba confirmado. Podés iniciar sesión cuando quieras.'
        : '¡Listo! Confirmamos tu correo. Ya podés publicar y reportar en tu zona.',
    })
  })

  // HU06 · CA 6.3 y 6.5 — reenviar el enlace de verificación
  router.post('/reenviar-verificacion', sesionOpcional, async (req, res) => {
    // Sirve con la sesión abierta (el aviso persistente de CA 6.4) y también
    // desde la pantalla de «revisá tu correo», donde todavía no hay sesión.
    const usuario = req.usuario
      ? await buscarPorId(req.usuario.id)
      : await buscarPorEmail(normalizarEmail(req.body?.email))

    if (!usuario || !usuario.estado || usuario.email_verificado) {
      // Mismo mensaje exista o no la cuenta, para no revelar qué correos
      // están registrados ni cuáles ya verificaron.
      return res.json({ mensaje: MENSAJE_VERIFICACION })
    }

    const { enviado, minutosRestantes } = await enviarEnlaceVerificacion({ usuario, correo })
    if (!enviado) {
      throw new ErrorApi(
        429,
        'REENVIO_DEMASIADO_PRONTO',
        `Ya te mandamos un correo hace un momento. Probá de nuevo en ${minutosRestantes} ${minutosRestantes === 1 ? 'minuto' : 'minutos'}.`,
        { minutosRestantes },
      )
    }

    res.json({ mensaje: MENSAJE_VERIFICACION })
  })

  return router
}
