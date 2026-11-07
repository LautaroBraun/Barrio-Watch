import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { api } from '../api/cliente.js'
import BarraSuperior from '../components/BarraSuperior.jsx'
import { Aviso, Boton } from '../components/Formulario.jsx'
import Modal from '../components/Modal.jsx'
import { EtiquetaEstado } from './Zonas.jsx'

function fecha(valor) {
  return valor ? new Date(valor).toLocaleDateString('es-AR', { dateStyle: 'short' }) : '—'
}
function fechaHora(valor) {
  return valor ? new Date(valor).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

function Tarjeta({ numero, texto, tono }) {
  const tonos = {
    violeta: 'bg-violeta-claro text-violeta',
    arena: 'bg-arena text-tinta',
    coral: 'bg-[#FFEDE4] text-[#D1551F]',
  }
  return (
    <div className={`flex-1 rounded-3xl px-5 py-4 ${tonos[tono]}`}>
      <p className="font-display text-3xl leading-none font-extrabold tracking-tight">{numero}</p>
      <p className="mt-1.5 text-sm font-medium text-tinta-suave">{texto}</p>
    </div>
  )
}

function Dato({ etiqueta, children, ancho = '' }) {
  return (
    <div className={`border-b border-linea/60 px-5 py-3.5 ${ancho}`}>
      <p className="text-xs font-bold tracking-wide text-tinta-suave uppercase">{etiqueta}</p>
      <div className="mt-1 font-medium">{children}</div>
    </div>
  )
}

// HU17 · Detalle de zona y conteo de uso
export default function ZonaDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [zona, setZona] = useState(null)
  const [uso, setUso] = useState(null)
  const [puedeGestionar, setPuedeGestionar] = useState(false)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [confirmando, setConfirmando] = useState(false)
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const datos = await api(`/zonas/${id}`)
      setZona(datos.zona)
      // CA 17.3: a un vecino o moderador el servidor no le manda ni el conteo
      // de uso ni la auditoría, así que la vista queda de solo lectura.
      setUso(datos.uso ?? null)
      setPuedeGestionar(Boolean(datos.puedeGestionar))
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  // HU15 · CA 15.1 y 15.4, desde el detalle.
  async function cambiarEstado(activa) {
    setProcesando(true)
    try {
      const { mensaje } = await api(`/zonas/${id}/estado`, { method: 'PATCH', body: { activa } })
      setConfirmando(false)
      if (activa) {
        await cargar()
      } else {
        navigate('/zonas', { state: { mensaje } })
      }
    } catch (e) {
      setError(e.message)
      setConfirmando(false)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <BarraSuperior />
      <main className="mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
        {cargando ? (
          <div className="flex items-center gap-3 text-tinta-suave" role="status">
            <span className="size-6 animate-spin rounded-full border-3 border-violeta border-t-transparent" />
            Buscando la zona…
          </div>
        ) : error ? (
          <>
            <Aviso tipo="error">{error}</Aviso>
            <div className="mt-6">
              <Boton variante="secundario" bloque={false} onClick={() => navigate('/zonas')}>
                Volver al listado
              </Boton>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              {zona.codigo} · {zona.nombre}
            </h1>
            <p className="mt-1 text-tinta-suave">{zona.descripcion || 'Sin descripción cargada.'}</p>

            {/* CA 17.1: el conteo de uso, para decidir con información concreta. */}
            {uso && (
              <div className="mt-6 flex flex-wrap gap-3">
                <Tarjeta numero={uso.vecinos} texto="Vecinos registrados" tono="violeta" />
                <Tarjeta numero={uso.publicaciones} texto="Publicaciones" tono="arena" />
                <Tarjeta numero={uso.alertas} texto="Alertas de seguridad" tono="coral" />
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-3xl border-2 border-linea bg-white">
              <div className="flex flex-wrap">
                <Dato etiqueta="Código" ancho="w-1/2">
                  {zona.codigo}
                </Dato>
                <Dato etiqueta="Estado" ancho="w-1/2">
                  <EtiquetaEstado activa={zona.activa} />
                </Dato>
                <Dato etiqueta="Orden de visualización" ancho="w-1/2">
                  {zona.orden}
                </Dato>
                <Dato etiqueta="Fecha de creación" ancho="w-1/2">
                  {fecha(zona.fechaCreacion)}
                </Dato>
                {/* CA 17.2 y CA 19.4 */}
                {puedeGestionar && (
                  <Dato etiqueta="Última modificación" ancho="w-full border-b-0">
                    {zona.ultimaModificacion
                      ? `${fechaHora(zona.ultimaModificacion.fecha)}${
                          zona.ultimaModificacion.autor ? ` · ${zona.ultimaModificacion.autor}` : ''
                        }`
                      : 'Sin modificaciones desde su creación'}
                  </Dato>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Boton variante="secundario" bloque={false} onClick={() => navigate('/zonas')}>
                Volver al listado
              </Boton>
              {/* CA 17.3: sin rol de administrador no hay acciones. */}
              {puedeGestionar && (
                <>
                  <Boton variante="secundario" bloque={false} onClick={() => navigate(`/zonas/${id}/editar`)}>
                    Editar
                  </Boton>
                  {zona.activa ? (
                    <Boton variante="peligro" bloque={false} onClick={() => setConfirmando(true)}>
                      Desactivar
                    </Boton>
                  ) : (
                    <Boton bloque={false} cargando={procesando} onClick={() => cambiarEstado(true)}>
                      Reactivar
                    </Boton>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>

      <Modal
        abierto={confirmando}
        titulo={`¿Desactivar la zona ${zona?.codigo ?? ''}?`}
        onCerrar={() => setConfirmando(false)}
        acciones={
          <>
            <Boton variante="secundario" bloque={false} onClick={() => setConfirmando(false)}>
              Cancelar
            </Boton>
            <Boton variante="peligro" bloque={false} cargando={procesando} onClick={() => cambiarEstado(false)}>
              Desactivar zona
            </Boton>
          </>
        }
      >
        {uso && (
          <p>
            Esta zona tiene <strong className="font-bold text-tinta">{uso.vecinos} vecinos</strong> y{' '}
            <strong className="font-bold text-tinta">{uso.publicaciones} publicaciones</strong> asociadas. Al
            desactivarla deja de ofrecerse al registrarse y al crear publicaciones, pero los vecinos que ya viven ahí
            conservan su acceso y el contenido publicado se mantiene visible.
          </p>
        )}
        <p>La zona no se elimina: podés reactivarla en cualquier momento.</p>
      </Modal>
    </div>
  )
}
