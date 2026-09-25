// Pruebas de los criterios de aceptación del Sprint 1 (HU01 a HU05).
// Corren contra una base PostgreSQL real que se recrea antes de cada prueba
// con database/esquema.sql. Configurá TEST_DATABASE_URL (¡nunca la de
// producción, el script borra todas las tablas!).
import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import request from 'supertest'

const TEST_DB = process.env.TEST_DATABASE_URL
const omitir = TEST_DB ? false : 'Definí TEST_DATABASE_URL para correr las pruebas de integración'

const ESQUEMA = readFileSync(new URL('../../database/esquema.sql', import.meta.url), 'utf8')
const PASSWORD_SEMILLA = 'Barrio2026'

let app
let pool
const correosEnviados = []

before(async () => {
  if (omitir) return
  process.env.DATABASE_URL = TEST_DB
  process.env.DATABASE_SSL = 'false'
  process.env.JWT_SECRET ??= 'secreto-de-prueba'
  const { crearApp } = await import('../src/app.js')
  ;({ pool } = await import('../src/db.js'))
  app = crearApp({
    limitarPeticiones: false,
    correo: { enviarRecuperacion: async (datos) => correosEnviados.push(datos) },
  })
})

beforeEach(async () => {
  if (omitir) return
  correosEnviados.length = 0
  await pool.query(`set client_min_messages = warning; ${ESQUEMA}`)
})

after(async () => {
  await pool?.end()
})

const nuevoVecino = (extra = {}) => ({
  nombre: 'Rosa',
  apellido: 'Fernández',
  email: 'rosa@example.com',
  password: 'Mate1234',
  idZona: 2,
  ...extra,
})

const login = (email, password) => request(app).post('/api/auth/login').send({ email, password })

describe('HU01 · Registro de usuario', { skip: omitir }, () => {
  test('CA 1.1 · crea la cuenta con datos válidos', async () => {
    const res = await request(app).post('/api/usuarios/registro').send(nuevoVecino())
    assert.equal(res.status, 201)
    assert.match(res.body.mensaje, /cuenta fue creada/)
    assert.equal(res.body.usuario.email, 'rosa@example.com')
    assert.equal(res.body.usuario.password_hash, undefined)
  })

  test('CA 1.2 · la cuenta nace con rol vecino, la zona elegida y estado activo', async () => {
    await request(app).post('/api/usuarios/registro').send(nuevoVecino({ email: '  Rosa@Example.COM ' }))
    const { rows } = await pool.query(
      `select r.nombre as rol, u.id_zona, u.estado, u.email, u.password_hash
         from usuarios u join roles r using (id_rol) where u.email = 'rosa@example.com'`,
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].rol, 'vecino')
    assert.equal(rows[0].id_zona, 2)
    assert.equal(rows[0].estado, true)
    assert.notEqual(rows[0].password_hash, 'Mate1234')
    assert.match(rows[0].password_hash, /^\$2[aby]\$/)
  })

  test('CA 1.3 · rechaza un correo ya registrado (sin importar mayúsculas)', async () => {
    const res = await request(app).post('/api/usuarios/registro').send(nuevoVecino({ email: 'LAUTARO@barriowatch.com' }))
    assert.equal(res.status, 409)
    assert.equal(res.body.campos.email, 'Ya existe una cuenta con ese correo electrónico')
    const { rows } = await pool.query('select count(*)::int as n from usuarios')
    assert.equal(rows[0].n, 4)
  })
})

describe('HU02 · Validación de los datos de registro', { skip: omitir }, () => {
  test('CA 2.4 · el servidor rechaza datos inválidos con 400 y el detalle por campo', async () => {
    const res = await request(app)
      .post('/api/usuarios/registro')
      .send({ nombre: '', apellido: 'Pérez', email: 'no-es-un-correo', password: 'debil', idZona: 1 })
    assert.equal(res.status, 400)
    assert.equal(res.body.campos.nombre, 'Este campo es obligatorio')
    assert.equal(res.body.campos.email, 'Ingresá un correo electrónico válido')
    assert.equal(res.body.campos.password, 'La contraseña no cumple con los requisitos')
    assert.equal(res.body.campos.apellido, undefined)
    const { rows } = await pool.query('select count(*)::int as n from usuarios')
    assert.equal(rows[0].n, 4)
  })

  for (const [caso, password] of [
    ['menos de 8 caracteres', 'Abc123'],
    ['sin mayúscula', 'abcdefg1'],
    ['sin minúscula', 'ABCDEFG1'],
    ['sin número', 'Abcdefgh'],
  ]) {
    test(`CA 2.2 · rechaza una contraseña ${caso}`, async () => {
      const res = await request(app).post('/api/usuarios/registro').send(nuevoVecino({ password }))
      assert.equal(res.status, 400)
      assert.ok(res.body.campos.password)
    })
  }

  test('rechaza una zona inexistente o inactiva', async () => {
    const inexistente = await request(app).post('/api/usuarios/registro').send(nuevoVecino({ idZona: 99 }))
    assert.equal(inexistente.status, 400)
    assert.ok(inexistente.body.campos.idZona)

    await pool.query('update zonas set activa = false where id_zona = 3')
    const inactiva = await request(app).post('/api/usuarios/registro').send(nuevoVecino({ idZona: 3 }))
    assert.equal(inactiva.status, 400)
  })
})

