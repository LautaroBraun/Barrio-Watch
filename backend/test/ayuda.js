// Armado común de las pruebas de integración: una base PostgreSQL real que se
// recrea con database/esquema.sql antes de cada prueba y un servicio de correo
// de mentira que guarda lo que se habría enviado.
import { readFileSync } from 'node:fs'

export const TEST_DB = process.env.TEST_DATABASE_URL
export const omitir = TEST_DB ? false : 'Definí TEST_DATABASE_URL para correr las pruebas de integración'

export const ESQUEMA = readFileSync(new URL('../../database/esquema.sql', import.meta.url), 'utf8')
export const PASSWORD_SEMILLA = 'Barrio2026'

export function crearEntorno() {
  const correos = { recuperacion: [], verificacion: [] }
  const entorno = { app: null, pool: null, correos }

  entorno.iniciar = async () => {
    if (omitir) return
    process.env.DATABASE_URL = TEST_DB
    process.env.DATABASE_SSL = 'false'
    process.env.JWT_SECRET ??= 'secreto-de-prueba'
    const { crearApp } = await import('../src/app.js')
    ;({ pool: entorno.pool } = await import('../src/db.js'))
    entorno.app = crearApp({
      limitarPeticiones: false,
      correo: {
        enviarRecuperacion: async (d) => correos.recuperacion.push(d),
        enviarVerificacion: async (d) => correos.verificacion.push(d),
      },
    })
  }

  entorno.reiniciar = async () => {
    if (omitir) return
    correos.recuperacion.length = 0
    correos.verificacion.length = 0
    await entorno.pool.query(`set client_min_messages = warning; ${ESQUEMA}`)
  }

  entorno.cerrar = async () => {
    await entorno.pool?.end()
  }

  return entorno
}

// Devuelve el token de sesión de una de las cuentas sembradas por el esquema.
// Lautaro es administrador, Lucas moderador y Juan vecino.
export async function iniciarSesion(request, app, email, password = PASSWORD_SEMILLA) {
  const res = await request(app).post('/api/auth/login').send({ email, password })
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión con ${email}: ${res.status}`)
  return res.body.token
}

export const CUENTAS = {
  administrador: 'lautaro@barriowatch.com',
  moderador: 'lucas@barriowatch.com',
  vecino: 'juan@barriowatch.com',
}
