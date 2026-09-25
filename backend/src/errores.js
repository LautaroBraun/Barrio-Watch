// Error de negocio con código HTTP y un cuerpo que el frontend sabe mostrar.
export class ErrorApi extends Error {
  constructor(status, codigo, mensaje, extra = {}) {
    super(mensaje)
    this.status = status
    this.codigo = codigo
    this.extra = extra
  }
}

export function manejadorErrores(error, req, res, _next) {
  if (error instanceof ErrorApi) {
    return res.status(error.status).json({ codigo: error.codigo, mensaje: error.message, ...error.extra })
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo de la petición no es un JSON válido' })
  }
  console.error(error)
  res.status(500).json({ codigo: 'ERROR_INTERNO', mensaje: 'Ocurrió un error inesperado. Probá de nuevo en unos minutos.' })
}
