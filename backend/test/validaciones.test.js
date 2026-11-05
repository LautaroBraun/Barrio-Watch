// Reglas compartidas cliente/servidor (HU02). No necesitan base de datos.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MENSAJES,
  requisitosPassword,
  validarCodigoZona,
  validarEmail,
  validarOrdenZona,
  validarPassword,
  validarRegistro,
  validarTelefono,
  validarZonaFormulario,
} from '@barrio-watch/shared'

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
  assert.deepEqual(Object.keys(errores).sort(), ['apellido', 'email', 'idZona', 'nombre', 'password', 'terminos'])
  const { terminos, ...campos } = errores
  assert.ok(Object.values(campos).every((m) => m === MENSAJES.obligatorio))
  // HU07 · CA 7.1: la casilla tiene su propio mensaje, no el genérico.
  assert.equal(terminos, MENSAJES.terminosObligatorios)
})

test('acepta nombres con tildes, apóstrofos y guiones', () => {
  const errores = validarRegistro({
    nombre: 'María José',
    apellido: "O'Connor-Núñez",
    email: 'mj@barrio.com',
    password: 'Clave1234',
    idZona: '2',
    terminos: true,
  })
  assert.deepEqual(errores, {})
  assert.equal(validarRegistro({ nombre: 'R2D2' }).nombre, MENSAJES.soloLetras)
})

// HU08 · CA 8.1 y 8.2 — el teléfono es opcional pero con formato
test('CA 8.1 y 8.2 · el teléfono es opcional y valida el formato', () => {
  assert.equal(validarTelefono(''), null)
  assert.equal(validarTelefono(undefined), null)
  assert.equal(validarTelefono('+54 351 123 4567'), null)
  assert.equal(validarTelefono('(351) 155-12345'), null)
  for (const malo of ['123', 'no es un teléfono', '+54 351 123 4567 890 123']) {
    assert.equal(validarTelefono(malo), MENSAJES.telefonoInvalido, malo)
  }
})

// HU18 · CA 18.1 a 18.3 — reglas del catálogo de zonas
test('CA 18.1 · el código exige dos letras, guion y dos o tres números', () => {
  for (const bueno of ['MZ-05', 'MZ-123', 'SE-01']) assert.equal(validarCodigoZona(bueno), null, bueno)
  for (const malo of ['mz-05', 'MZ 05', 'MZ-5', 'M-05', 'MZ-1234', 'MZ05']) {
    assert.equal(validarCodigoZona(malo), MENSAJES.codigoZonaInvalido, malo)
  }
  assert.equal(validarCodigoZona(''), MENSAJES.obligatorio)
})

test('CA 18.3 · el orden de visualización no admite negativos', () => {
  assert.equal(validarOrdenZona(0), null)
  assert.equal(validarOrdenZona('7'), null)
  assert.equal(validarOrdenZona(-1), MENSAJES.ordenNegativo)
  assert.equal(validarOrdenZona('1.5'), MENSAJES.ordenInvalido)
  assert.equal(validarOrdenZona(''), MENSAJES.obligatorio)
})

test('CA 18.2 · señala cada campo obligatorio faltante del formulario de zona', () => {
  const errores = validarZonaFormulario({ codigo: '', nombre: '', orden: '' })
  assert.deepEqual(Object.keys(errores).sort(), ['codigo', 'nombre', 'orden'])
  // CA 14.2: en la edición el código no viaja, porque es inmutable.
  assert.deepEqual(Object.keys(validarZonaFormulario({ nombre: 'Manzana 5', orden: 5 }, { conCodigo: false })), [])
})
