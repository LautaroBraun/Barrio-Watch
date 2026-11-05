import { Router } from 'express'
import { MENSAJES, validarZonaFormulario } from '@barrio-watch/shared'
import { ErrorApi } from '../errores.js'
import { requiereAdministrador, requiereSesion, sesionOpcional } from '../middleware/autenticacion.js'
import {
  actualizarZona,
  cambiarEstadoZona,
  crearZona,
  listarZonas,
  obtenerZona,
  usoDeZona,
  zonaPorCodigo,
  zonaPorNombre,
} from '../services/zonas.js'

const router = Router()

const ESTADOS = ['todas', 'activas', 'inactivas']

const esAdministrador = (req) => req.usuario?.rol === 'administrador'

function datosInvalidos(campos) {
  return new ErrorApi(400, 'DATOS_INVALIDOS', 'Revisá los datos marcados', { campos })
}

function idDeRuta(req) {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw new ErrorApi(404, 'NO_ENCONTRADO', MENSAJES.zonaNoEncontrada)
  }
  return id
}

// HU18 · CA 18.4: el servidor vuelve a validar todo lo que ya validó el
// navegador. Un cliente que saltee el formulario y pegue directo contra el
// endpoint recibe 400 y no persiste nada.
function leerDatos(req, { conCodigo }) {
  const campos = validarZonaFormulario(req.body ?? {}, { conCodigo })
  if (Object.keys(campos).length > 0) throw datosInvalidos(campos)

  return {
    codigo: conCodigo ? String(req.body.codigo).trim().toUpperCase() : undefined,
    nombre: String(req.body.nombre).trim(),
    descripcion: String(req.body.descripcion ?? '').trim() || null,
    orden: Number(req.body.orden),
    activa: req.body.activa === undefined ? true : Boolean(req.body.activa),
  }
}

// Traduce el choque de unicidad en un mensaje junto al campo. La restricción
// de la base es la última palabra (HU18 · CA 18.4); esta comprobación previa
// solo existe para poder explicar cuál de las dos columnas chocó.
async function comprobarDuplicados({ codigo, nombre }, idExcluido = null) {
  const campos = {}

  if (codigo) {
    const choque = await zonaPorCodigo(codigo)
    // HU13 · CA 13.4: el código es único entre todas las zonas, activas o no.
    if (choque && choque.id !== idExcluido) campos.codigo = MENSAJES.codigoZonaDuplicado
  }

  // HU14 · CA 14.4: el nombre no se puede repetir. Si lo ocupa una zona
  // inactiva se lo decimos, porque entonces lo que corresponde es reactivarla.
  const choqueNombre = await zonaPorNombre(nombre, idExcluido)
  if (choqueNombre) {
    campos.nombre = choqueNombre.activa
      ? MENSAJES.nombreZonaDuplicado
      : `Ese nombre lo ocupa la zona ${choqueNombre.codigo}, que está inactiva. Reactivala en lugar de crear una nueva.`
  }

  if (Object.keys(campos).length > 0) throw datosInvalidos(campos)
}

// --- Consulta --------------------------------------------------------------

// HU16. Sin sesión (el formulario de registro) o con rol vecino o moderador
// se ven únicamente las zonas activas; el filtro por estado es del
// administrador (CA 16.5). El selector del registro depende de esta ruta, así
// que la sesión es opcional y nunca rechaza a nadie.
router.get('/', sesionOpcional, async (req, res) => {
  const admin = esAdministrador(req)
  const estado = ESTADOS.includes(req.query.estado) ? req.query.estado : 'todas'

  const zonas = await listarZonas({
    busqueda: String(req.query.q ?? '').slice(0, 100),
    estado: admin ? estado : 'activas',
    soloActivas: !admin,
  })

  res.json({ zonas, puedeGestionar: admin })
})

// HU17. El detalle exige sesión; el conteo de uso y la auditoría son datos de
// gestión y se devuelven solo al administrador (CA 17.3).
router.get('/:id', requiereSesion, async (req, res) => {
  const id = idDeRuta(req)
  const zona = await obtenerZona(id)
  if (!zona) throw new ErrorApi(404, 'NO_ENCONTRADO', MENSAJES.zonaNoEncontrada)

  if (!esAdministrador(req)) {
    const { ultimaModificacion, ...publica } = zona
    return res.json({ zona: publica, puedeGestionar: false })
  }

  res.json({ zona, uso: await usoDeZona(id), puedeGestionar: true })
})

// --- Gestión (solo administrador) ------------------------------------------

// HU13 · Alta de zona
router.post('/', requiereSesion, requiereAdministrador, async (req, res) => {
  const datos = leerDatos(req, { conCodigo: true })
  await comprobarDuplicados(datos)

  const id = await crearZona(datos)
  res.status(201).json({
    mensaje: `La zona ${datos.codigo} · ${datos.nombre} fue creada.`,
    zona: await obtenerZona(id),
  })
})

// HU14 · Modificación de zona. El código nunca se lee del cuerpo: aunque un
// cliente lo mande, la consulta de actualización no lo toca (CA 14.2).
router.put('/:id', requiereSesion, requiereAdministrador, async (req, res) => {
  const id = idDeRuta(req)
  const actual = await obtenerZona(id)
  if (!actual) throw new ErrorApi(404, 'NO_ENCONTRADO', MENSAJES.zonaNoEncontrada)

  const datos = leerDatos(req, { conCodigo: false })
  await comprobarDuplicados(datos, id)
  await actualizarZona(id, datos, req.usuario.id)

  res.json({ mensaje: 'Los cambios se guardaron correctamente.', zona: await obtenerZona(id) })
})

// HU15 · Baja lógica y reactivación. Un solo endpoint para los dos sentidos:
// la operación es la misma y así la auditoría queda en un único lugar.
router.patch('/:id/estado', requiereSesion, requiereAdministrador, async (req, res) => {
  const id = idDeRuta(req)
  if (typeof req.body?.activa !== 'boolean') {
    throw datosInvalidos({ activa: 'Indicá si la zona queda activa o inactiva' })
  }

  const actual = await obtenerZona(id)
  if (!actual) throw new ErrorApi(404, 'NO_ENCONTRADO', MENSAJES.zonaNoEncontrada)

  await cambiarEstadoZona(id, req.body.activa, req.usuario.id)
  const zona = await obtenerZona(id)

  res.json({
    mensaje: req.body.activa
      ? `La zona ${zona.codigo} · ${zona.nombre} fue reactivada.`
      : `La zona ${zona.codigo} · ${zona.nombre} fue desactivada.`,
    zona,
    // CA 15.3: se devuelve el uso para poder mostrar que no se perdió nada.
    uso: await usoDeZona(id),
  })
})

export default router
