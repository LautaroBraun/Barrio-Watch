// Pruebas de los criterios de aceptación del Sprint 2 — Gestión de la
// entidad de soporte «zonas» (HU13 a HU19).
import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { CUENTAS, crearEntorno, iniciarSesion, omitir } from './ayuda.js'

const entorno = crearEntorno()
let admin
let vecino

before(async () => {
  await entorno.iniciar()
})
after(async () => {
  await entorno.cerrar()
})
beforeEach(async () => {
  if (omitir) return
  await entorno.reiniciar()
  admin = await iniciarSesion(request, entorno.app, CUENTAS.administrador)
  vecino = await iniciarSesion(request, entorno.app, CUENTAS.vecino)
})

const como = (token) => (metodo, ruta) => request(entorno.app)[metodo](ruta).set('Authorization', `Bearer ${token}`)

const zonaNueva = (extra = {}) => ({
  codigo: 'MZ-05',
  nombre: 'Manzana 5',
  descripcion: 'Sector oeste',
  orden: 5,
  ...extra,
})

describe('HU13 · Alta de zona', { skip: omitir }, () => {
  test('CA 13.1 · crea la zona y queda en el listado, en la posición de su orden', async () => {
    const res = await como(admin)('post', '/api/zonas').send(zonaNueva({ orden: 2 }))
    assert.equal(res.status, 201)
    assert.match(res.body.mensaje, /fue creada/)
    assert.equal(res.body.zona.codigo, 'MZ-05')

    const listado = await como(admin)('get', '/api/zonas')
    // orden 2 empata con Manzana 2; el nombre desempata.
    assert.deepEqual(
      listado.body.zonas.map((z) => z.codigo),
      ['MZ-01', 'MZ-02', 'MZ-05', 'MZ-03'],
    )
  })

  test('CA 13.2 · la zona nueva aparece enseguida en el selector del registro', async () => {
    await como(admin)('post', '/api/zonas').send(zonaNueva())
    // Sin sesión: es exactamente la petición que hace el formulario de registro.
    const publico = await request(entorno.app).get('/api/zonas')
    assert.equal(publico.status, 200)
    assert.ok(publico.body.zonas.some((z) => z.codigo === 'MZ-05'))
  })

  test('CA 13.3 · nace activa y con fecha de creación', async () => {
    const res = await como(admin)('post', '/api/zonas').send(zonaNueva())
    assert.equal(res.body.zona.activa, true)
    assert.ok(res.body.zona.fechaCreacion)
    assert.equal(res.body.zona.ultimaModificacion, null)
  })

  test('CA 13.4 · rechaza un código que ya existe, aunque la zona esté inactiva', async () => {
    await entorno.pool.query('update zonas set activa = false where codigo = $1', ['MZ-02'])
    const res = await como(admin)('post', '/api/zonas').send(zonaNueva({ codigo: 'MZ-02', nombre: 'Otra' }))
    assert.equal(res.status, 400)
    assert.equal(res.body.campos.codigo, 'Ya existe una zona con ese código')

    const { rows } = await entorno.pool.query('select count(*)::int as n from zonas')
    assert.equal(rows[0].n, 3)
  })
})

