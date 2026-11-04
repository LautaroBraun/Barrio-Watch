// Pruebas de los criterios de aceptación de la ampliación del Sprint 1:
// HU06 (verificación del correo), HU07 (términos) y HU08 (teléfono).
import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { crearEntorno, omitir } from './ayuda.js'

const entorno = crearEntorno()

before(async () => {
  await entorno.iniciar()
})
after(async () => {
  await entorno.cerrar()
})
beforeEach(async () => {
  await entorno.reiniciar()
})

const nuevoVecino = (extra = {}) => ({
  nombre: 'Rosa',
  apellido: 'Fernández',
  email: 'rosa@example.com',
  password: 'Mate1234',
  idZona: 2,
  terminos: true,
  ...extra,
})

const registrar = (extra) => request(entorno.app).post('/api/usuarios/registro').send(nuevoVecino(extra))

// Saca el token del enlace que se habría enviado por correo.
const tokenDelUltimoCorreo = () => {
  const ultimo = entorno.correos.verificacion.at(-1)
  return new URL(ultimo.enlace).searchParams.get('token')
}

describe('HU06 · Verificación del correo electrónico', { skip: omitir }, () => {
  test('CA 6.1 · al crear la cuenta sale el correo con un enlace de 24 horas', async () => {
    const res = await registrar()
    assert.equal(res.status, 201)
    assert.equal(res.body.verificacionPendiente, true)
    assert.equal(entorno.correos.verificacion.length, 1)
    assert.equal(entorno.correos.verificacion[0].email, 'rosa@example.com')

    const { rows } = await entorno.pool.query(
      `select t.tipo, t.usado, u.email_verificado,
              t.fecha_expiracion between now() + interval '23 hours' and now() + interval '25 hours' as vigencia
         from tokens t join usuarios u using (id_usuario)
        where u.email = 'rosa@example.com'`,
    )
    assert.equal(rows.length, 1)
    assert.equal(rows[0].tipo, 'verificacion')
    assert.equal(rows[0].usado, false)
    assert.equal(rows[0].vigencia, true)
    // La cuenta nace sin verificar.
    assert.equal(rows[0].email_verificado, false)
  })

  test('CA 6.1 · del token solo se guarda el hash', async () => {
    await registrar()
    const token = tokenDelUltimoCorreo()
    const { rows } = await entorno.pool.query('select token_hash from tokens')
    assert.notEqual(rows[0].token_hash, token)
    assert.match(rows[0].token_hash, /^[a-f0-9]{64}$/)
  })

  test('CA 6.2 · el enlace vigente marca la cuenta como verificada y se consume', async () => {
    await registrar()
    const token = tokenDelUltimoCorreo()

    const res = await request(entorno.app).post('/api/auth/verificar').send({ token })
    assert.equal(res.status, 200)
    assert.equal(res.body.verificado, true)
    assert.equal(res.body.nombre, 'Rosa')

    const { rows } = await entorno.pool.query(
      `select u.email_verificado, t.usado from usuarios u join tokens t using (id_usuario)
        where u.email = 'rosa@example.com'`,
    )
    assert.equal(rows[0].email_verificado, true)
    assert.equal(rows[0].usado, true)
  })

  test('CA 6.3 · un enlace vencido se rechaza explicando el motivo', async () => {
    await registrar()
    const token = tokenDelUltimoCorreo()
    // ck_tokens_expiracion exige que el vencimiento sea posterior a la
    // creación, así que se corren las dos fechas hacia atrás.
    await entorno.pool.query(
      `update tokens set fecha_creacion = now() - interval '25 hours',
                         fecha_expiracion = now() - interval '1 hour'`,
    )

    const res = await request(entorno.app).post('/api/auth/verificar').send({ token })
    assert.equal(res.status, 410)
    assert.equal(res.body.codigo, 'ENLACE_VENCIDO')

    const { rows } = await entorno.pool.query("select email_verificado from usuarios where email = 'rosa@example.com'")
    assert.equal(rows[0].email_verificado, false)
  })

  test('CA 6.3 · un enlace inventado se rechaza como inválido', async () => {
    const res = await request(entorno.app).post('/api/auth/verificar').send({ token: 'a'.repeat(43) })
    assert.equal(res.status, 400)
    assert.equal(res.body.codigo, 'ENLACE_INVALIDO')
  })

  test('CA 6.3 · abrir dos veces el mismo enlace no es un error', async () => {
    await registrar()
    const token = tokenDelUltimoCorreo()
    await request(entorno.app).post('/api/auth/verificar').send({ token })

    const segunda = await request(entorno.app).post('/api/auth/verificar').send({ token })
    assert.equal(segunda.status, 200)
    assert.match(segunda.body.mensaje, /ya estaba confirmado/)
  })

  test('CA 6.4 · la cuenta sin verificar entra, pero el estado viaja al frontend', async () => {
    await registrar()
    const res = await request(entorno.app)
      .post('/api/auth/login')
      .send({ email: 'rosa@example.com', password: 'Mate1234' })

    assert.equal(res.status, 200)
    assert.equal(res.body.usuario.emailVerificado, false)

    // Y después de verificar, la sesión refleja el cambio.
    await request(entorno.app).post('/api/auth/verificar').send({ token: tokenDelUltimoCorreo() })
    const sesion = await request(entorno.app).get('/api/auth/sesion').set('Authorization', `Bearer ${res.body.token}`)
    assert.equal(sesion.body.usuario.emailVerificado, true)
  })

  test('CA 6.5 · un reenvío dentro de los cinco minutos no manda otro correo', async () => {
    await registrar()
    assert.equal(entorno.correos.verificacion.length, 1)

    const res = await request(entorno.app)
      .post('/api/auth/reenviar-verificacion')
      .send({ email: 'rosa@example.com' })

    assert.equal(res.status, 429)
    assert.equal(res.body.codigo, 'REENVIO_DEMASIADO_PRONTO')
    assert.ok(res.body.minutosRestantes >= 1 && res.body.minutosRestantes <= 5)
    assert.equal(entorno.correos.verificacion.length, 1)
  })

  test('CA 6.5 · pasados los cinco minutos sí se reenvía', async () => {
    await registrar()
    await entorno.pool.query("update tokens set fecha_creacion = now() - interval '6 minutes'")

    const res = await request(entorno.app)
      .post('/api/auth/reenviar-verificacion')
      .send({ email: 'rosa@example.com' })

    assert.equal(res.status, 200)
    assert.equal(entorno.correos.verificacion.length, 2)
    // El enlace nuevo funciona.
    const verificado = await request(entorno.app).post('/api/auth/verificar').send({ token: tokenDelUltimoCorreo() })
    assert.equal(verificado.status, 200)
  })

  test('el reenvío no revela si el correo existe ni si ya está verificado', async () => {
    const inexistente = await request(entorno.app)
      .post('/api/auth/reenviar-verificacion')
      .send({ email: 'nadie@example.com' })
    assert.equal(inexistente.status, 200)

    const yaVerificada = await request(entorno.app)
      .post('/api/auth/reenviar-verificacion')
      .send({ email: 'lautaro@barriowatch.com' })
    assert.equal(yaVerificada.status, 200)
    assert.equal(inexistente.body.mensaje, yaVerificada.body.mensaje)
    assert.equal(entorno.correos.verificacion.length, 0)
  })

  test('el enlace de recuperación no sirve para verificar, ni al revés', async () => {
    await registrar()
    const tokenVerificacion = tokenDelUltimoCorreo()

    const res = await request(entorno.app).post('/api/auth/restablecer/verificar').send({ token: tokenVerificacion })
    assert.equal(res.status, 400)
    assert.equal(res.body.codigo, 'ENLACE_INVALIDO')

    await request(entorno.app).post('/api/auth/recuperar').send({ email: 'rosa@example.com' })
    const tokenRecuperacion = new URL(entorno.correos.recuperacion.at(-1).enlace).searchParams.get('token')
    const cruzado = await request(entorno.app).post('/api/auth/verificar').send({ token: tokenRecuperacion })
    assert.equal(cruzado.status, 400)
  })
})

