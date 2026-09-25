import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { MENSAJES, normalizarEmail, validarRegistro } from '@barrio-watch/shared'
import { query } from '../db.js'
import { ErrorApi } from '../errores.js'

export const COSTO_BCRYPT = 10

const router = Router()

// HU01 · Registro de usuario (con las validaciones de HU02 del lado servidor)
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

  try {
    const { rows } = await query(
      `insert into usuarios (nombre, apellido, email, password_hash, id_rol, id_zona)
       values ($1, $2, $3, $4, (select id_rol from roles where nombre = 'vecino'), $5)
       returning id_usuario, nombre, apellido, email`,
      [datos.nombre.trim(), datos.apellido.trim(), normalizarEmail(datos.email), passwordHash, idZona],
    )
    res.status(201).json({
      mensaje: '¡Listo! Tu cuenta fue creada. Ya podés iniciar sesión.',
      usuario: {
        id: rows[0].id_usuario,
        nombre: rows[0].nombre,
        apellido: rows[0].apellido,
        email: rows[0].email,
      },
    })
  } catch (error) {
    if (error.code === '23505' && error.constraint === 'uq_usuarios_email') {
      throw new ErrorApi(409, 'EMAIL_DUPLICADO', MENSAJES.emailDuplicado, {
        campos: { email: MENSAJES.emailDuplicado },
      })
    }
    throw error
  }
})

export default router