describe('HU14 · Modificación de zona', { skip: omitir }, () => {
  test('CA 14.1 · guarda el nombre nuevo y el listado lo refleja', async () => {
    const res = await como(admin)('put', '/api/zonas/2').send({
      nombre: 'Manzana 2 · Sector sur',
      descripcion: 'Entre la plaza y la avenida',
      orden: 2,
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.zona.nombre, 'Manzana 2 · Sector sur')

    const listado = await como(admin)('get', '/api/zonas')
    assert.ok(listado.body.zonas.some((z) => z.nombre === 'Manzana 2 · Sector sur'))
  })

  test('CA 14.2 · el código es inmutable: aunque se mande, no cambia', async () => {
    const res = await como(admin)('put', '/api/zonas/2').send({
      codigo: 'XX-99',
      nombre: 'Manzana 2',
      orden: 2,
    })
    assert.equal(res.status, 200)
    assert.equal(res.body.zona.codigo, 'MZ-02')
  })

  test('CA 14.3 · cambiar el orden reordena el listado y el selector público', async () => {
    await como(admin)('put', '/api/zonas/3').send({ nombre: 'Manzana 3', orden: 0 })

    const listado = await como(admin)('get', '/api/zonas')
    assert.equal(listado.body.zonas[0].codigo, 'MZ-03')

    const publico = await request(entorno.app).get('/api/zonas')
    assert.equal(publico.body.zonas[0].codigo, 'MZ-03')
  })

  test('CA 14.4 · rechaza un nombre que ya usa otra zona activa', async () => {
    const res = await como(admin)('put', '/api/zonas/2').send({ nombre: 'Manzana 1', orden: 2 })
    assert.equal(res.status, 400)
    assert.equal(res.body.campos.nombre, 'Ya existe una zona con ese nombre')
  })

  test('mantener el propio nombre no se interpreta como duplicado', async () => {
    const res = await como(admin)('put', '/api/zonas/2').send({ nombre: 'Manzana 2', orden: 9 })
    assert.equal(res.status, 200)
    assert.equal(res.body.zona.orden, 9)
  })
})

describe('HU15 · Baja lógica y reactivación', { skip: omitir }, () => {
  test('CA 15.1 · el detalle informa cuántos vecinos y publicaciones dependen de la zona', async () => {
    const res = await como(admin)('get', '/api/zonas/1')
    assert.equal(res.status, 200)
    assert.equal(res.body.uso.vecinos, 2)
    assert.equal(res.body.uso.publicaciones, 2)
    assert.equal(res.body.uso.alertas, 1)
  })

  test('CA 15.2 · al desactivarla deja de ofrecerse y figura como inactiva', async () => {
    const res = await como(admin)('patch', '/api/zonas/2/estado').send({ activa: false })
    assert.equal(res.status, 200)
    assert.equal(res.body.zona.activa, false)

    // Deja de ofrecerse en el registro…
    const publico = await request(entorno.app).get('/api/zonas')
    assert.ok(!publico.body.zonas.some((z) => z.codigo === 'MZ-02'))

    // …pero el administrador la sigue viendo, marcada como inactiva.
    const listado = await como(admin)('get', '/api/zonas')
    assert.equal(listado.body.zonas.find((z) => z.codigo === 'MZ-02').activa, false)
  })

  test('CA 15.2 · tampoco se puede registrar un vecino en una zona desactivada', async () => {
    await como(admin)('patch', '/api/zonas/2/estado').send({ activa: false })
    const res = await request(entorno.app).post('/api/usuarios/registro').send({
      nombre: 'Rosa',
      apellido: 'Fernández',
      email: 'rosa@example.com',
      password: 'Mate1234',
      idZona: 2,
      terminos: true,
    })
    assert.equal(res.status, 400)
    assert.ok(res.body.campos.idZona)
  })

  test('CA 15.3 · la baja lógica conserva vecinos y publicaciones', async () => {
    const antes = await como(admin)('get', '/api/zonas/2')
    await como(admin)('patch', '/api/zonas/2/estado').send({ activa: false })
    const despues = await como(admin)('get', '/api/zonas/2')

    assert.deepEqual(despues.body.uso, antes.body.uso)

    // El vecino de esa zona conserva el acceso al sistema.
    const sesion = await request(entorno.app)
      .post('/api/auth/login')
      .send({ email: CUENTAS.vecino, password: 'Barrio2026' })
    assert.equal(sesion.status, 200)
  })

  test('CA 15.4 · reactivarla la devuelve a los selectores con su historial', async () => {
    await como(admin)('patch', '/api/zonas/2/estado').send({ activa: false })
    const res = await como(admin)('patch', '/api/zonas/2/estado').send({ activa: true })

    assert.equal(res.status, 200)
    assert.match(res.body.mensaje, /reactivada/)
    assert.equal(res.body.uso.vecinos, 1)

    const publico = await request(entorno.app).get('/api/zonas')
    assert.ok(publico.body.zonas.some((z) => z.codigo === 'MZ-02'))
  })

  test('CA 15.5 · el motor impide el borrado físico de una zona en uso', async () => {
    await assert.rejects(
      () => entorno.pool.query('delete from zonas where id_zona = 2'),
      (error) => {
        // 23503 = violación de clave foránea.
        assert.equal(error.code, '23503')
        assert.match(error.detail ?? '', /usuarios/)
        return true
      },
    )

    // La baja lógica, en cambio, pasa sin problema y no pierde nada.
    await entorno.pool.query('update zonas set activa = false where id_zona = 2')
    const { rows } = await entorno.pool.query('select count(*)::int as n from usuarios where id_zona = 2')
    assert.equal(rows[0].n, 1)
  })
})

describe('HU16 · Consulta y listado', { skip: omitir }, () => {
  test('CA 16.1 · ordena por el campo orden, no alfabéticamente', async () => {
    // «Manzana 10» alfabéticamente iría antes que «Manzana 2»: el orden lo evita.
    await como(admin)('post', '/api/zonas').send(zonaNueva({ codigo: 'MZ-10', nombre: 'Manzana 10', orden: 10 }))
    const res = await como(admin)('get', '/api/zonas')
    assert.deepEqual(
      res.body.zonas.map((z) => z.nombre),
      ['Manzana 1', 'Manzana 2', 'Manzana 3', 'Manzana 10'],
    )
  })

  test('CA 16.2 · busca por código y por nombre, sin distinguir mayúsculas', async () => {
    const porNombre = await como(admin)('get', '/api/zonas?q=manzana 2')
    assert.deepEqual(porNombre.body.zonas.map((z) => z.codigo), ['MZ-02'])

    const porCodigo = await como(admin)('get', '/api/zonas?q=mz-03')
    assert.deepEqual(porCodigo.body.zonas.map((z) => z.codigo), ['MZ-03'])
  })

  test('CA 16.3 · el filtro por estado muestra solo las desactivadas', async () => {
    await como(admin)('patch', '/api/zonas/2/estado').send({ activa: false })
    const res = await como(admin)('get', '/api/zonas?estado=inactivas')
    assert.deepEqual(res.body.zonas.map((z) => z.codigo), ['MZ-02'])
  })

  test('CA 16.4 · una búsqueda sin coincidencias devuelve una lista vacía', async () => {
    const res = await como(admin)('get', '/api/zonas?q=MZ-99')
    assert.equal(res.status, 200)
    assert.deepEqual(res.body.zonas, [])
  })

  test('CA 16.5 · sin rol de administrador solo se ven las activas y no hay filtro', async () => {
    await como(admin)('patch', '/api/zonas/2/estado').send({ activa: false })

    const res = await como(vecino)('get', '/api/zonas?estado=inactivas')
    assert.equal(res.status, 200)
    assert.equal(res.body.puedeGestionar, false)
    // El filtro se ignora: el vecino nunca ve una zona inactiva.
    assert.deepEqual(res.body.zonas.map((z) => z.codigo), ['MZ-01', 'MZ-03'])
  })
})

describe('HU17 · Detalle y conteo de uso', { skip: omitir }, () => {
  test('CA 17.1 · el detalle trae vecinos, publicaciones y alertas', async () => {
    const res = await como(admin)('get', '/api/zonas/1')
    assert.deepEqual(res.body.uso, { vecinos: 2, publicaciones: 2, alertas: 1 })
  })

  test('CA 17.2 · muestra la fecha de creación y quién hizo el último cambio', async () => {
    await como(admin)('put', '/api/zonas/3').send({ nombre: 'Manzana 3', orden: 3 })
    const res = await como(admin)('get', '/api/zonas/3')
    assert.ok(res.body.zona.fechaCreacion)
    assert.ok(res.body.zona.ultimaModificacion.fecha)
    assert.equal(res.body.zona.ultimaModificacion.autor, 'Lautaro Laborda')
  })

  test('CA 17.3 · el vecino ve el detalle en solo lectura, sin conteo ni auditoría', async () => {
    const res = await como(vecino)('get', '/api/zonas/1')
    assert.equal(res.status, 200)
    assert.equal(res.body.puedeGestionar, false)
    assert.equal(res.body.uso, undefined)
    assert.equal(res.body.zona.ultimaModificacion, undefined)
  })

  test('una zona inexistente devuelve 404', async () => {
    const res = await como(admin)('get', '/api/zonas/99')
    assert.equal(res.status, 404)
  })
})

describe('HU18 · Unicidad y validación', { skip: omitir }, () => {
  test('CA 18.1 · rechaza códigos con espacios, minúsculas o formato distinto', async () => {
    for (const codigo of ['mz 05', 'mz-05', 'MZ-5', 'MZ05']) {
      const res = await como(admin)('post', '/api/zonas').send(zonaNueva({ codigo }))
      assert.equal(res.status, 400, codigo)
      assert.ok(res.body.campos.codigo, codigo)
    }
  })

  test('CA 18.2 · señala cada campo obligatorio faltante', async () => {
    const res = await como(admin)('post', '/api/zonas').send({ codigo: '', nombre: '', orden: '' })
    assert.equal(res.status, 400)
    assert.deepEqual(Object.keys(res.body.campos).sort(), ['codigo', 'nombre', 'orden'])
  })

  test('CA 18.3 · rechaza un orden negativo', async () => {
    const res = await como(admin)('post', '/api/zonas').send(zonaNueva({ orden: -1 }))
    assert.equal(res.status, 400)
    assert.equal(res.body.campos.orden, 'El orden debe ser cero o mayor')
  })

  test('CA 18.4 · el servidor rechaza con 400 y no persiste, aunque el cliente saltee el formulario', async () => {
    const res = await como(admin)('post', '/api/zonas').send({ codigo: 'xx', nombre: '', orden: -5 })
    assert.equal(res.status, 400)
    const { rows } = await entorno.pool.query('select count(*)::int as n from zonas')
    assert.equal(rows[0].n, 3)
  })

  test('la base es la última palabra: la restricción de formato existe en la tabla', async () => {
    await assert.rejects(
      () => entorno.pool.query("insert into zonas (codigo, nombre, orden) values ('malo', 'X', 1)"),
      (error) => {
        assert.equal(error.code, '23514')
        assert.equal(error.constraint, 'ck_zonas_codigo_formato')
        return true
      },
    )
  })
})

describe('HU19 · Permisos y auditoría', { skip: omitir }, () => {
  test('CA 19.1 · el listado le dice a la interfaz si puede gestionar', async () => {
    assert.equal((await como(admin)('get', '/api/zonas')).body.puedeGestionar, true)
    assert.equal((await como(vecino)('get', '/api/zonas')).body.puedeGestionar, false)
    const moderador = await iniciarSesion(request, entorno.app, CUENTAS.moderador)
    assert.equal((await como(moderador)('get', '/api/zonas')).body.puedeGestionar, false)
  })

  test('CA 19.2 · sin rol de administrador los endpoints de gestión devuelven 403', async () => {
    const peticiones = [
      como(vecino)('post', '/api/zonas').send(zonaNueva()),
      como(vecino)('put', '/api/zonas/2').send({ nombre: 'Otra', orden: 1 }),
      como(vecino)('patch', '/api/zonas/2/estado').send({ activa: false }),
    ]
    for (const peticion of peticiones) {
      const res = await peticion
      assert.equal(res.status, 403)
      assert.equal(res.body.mensaje, 'Acceso denegado')
    }

    // Y no se ejecutó nada.
    const { rows } = await entorno.pool.query('select count(*)::int as n from zonas where activa')
    assert.equal(rows[0].n, 3)
  })

  test('CA 19.2 · sin sesión tampoco se puede gestionar', async () => {
    const res = await request(entorno.app).post('/api/zonas').send(zonaNueva())
    assert.equal(res.status, 401)
  })

  test('CA 19.3 · el alta, la edición y la baja quedan auditadas', async () => {
    await como(admin)('put', '/api/zonas/1').send({ nombre: 'Manzana 1', orden: 1 })
    const editada = await entorno.pool.query(
      'select fecha_modificacion, id_usuario_modifica from zonas where id_zona = 1',
    )
    assert.ok(editada.rows[0].fecha_modificacion)
    assert.equal(editada.rows[0].id_usuario_modifica, 1)

    await como(admin)('patch', '/api/zonas/3/estado').send({ activa: false })
    const baja = await entorno.pool.query(
      'select fecha_modificacion, id_usuario_modifica from zonas where id_zona = 3',
    )
    assert.ok(baja.rows[0].fecha_modificacion)
    assert.equal(baja.rows[0].id_usuario_modifica, 1)
  })

  test('CA 19.4 · la auditoría se puede consultar desde el detalle', async () => {
    await como(admin)('patch', '/api/zonas/2/estado').send({ activa: false })
    const res = await como(admin)('get', '/api/zonas/2')
    assert.equal(res.body.zona.ultimaModificacion.autor, 'Lautaro Laborda')
  })
})