describe('HU07 · Aceptación de términos y política de privacidad', { skip: omitir }, () => {
  test('CA 7.1 · sin la casilla marcada no se crea la cuenta', async () => {
    for (const valor of [undefined, false, 'si', 1]) {
      const res = await registrar({ terminos: valor })
      assert.equal(res.status, 400, String(valor))
      assert.equal(res.body.campos.terminos, 'Tenés que aceptar los términos y la política de privacidad')
    }
    const { rows } = await entorno.pool.query('select count(*)::int as n from usuarios')
    assert.equal(rows[0].n, 4)
  })

  test('CA 7.2 · guarda la fecha de aceptación y la versión del texto', async () => {
    await registrar()
    const { rows } = await entorno.pool.query(
      `select fecha_aceptacion_terminos, version_terminos
         from usuarios where email = 'rosa@example.com'`,
    )
    assert.ok(rows[0].fecha_aceptacion_terminos)
    assert.equal(rows[0].version_terminos, '1.0')
  })

  test('la base impide que quede la fecha sin la versión', async () => {
    await assert.rejects(
      () =>
        entorno.pool.query(
          `update usuarios set fecha_aceptacion_terminos = now(), version_terminos = null
            where id_usuario = 1`,
        ),
      (error) => {
        assert.equal(error.constraint, 'ck_usuarios_terminos')
        return true
      },
    )
  })
})

describe('HU08 · Teléfono de contacto opcional', { skip: omitir }, () => {
  test('CA 8.1 · la cuenta se crea igual sin teléfono', async () => {
    const res = await registrar()
    assert.equal(res.status, 201)
    const { rows } = await entorno.pool.query("select telefono from usuarios where email = 'rosa@example.com'")
    assert.equal(rows[0].telefono, null)
  })

  test('CA 8.2 · un teléfono con formato inválido señala el campo', async () => {
    const res = await registrar({ telefono: '123' })
    assert.equal(res.status, 400)
    assert.match(res.body.campos.telefono, /teléfono válido/)
    const { rows } = await entorno.pool.query('select count(*)::int as n from usuarios')
    assert.equal(rows[0].n, 4)
  })

  test('CA 8.2 · un teléfono válido se persiste', async () => {
    const res = await registrar({ telefono: ' +54 351 123 4567 ' })
    assert.equal(res.status, 201)
    const { rows } = await entorno.pool.query("select telefono from usuarios where email = 'rosa@example.com'")
    assert.equal(rows[0].telefono, '+54 351 123 4567')
  })
})
