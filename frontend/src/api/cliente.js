const BASE = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export class ErrorApi extends Error {
  constructor(status, datos = {}) {
    super(datos.mensaje ?? 'Ocurrió un error inesperado')
    this.status = status
    this.codigo = datos.codigo
    this.campos = datos.campos ?? {}
    this.datos = datos
  }
}

let tokenActual = null
let alExpirarSesion = null

export function configurarSesion({ token, onExpirada }) {
  tokenActual = token
  if (onExpirada !== undefined) alExpirarSesion = onExpirada
}

export async function api(ruta, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (tokenActual) headers.Authorization = `Bearer ${tokenActual}`

  let respuesta
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ErrorApi(0, {
      codigo: 'SIN_CONEXION',
      mensaje: 'No pudimos conectarnos con el servidor. Revisá tu conexión y probá de nuevo.',
    })
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)

  if (!respuesta.ok) {
    const error = new ErrorApi(respuesta.status, datos ?? {})
    if (error.codigo === 'SESION_INVALIDA' && tokenActual) alExpirarSesion?.()
    throw error
  }
  return datos
}
