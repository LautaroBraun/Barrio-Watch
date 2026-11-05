// Reglas de validación compartidas entre el frontend y el backend (HU02).
// El cliente las usa para dar feedback inmediato; el servidor las vuelve a
// aplicar porque nunca se confía en lo que llega desde el navegador (CA 2.4).

export const MENSAJES = {
  obligatorio: 'Este campo es obligatorio',
  emailInvalido: 'Ingresá un correo electrónico válido',
  emailDuplicado: 'Ya existe una cuenta con ese correo electrónico',
  soloLetras: 'Usá solo letras, espacios, apóstrofos o guiones',
  zonaInvalida: 'Elegí una zona del barrio',
  passwordDebil: 'La contraseña no cumple con los requisitos',
  passwordsDistintas: 'Las contraseñas no coinciden',
  maximo: (n) => `Máximo ${n} caracteres`,
  // Sprint 1 · ampliación
  telefonoInvalido: 'Ingresá un teléfono válido, por ejemplo +54 351 123 4567',
  terminosObligatorios: 'Tenés que aceptar los términos y la política de privacidad',
  // Sprint 2 · zonas
  codigoZonaInvalido: 'Dos letras, guion y dos o tres números. Ejemplo válido: MZ-05',
  codigoZonaDuplicado: 'Ya existe una zona con ese código',
  nombreZonaDuplicado: 'Ya existe una zona con ese nombre',
  ordenInvalido: 'El orden tiene que ser un número entero',
  ordenNegativo: 'El orden debe ser cero o mayor',
  zonaNoEncontrada: 'La zona que buscás no existe',
}

export const LIMITES = {
  nombre: 100,
  apellido: 100,
  email: 150,
  passwordMin: 8,
  // bcrypt solo considera los primeros 72 bytes: un tope menor evita que dos
  // contraseñas largas distintas terminen generando el mismo hash.
  passwordMax: 64,
  telefono: 30,
  codigoZona: 10,
  nombreZona: 100,
  descripcionZona: 255,
}

