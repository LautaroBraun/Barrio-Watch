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
}

export const LIMITES = {
  nombre: 100,
  apellido: 100,
  email: 150,
  passwordMin: 8,
  // bcrypt solo considera los primeros 72 bytes: un tope menor evita que dos
  // contraseñas largas distintas terminen generando el mismo hash.
  passwordMax: 64,
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
export function validarRegistro(datos = {}) {
  const errores = {
    nombre: validarNombrePropio(datos.nombre, LIMITES.nombre),
    apellido: validarNombrePropio(datos.apellido, LIMITES.apellido),
    email: validarEmail(datos.email),
    password: validarPassword(datos.password),
    idZona: validarZona(datos.idZona),
  }
  return Object.fromEntries(Object.entries(errores).filter(([, msg]) => msg))
}