describe('HU03 · Inicio de sesión', { skip: omitir }, () => {
  test('CA 3.1 · con credenciales válidas devuelve el usuario y ve las publicaciones de su zona', async () => {
    const res = await login('juan@barriowatch.com', PASSWORD_SEMILLA)
    assert.equal(res.status, 200)
    assert.ok(res.body.token)
    assert.equal(res.body.usuario.nombre, 'Juan')
    assert.deepEqual(res.body.usuario.zona, { id: 2, nombre: 'Manzana 2' })

    const feed = await request(app).get('/api/publicaciones').set('Authorization', `Bearer ${res.body.token}`)
    assert.equal(feed.status, 200)
    // Manzana 2 tiene una publicación visible y otra oculta por moderación.
    assert.deepEqual(feed.body.publicaciones.map((p) => p.titulo), ['Busco quien me ayude con las compras'])
  })

  test('CA 3.2 · el token permite recuperar la sesión al recargar', async () => {
    const { body } = await login('juan@barriowatch.com', PASSWORD_SEMILLA)
    const res = await request(app).get('/api/auth/sesion').set('Authorization', `Bearer ${body.token}`)
    assert.equal(res.status, 200)
    assert.equal(res.body.usuario.email, 'juan@barriowatch.com')
  })

  test('CA 3.2 · el token vence a las 12 horas', async () => {
    const { body } = await login('juan@barriowatch.com', PASSWORD_SEMILLA)
    const [, payload] = body.token.split('.')
    const { iat, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    assert.equal(exp - iat, 12 * 3600)
  })

  test('CA 3.3 · cerrar sesión invalida el token al instante', async () => {
    const { body } = await login('juan@barriowatch.com', PASSWORD_SEMILLA)
    const auth = `Bearer ${body.token}`
    assert.equal((await request(app).post('/api/auth/logout').set('Authorization', auth)).status, 204)
    assert.equal((await request(app).get('/api/auth/sesion').set('Authorization', auth)).status, 401)
    assert.equal((await request(app).get('/api/publicaciones').set('Authorization', auth)).status, 401)
  })

  test('CA 3.4 · el acceso exitoso queda registrado en sesiones', async () => {
    await login('marta@barriowatch.com', PASSWORD_SEMILLA)
    const { rows } = await pool.query(
      `select exitoso, direccion_ip, fecha_inicio from sesiones
        where id_usuario = 4 order by id_sesion desc limit 1`,
    )
    assert.equal(rows[0].exitoso, true)
    assert.ok(rows[0].direccion_ip)
    assert.ok(Date.now() - rows[0].fecha_inicio.getTime() < 60_000)
  })

  test('las rutas privadas exigen un token válido', async () => {
    assert.equal((await request(app).get('/api/publicaciones')).status, 401)
    const falso = await request(app).get('/api/publicaciones').set('Authorization', 'Bearer abc.def.ghi')
    assert.equal(falso.status, 401)
  })
})

describe('HU04 · Verificación de credenciales', { skip: omitir }, () => {
  test('CA 4.1 · mismo mensaje si falla el correo o la contraseña', async () => {
    const malaPassword = await login('juan@barriowatch.com', 'Incorrecta1')
    const correoInexistente = await login('nadie@barriowatch.com', PASSWORD_SEMILLA)
    assert.equal(malaPassword.status, 401)
    assert.equal(correoInexistente.status, 401)
    assert.equal(malaPassword.body.mensaje, 'El correo o la contraseña son incorrectos')
    assert.deepEqual(malaPassword.body, correoInexistente.body)
  })

  test('CA 4.2 · el intento fallido queda registrado con exitoso en falso', async () => {
    await login('juan@barriowatch.com', 'Incorrecta1')
    const { rows } = await pool.query(
      'select exitoso, direccion_ip from sesiones where id_usuario = 3 order by id_sesion desc limit 1',
    )
    assert.equal(rows[0].exitoso, false)
    assert.ok(rows[0].direccion_ip)
  })

  test('CA 4.3 · cinco fallos seguidos bloquean la cuenta 15 minutos', async () => {
    for (let i = 1; i <= 4; i++) {
      assert.equal((await login('juan@barriowatch.com', `Mala${i}xyz`)).status, 401)
    }
    const quinto = await login('juan@barriowatch.com', 'Mala5xyz')
    assert.equal(quinto.status, 423)
    assert.equal(quinto.body.codigo, 'CUENTA_BLOQUEADA')
    const minutos = (new Date(quinto.body.bloqueadaHasta) - Date.now()) / 60_000
    assert.ok(minutos > 14 && minutos <= 15, `bloqueo de ${minutos} minutos`)

    // Durante el bloqueo ni la contraseña correcta entra, y el intento no se procesa.
    const { rows: antes } = await pool.query('select count(*)::int as n from sesiones where id_usuario = 3')
    const correcta = await login('juan@barriowatch.com', PASSWORD_SEMILLA)
    assert.equal(correcta.status, 423)
    const { rows: despues } = await pool.query('select count(*)::int as n from sesiones where id_usuario = 3')
    assert.equal(despues[0].n, antes[0].n)

    // Pasados los 15 minutos vuelve a poder entrar.
    await pool.query(`update sesiones set fecha_inicio = fecha_inicio - interval '16 minutes' where id_usuario = 3`)
    assert.equal((await login('juan@barriowatch.com', PASSWORD_SEMILLA)).status, 200)
  })

  test('CA 4.3 · un acceso exitoso reinicia el contador', async () => {
    for (let i = 0; i < 4; i++) await login('juan@barriowatch.com', 'Incorrecta1')
    assert.equal((await login('juan@barriowatch.com', PASSWORD_SEMILLA)).status, 200)
    for (let i = 0; i < 4; i++) {
      assert.equal((await login('juan@barriowatch.com', 'Incorrecta1')).status, 401)
    }
  })

  test('CA 4.3 · al vencer el bloqueo arranca una tanda nueva de intentos', async () => {
    for (let i = 0; i < 5; i++) await login('juan@barriowatch.com', 'Incorrecta1')
    await pool.query(`update sesiones set fecha_inicio = fecha_inicio - interval '16 minutes' where id_usuario = 3`)
    assert.equal((await login('juan@barriowatch.com', 'Incorrecta1')).status, 401)
  })

  test('CA 4.4 · una cuenta dada de baja no entra aunque la contraseña sea correcta', async () => {
    await pool.query('update usuarios set estado = false where id_usuario = 4')
    const correcta = await login('marta@barriowatch.com', PASSWORD_SEMILLA)
    assert.equal(correcta.status, 403)
    assert.equal(correcta.body.mensaje, 'Esta cuenta no está habilitada. Contactá a un administrador')
    // Con la contraseña incorrecta no se revela que la cuenta está de baja.
    assert.equal((await login('marta@barriowatch.com', 'Incorrecta1')).status, 401)
  })

  test('dar de baja una cuenta corta sus sesiones abiertas', async () => {
    const { body } = await login('marta@barriowatch.com', PASSWORD_SEMILLA)
    await pool.query('update usuarios set estado = false where id_usuario = 4')
    const res = await request(app).get('/api/auth/sesion').set('Authorization', `Bearer ${body.token}`)
    assert.equal(res.status, 401)
  })
})

describe('HU05 · Recuperación de contraseña', { skip: omitir }, () => {
  const pedirEnlace = (email) => request(app).post('/api/auth/recuperar').send({ email })
  const tokenDelCorreo = () => new URL(correosEnviados.at(-1).enlace).searchParams.get('token')

  test('CA 5.1 · responde lo mismo exista o no la cuenta', async () => {
    const existe = await pedirEnlace('juan@barriowatch.com')
    const noExiste = await pedirEnlace('fantasma@barriowatch.com')
    assert.equal(existe.status, 200)
    assert.deepEqual(existe.body, noExiste.body)
    assert.equal(existe.body.mensaje, 'Si el correo está registrado, te enviamos un enlace de recuperación')
    assert.equal(correosEnviados.length, 1)
  })

  test('CA 5.2 · guarda solo el hash del token, con vencimiento a una hora', async () => {
    await pedirEnlace('Juan@BarrioWatch.com')
    assert.equal(correosEnviados[0].email, 'juan@barriowatch.com')
    const token = tokenDelCorreo()
    const { rows } = await pool.query(
      `select token_hash, usado, extract(epoch from fecha_expiracion - fecha_creacion) as segundos
         from tokens_recuperacion where id_usuario = 3`,
    )
    assert.equal(rows.length, 1)
    assert.notEqual(rows[0].token_hash, token)
    assert.equal(rows[0].usado, false)
    assert.equal(Number(rows[0].segundos), 3600)
  })

  test('CA 5.2 · no emite enlaces para cuentas dadas de baja', async () => {
    await pool.query('update usuarios set estado = false where id_usuario = 3')
    await pedirEnlace('juan@barriowatch.com')
    assert.equal(correosEnviados.length, 0)
  })

  test('CA 5.3 · restablece la contraseña y consume el enlace', async () => {
    await pedirEnlace('juan@barriowatch.com')
    const token = tokenDelCorreo()

    const verificacion = await request(app).post('/api/auth/restablecer/verificar').send({ token })
    assert.equal(verificacion.status, 200)
    assert.equal(verificacion.body.nombre, 'Juan')

    const res = await request(app).post('/api/auth/restablecer').send({ token, password: 'NuevaClave9' })
    assert.equal(res.status, 200)
    assert.equal((await login('juan@barriowatch.com', PASSWORD_SEMILLA)).status, 401)
    assert.equal((await login('juan@barriowatch.com', 'NuevaClave9')).status, 200)
  })

  test('CA 5.3 · la nueva contraseña respeta la política de HU02', async () => {
    await pedirEnlace('juan@barriowatch.com')
    const res = await request(app).post('/api/auth/restablecer').send({ token: tokenDelCorreo(), password: 'corta' })
    assert.equal(res.status, 400)
    assert.ok(res.body.campos.password)
  })

  test('CA 5.4 · un enlace ya usado no sirve de nuevo', async () => {
    await pedirEnlace('juan@barriowatch.com')
    const token = tokenDelCorreo()
    await request(app).post('/api/auth/restablecer').send({ token, password: 'NuevaClave9' })
    const otraVez = await request(app).post('/api/auth/restablecer').send({ token, password: 'OtraClave10' })
    assert.equal(otraVez.status, 410)
    assert.equal(otraVez.body.codigo, 'ENLACE_USADO')
    const verificar = await request(app).post('/api/auth/restablecer/verificar').send({ token })
    assert.equal(verificar.body.codigo, 'ENLACE_USADO')
  })

  test('CA 5.4 · un enlace vencido no sirve', async () => {
    await pedirEnlace('juan@barriowatch.com')
    await pool.query(
      `update tokens_recuperacion
          set fecha_creacion = now() - interval '2 hours', fecha_expiracion = now() - interval '1 hour'`,
    )
    const res = await request(app).post('/api/auth/restablecer').send({ token: tokenDelCorreo(), password: 'NuevaClave9' })
    assert.equal(res.status, 410)
    assert.equal(res.body.codigo, 'ENLACE_VENCIDO')
  })

  test('CA 5.4 · un enlace inventado es inválido', async () => {
    const res = await request(app).post('/api/auth/restablecer/verificar').send({ token: 'x'.repeat(43) })
    assert.equal(res.status, 400)
    assert.equal(res.body.codigo, 'ENLACE_INVALIDO')
  })

  test('CA 5.5 · restablecer la contraseña cierra las sesiones abiertas', async () => {
    const { body } = await login('juan@barriowatch.com', PASSWORD_SEMILLA)
    const auth = `Bearer ${body.token}`
    assert.equal((await request(app).get('/api/auth/sesion').set('Authorization', auth)).status, 200)

    await pedirEnlace('juan@barriowatch.com')
    await request(app).post('/api/auth/restablecer').send({ token: tokenDelCorreo(), password: 'NuevaClave9' })

    assert.equal((await request(app).get('/api/auth/sesion').set('Authorization', auth)).status, 401)
  })

  test('restablecer la contraseña levanta el bloqueo por reintentos', async () => {
    for (let i = 0; i < 5; i++) await login('juan@barriowatch.com', 'Incorrecta1')
    assert.equal((await login('juan@barriowatch.com', PASSWORD_SEMILLA)).status, 423)

    await pedirEnlace('juan@barriowatch.com')
    await request(app).post('/api/auth/restablecer').send({ token: tokenDelCorreo(), password: 'NuevaClave9' })

    assert.equal((await login('juan@barriowatch.com', 'NuevaClave9')).status, 200)
  })
})
