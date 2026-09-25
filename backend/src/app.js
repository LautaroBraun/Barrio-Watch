import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { config } from './config.js'
import { manejadorErrores } from './errores.js'
import { crearRutasAuth } from './routes/auth.js'
import rutasPublicaciones from './routes/publicaciones.js'
import rutasUsuarios from './routes/usuarios.js'
import rutasZonas from './routes/zonas.js'
import { crearServicioCorreo } from './services/correo.js'

function limitador(maximo, minutos) {
  return rateLimit({
    windowMs: minutos * 60_000,
    limit: maximo,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { codigo: 'DEMASIADAS_PETICIONES', mensaje: 'Hiciste demasiados intentos seguidos. Esperá unos minutos y probá de nuevo.' },
  })
}

export function crearApp({ correo = crearServicioCorreo(), limitarPeticiones = true } = {}) {
  const app = express()

  app.set('trust proxy', config.trustProxy)
  app.use(helmet())
  app.use(cors({ origin: config.frontendUrl }))
  app.use(express.json({ limit: '20kb' }))

  if (limitarPeticiones) {
    app.use('/api/auth/login', limitador(30, 15))
    app.use('/api/auth/recuperar', limitador(5, 15))
    app.use('/api/usuarios/registro', limitador(20, 60))
  }

  app.get('/api/salud', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', crearRutasAuth({ correo }))
  app.use('/api/usuarios', rutasUsuarios)
  app.use('/api/zonas', rutasZonas)
  app.use('/api/publicaciones', rutasPublicaciones)

  app.use('/api', (_req, res) => res.status(404).json({ codigo: 'NO_ENCONTRADO', mensaje: 'Recurso no encontrado' }))
  app.use(manejadorErrores)

  return app
}
