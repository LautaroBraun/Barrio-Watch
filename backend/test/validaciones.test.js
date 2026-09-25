// Reglas compartidas cliente/servidor (HU02). No necesitan base de datos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MENSAJES, requisitosPassword, validarEmail, validarPassword, validarRegistro } from '@barrio-watch/shared'

test('CA 2.1 · detecta correos con formato inválido', () => {
  for (const email of ['juan', 'juan@', 'juan@barrio', '@barrio.com', 'juan perez@barrio.com']) {
    assert.equal(validarEmail(email), MENSAJES.emailInvalido, email)
  }
  assert.equal(validarEmail('  Juan.Perez+barrio@Mail.com.ar '), null)
})

test('CA 2.2 · informa cada requisito de la contraseña por separado', () => {
  const pendientes = (p) => requisitosPassword(p).filter((r) => !r.cumple).map((r) => r.id)
  assert.deepEqual(pendientes(''), ['largo', 'mayuscula', 'minuscula', 'numero'])
  assert.deepEqual(pendientes('abc'), ['largo', 'mayuscula', 'numero'])
  assert.deepEqual(pendientes('Ñandú2026'), [])
  assert.equal(validarPassword('Ñandú2026'), null)
  assert.equal(validarPassword('A1b'.padEnd(65, 'x')), MENSAJES.maximo(64))
})

test('CA 2.3 · marca los campos obligatorios vacíos', () => {
  const errores = validarRegistro({ nombre: '  ', apellido: '', email: '', password: '', idZona: '' })
  assert.deepEqual(Object.keys(errores).sort(), ['apellido', 'email', 'idZona', 'nombre', 'password'])
  assert.ok(Object.values(errores).every((m) => m === MENSAJES.obligatorio))
})

test('acepta nombres con tildes, apóstrofos y guiones', () => {
  const errores = validarRegistro({
    nombre: 'María José',
    apellido: "O'Connor-Núñez",
    email: 'mj@barrio.com',
    password: 'Clave1234',
    idZona: '2',
  })
  assert.deepEqual(errores, {})
  assert.equal(validarRegistro({ nombre: 'R2D2' }).nombre, MENSAJES.soloLetras)
})
