import { Router } from 'express'
import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { MENSAJES, normalizarEmail, validarEmail, validarPassword } from '@barrio-watch/shared'
import { config } from '../config.js'
import { query, transaccion } from '../db.js'
import { ErrorApi } from '../errores.js'
import { requiereSesion } from '../middleware/autenticacion.js'
import {
  cerrarSesion,
  cerrarTodasLasSesiones,
  estadoBloqueo,
  firmarToken,
  registrarAcceso,
} from '../services/sesiones.js'
import { buscarPorEmail, usuarioPublico } from '../services/usuarios.js'
import { COSTO_BCRYPT } from './usuarios.js'

// Hash de una contraseña cualquiera: se compara contra él cuando el correo no
// existe, para que la respuesta tarde lo mismo y no delate qué cuentas hay.
const HASH_FICTICIO = bcrypt.hashSync('barrio-watch-ficticio', COSTO_BCRYPT)

const MENSAJE_CREDENCIALES = 'El correo o la contraseña son incorrectos'
const MENSAJE_RECUPERACION = 'Si el correo está registrado, te enviamos un enlace de recuperación'

const credencialesInvalidas = () => new ErrorApi(401, 'CREDENCIALES_INVALIDAS', MENSAJE_CREDENCIALES)

const cuentaBloqueada = (bloqueadaHasta) =>
  new ErrorApi(
    423,
    'CUENTA_BLOQUEADA',
    `Por seguridad bloqueamos el acceso durante ${config.minutosBloqueo} minutos después de ${config.intentosMaximos} intentos fallidos.`,
    { bloqueadaHasta: bloqueadaHasta.toISOString() },
  )

const hashToken = (token) => createHash('sha256').update(token).digest('hex')

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
      const token = randomBytes(32).toString('base64url')
      await query(
        `insert into tokens_recuperacion (id_usuario, token_hash, fecha_expiracion)
         values ($1, $2, now() + make_interval(mins => $3))`,
        [usuario.id_usuario, hashToken(token), config.minutosVigenciaEnlace],
      )
      const enlace = `${config.frontendUrl}/restablecer?token=${token}`
      // No se espera el envío: así la respuesta tarda lo mismo exista o no la cuenta.
      correo
        .enviarRecuperacion({ email: usuario.email, nombre: usuario.nombre, enlace })
        .catch((e) => console.error('[correo] No se pudo enviar el enlace de recuperación:', e))
    }

    // Mismo mensaje exista o no la cuenta, para no revelar qué correos están registrados.
    res.json({ mensaje: MENSAJE_RECUPERACION })
  })

  async function buscarToken(ejecutor, token, bloquear = false) {
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null
    const { rows } = await ejecutor.query(
      `select t.id_token, t.id_usuario, t.usado, t.fecha_expiracion <= now() as vencido, u.nombre
         from tokens_recuperacion t
         join usuarios u on u.id_usuario = t.id_usuario
        where t.token_hash = $1
        ${bloquear ? 'for update of t' : ''}`,
      [hashToken(token)],
    )
    return rows[0] ?? null
  }

  // CA 5.4: el enlace vencido, usado o inválido se rechaza explicando el motivo.
  function comprobarToken(fila) {
    if (!fila) {
      throw new ErrorApi(400, 'ENLACE_INVALIDO', 'Este enlace no es válido. Revisá que lo hayas copiado completo o pedí uno nuevo.')
    }
    if (fila.usado) {
      throw new ErrorApi(410, 'ENLACE_USADO', 'Este enlace ya fue utilizado. Cada enlace sirve para una sola vez.')
    }
    if (fila.vencido) {
      throw new ErrorApi(410, 'ENLACE_VENCIDO', `Este enlace venció. Los enlaces valen ${config.minutosVigenciaEnlace} minutos desde que los pedís.`)
    }
  }

  router.post('/restablecer/verificar', async (req, res) => {
    const fila = await buscarToken({ query }, req.body?.token)
    comprobarToken(fila)
    res.json({ valido: true, nombre: fila.nombre })
  })

  // HU05 · CA 5.3 y 5.5: definir la nueva contraseña
  router.post('/restablecer', async (req, res) => {
    const error = validarPassword(req.body?.password)
    if (error) throw new ErrorApi(400, 'DATOS_INVALIDOS', error, { campos: { password: error } })

    const passwordHash = await bcrypt.hash(req.body.password, COSTO_BCRYPT)

    await transaccion(async (cliente) => {
      const fila = await buscarToken(cliente, req.body?.token, true)
      comprobarToken(fila)

      await cliente.query('update usuarios set password_hash = $1 where id_usuario = $2', [passwordHash, fila.id_usuario])
      // Se consume este enlace y cualquier otro pendiente de la misma cuenta.
      await cliente.query('update tokens_recuperacion set usado = true where id_usuario = $1 and not usado', [fila.id_usuario])
      await cerrarTodasLasSesiones(cliente, fila.id_usuario)
    })

    res.json({ mensaje: 'Tu contraseña fue actualizada. Ya podés iniciar sesión con la nueva.' })
  })

  return router
}