// Política de contraseñas definida por el equipo (HU02): mínimo 8 caracteres,
// al menos una mayúscula, una minúscula y un número. Sin caducidad ni
// caracteres especiales obligatorios.
export const REQUISITOS_PASSWORD = [
  { id: 'largo', texto: `Al menos ${LIMITES.passwordMin} caracteres`, cumple: (p) => p.length >= LIMITES.passwordMin },
  { id: 'mayuscula', texto: 'Una letra mayúscula', cumple: (p) => /\p{Lu}/u.test(p) },
  { id: 'minuscula', texto: 'Una letra minúscula', cumple: (p) => /\p{Ll}/u.test(p) },
  { id: 'numero', texto: 'Un número', cumple: (p) => /\d/.test(p) },
]

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NOMBRE_REGEX = /^\p{L}[\p{L}\s'’-]*$/u

export function normalizarEmail(email) {
  return String(email ?? '').trim().toLowerCase()
}

export function requisitosPassword(password) {
  const p = String(password ?? '')
  return REQUISITOS_PASSWORD.map((r) => ({ id: r.id, texto: r.texto, cumple: r.cumple(p) }))
}

export function validarEmail(email) {
  const valor = normalizarEmail(email)
  if (!valor) return MENSAJES.obligatorio
  if (valor.length > LIMITES.email) return MENSAJES.maximo(LIMITES.email)
  if (!EMAIL_REGEX.test(valor)) return MENSAJES.emailInvalido
  return null
}

export function validarPassword(password) {
  const valor = String(password ?? '')
  if (!valor) return MENSAJES.obligatorio
  if (valor.length > LIMITES.passwordMax) return MENSAJES.maximo(LIMITES.passwordMax)
  if (requisitosPassword(valor).some((r) => !r.cumple)) return MENSAJES.passwordDebil
  return null
}

function validarNombrePropio(valor, max) {
  const limpio = String(valor ?? '').trim()
  if (!limpio) return MENSAJES.obligatorio
  if (limpio.length > max) return MENSAJES.maximo(max)
  if (!NOMBRE_REGEX.test(limpio)) return MENSAJES.soloLetras
  return null
}

export function validarZona(idZona) {
  if (idZona === '' || idZona === null || idZona === undefined) return MENSAJES.obligatorio
  const n = Number(idZona)
  if (!Number.isInteger(n) || n <= 0) return MENSAJES.zonaInvalida
  return null
}

// Devuelve un objeto { campo: mensaje } solo con los campos que tienen error.
// El teléfono (HU08) y la aceptación de los términos (HU07) se incorporaron
// al formulario en la ampliación del Sprint 1; las funciones que los validan
// están al final del archivo, junto al resto de esa ampliación.
export function validarRegistro(datos = {}) {
  const errores = {
    nombre: validarNombrePropio(datos.nombre, LIMITES.nombre),
    apellido: validarNombrePropio(datos.apellido, LIMITES.apellido),
    email: validarEmail(datos.email),
    password: validarPassword(datos.password),
    idZona: validarZona(datos.idZona),
    telefono: validarTelefono(datos.telefono),
    terminos: validarTerminos(datos.terminos),
  }
  return Object.fromEntries(Object.entries(errores).filter(([, msg]) => msg))
}

// =============================================================================
// Sprint 1 · Ampliación (HU07, HU08)
// =============================================================================

// Versión vigente de los términos y la política de privacidad. Se guarda junto
// con la fecha de aceptación (CA 7.2) para saber qué texto aceptó cada vecino.
export const VERSION_TERMINOS = '1.0'

const TELEFONO_REGEX = /^\+?[\d\s()-]{8,25}$/

// HU08 · CA 8.1 y 8.2: el teléfono es opcional, pero si se carga tiene que
// parecerse a un número de verdad (entre 8 y 15 dígitos, formato E.164).
export function validarTelefono(telefono) {
  const valor = String(telefono ?? '').trim()
  if (!valor) return null
  if (valor.length > LIMITES.telefono) return MENSAJES.maximo(LIMITES.telefono)
  const digitos = valor.replace(/\D/g, '').length
  if (!TELEFONO_REGEX.test(valor) || digitos < 8 || digitos > 15) return MENSAJES.telefonoInvalido
  return null
}

// HU07 · CA 7.1: sin la casilla marcada no se puede crear la cuenta.
export function validarTerminos(aceptado) {
  return aceptado === true ? null : MENSAJES.terminosObligatorios
}

// =============================================================================
// Sprint 2 · Gestión de zonas (HU13 a HU19)
// =============================================================================

export const CODIGO_ZONA_REGEX = /^[A-Z]{2}-\d{2,3}$/

// HU18 · CA 18.1: dos letras mayúsculas, guion y dos o tres números (MZ-05).
export function validarCodigoZona(codigo) {
  const valor = String(codigo ?? '').trim()
  if (!valor) return MENSAJES.obligatorio
  if (valor.length > LIMITES.codigoZona) return MENSAJES.maximo(LIMITES.codigoZona)
  if (!CODIGO_ZONA_REGEX.test(valor)) return MENSAJES.codigoZonaInvalido
  return null
}

export function validarNombreZona(nombre) {
  const valor = String(nombre ?? '').trim()
  if (!valor) return MENSAJES.obligatorio
  if (valor.length > LIMITES.nombreZona) return MENSAJES.maximo(LIMITES.nombreZona)
  return null
}

export function validarDescripcionZona(descripcion) {
  const valor = String(descripcion ?? '').trim()
  if (valor.length > LIMITES.descripcionZona) return MENSAJES.maximo(LIMITES.descripcionZona)
  return null
}

// HU18 · CA 18.3: el orden de visualización no admite negativos.
export function validarOrdenZona(orden) {
  if (orden === '' || orden === null || orden === undefined) return MENSAJES.obligatorio
  const n = Number(orden)
  if (!Number.isInteger(n)) return MENSAJES.ordenInvalido
  if (n < 0) return MENSAJES.ordenNegativo
  if (n > 9999) return MENSAJES.maximo(4)
  return null
}

// HU18 · CA 18.2 y 18.4: el mismo juego de reglas corre en el navegador y en
// el servidor. En la edición el código no viaja, porque es inmutable (CA 14.2).
export function validarZonaFormulario(datos = {}, { conCodigo = true } = {}) {
  const errores = {
    codigo: conCodigo ? validarCodigoZona(datos.codigo) : null,
    nombre: validarNombreZona(datos.nombre),
    descripcion: validarDescripcionZona(datos.descripcion),
    orden: validarOrdenZona(datos.orden),
  }
  return Object.fromEntries(Object.entries(errores).filter(([, msg]) => msg))
}
