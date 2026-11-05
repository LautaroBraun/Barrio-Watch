import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { MENSAJES, VERSION_TERMINOS, normalizarEmail, validarRegistro } from '@barrio-watch/shared'
import { query } from '../db.js'
import { ErrorApi } from '../errores.js'
import { enviarEnlaceVerificacion } from '../services/verificacion.js'

export const COSTO_BCRYPT = 10

export function crearRutasUsuarios({ correo }) {
  const router = Router()

  // HU01 · Registro de usuario (con las validaciones de HU02 del lado
  // servidor, el teléfono opcional de HU08 y la aceptación de HU07)
  router.post('/registro', async (req, res) => {
    const datos = req.body ?? {}

    const campos = validarRegistro(datos)
    if (Object.keys(campos).length > 0) {
      throw new ErrorApi(400, 'DATOS_INVALIDOS', 'Revisá los datos marcados', { campos })
    }

    const idZona = Number(datos.idZona)
    const zona = await query('select 1 from zonas where id_zona = $1 and activa', [idZona])
    if (zona.rowCount === 0) {
      throw new ErrorApi(400, 'DATOS_INVALIDOS', 'Revisá los datos marcados', {
        campos: { idZona: MENSAJES.zonaInvalida },
      })
    }

    const passwordHash = await bcrypt.hash(datos.password, COSTO_BCRYPT)
    const telefono = String(datos.telefono ?? '').trim() || null

    let usuario
    try {
      // HU07 · CA 7.2: se persiste la fecha de la aceptación y la versión del
      // texto aceptado. La restricción ck_usuarios_terminos garantiza que
      // nunca quede uno de los dos datos sin el otro.
      const { rows } = await query(
        `insert into usuarios
           (nombre, apellido, email, password_hash, telefono, id_rol, id_zona,
            fecha_aceptacion_terminos, version_terminos)
         values ($1, $2, $3, $4, $5,
                 (select id_rol from roles where nombre = 'vecino'), $6,
                 now(), $7)
         returning id_usuario, nombre, apellido, email`,
        [
          datos.nombre.trim(),
          datos.apellido.trim(),
          normalizarEmail(datos.email),
          passwordHash,
          telefono,
          idZona,
          VERSION_TERMINOS,
        ],
      )
      usuario = rows[0]
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'uq_usuarios_email') {
        throw new ErrorApi(409, 'EMAIL_DUPLICADO', MENSAJES.emailDuplicado, {
          campos: { email: MENSAJES.emailDuplicado },
        })
      }
      throw error
    }

    // HU06 · CA 6.1: la cuenta queda creada pero sin verificar, y sale el
    // correo con el enlace. El alta no falla si el SMTP no responde: el
    // vecino siempre puede pedir el reenvío.
    await enviarEnlaceVerificacion({
      usuario: { id_usuario: usuario.id_usuario, nombre: usuario.nombre, email: usuario.email },
      correo,
      forzar: true,
    })

    res.status(201).json({
      mensaje: '¡Listo! Tu cuenta fue creada. Revisá tu correo para confirmarla.',
      verificacionPendiente: true,
      usuario: {
        id: usuario.id_usuario,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
      },
    })
  })

  return router
}
