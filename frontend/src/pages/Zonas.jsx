import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { api } from '../api/cliente.js'
import BarraSuperior from '../components/BarraSuperior.jsx'
import { Aviso, Boton } from '../components/Formulario.jsx'
import {
  IconoBuscar,
  IconoDesactivar,
  IconoLapiz,
  IconoMas,
  IconoOjo,
  IconoReactivar,
} from '../components/Iconos.jsx'
import Modal from '../components/Modal.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const ESTADOS = [
  { valor: 'todas', texto: 'Todas' },
  { valor: 'activas', texto: 'Activas' },
  { valor: 'inactivas', texto: 'Inactivas' },
]

export function EtiquetaEstado({ activa }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
        activa ? 'bg-exito-fondo text-exito' : 'bg-arena text-tinta-suave'
      }`}
    >
      {activa ? 'Activa' : 'Inactiva'}
    </span>
  )
}

function BotonAccion({ titulo, onClick, to, tono = 'neutro', children }) {
  const tonos = {
    neutro: 'border-linea text-tinta-suave hover:border-tinta/40 hover:text-tinta',
    peligro: 'border-error/30 text-error hover:border-error',
    exito: 'border-exito/30 text-exito hover:border-exito',
  }
  const clase = `grid size-10 place-items-center rounded-full border-2 bg-white transition-colors ${tonos[tono]}`
  if (to) {
    return (
      <Link to={to} title={titulo} aria-label={titulo} className={clase}>
        {children}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} title={titulo} aria-label={titulo} className={clase}>
      {children}
    </button>
  )
}

function SinResultados({ busqueda }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-linea bg-white px-6 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-papel text-tinta-suave">
        <IconoBuscar width={24} height={24} />
      </span>
      <p className="mt-4 font-display text-xl font-extrabold tracking-tight">Sin resultados</p>
      <p className="mt-1 text-tinta-suave">
        {busqueda
          ? `No encontramos zonas que coincidan con «${busqueda}».`
          : 'Todavía no hay zonas cargadas con ese filtro.'}
        <br />
        Probá con otro código o nombre, o cambiá el filtro de estado.
      </p>
    </div>
  )
}

// HU16 · Consulta y listado de zonas — HU19 · CA 19.1 (interfaz según rol)
export default function Zonas() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const { state } = useLocation()

  const [zonas, setZonas] = useState(null)
  const [puedeGestionar, setPuedeGestionar] = useState(usuario.rol === 'administrador')
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('todas')
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(state?.mensaje ?? null)
  const [porDesactivar, setPorDesactivar] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      const parametros = new URLSearchParams()
      if (busqueda.trim()) parametros.set('q', busqueda.trim())
      if (estado !== 'todas') parametros.set('estado', estado)
      const datos = await api(`/zonas${parametros.size ? `?${parametros}` : ''}`)
      setZonas(datos.zonas)
      setPuedeGestionar(datos.puedeGestionar)
    } catch (e) {
      setError(e.message)
    }
  }, [busqueda, estado])

  // La búsqueda espera a que el vecino deje de escribir (CA 16.2).
  useEffect(() => {
    const id = setTimeout(cargar, busqueda ? 250 : 0)
    return () => clearTimeout(id)
  }, [cargar, busqueda])

  // Limpia el estado de navegación para que el aviso no reaparezca al volver.
  useEffect(() => {
    if (state?.mensaje) navigate('.', { replace: true, state: null })
  }, [state, navigate])

  // HU15 · CA 15.1: antes de desactivar se pide el detalle, que trae el conteo
  // de uso. Confirmar sin saber a cuántos vecinos afecta sería decidir a ciegas.
  async function abrirDesactivacion(zona) {
    setPorDesactivar({ zona, uso: null })
    try {
      const { uso } = await api(`/zonas/${zona.id}`)
      setPorDesactivar({ zona, uso })
    } catch {
      setPorDesactivar({ zona, uso: null })
    }
  }

  async function cambiarEstado(zona, activa) {
    setProcesando(true)
    try {
      const { mensaje } = await api(`/zonas/${zona.id}/estado`, { method: 'PATCH', body: { activa } })
      setAviso(mensaje)
      setPorDesactivar(null)
      await cargar()
    } catch (e) {
      setError(e.message)
      setPorDesactivar(null)
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <BarraSuperior />

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">Zonas del barrio</h1>
            <p className="mt-1 text-tinta-suave">
              {puedeGestionar
                ? 'Gestioná las manzanas y sectores en que se divide el barrio.'
                : 'Consultá las zonas en que se divide el barrio.'}
            </p>
          </div>
          {/* CA 19.1: el alta solo existe para el administrador. */}
          {puedeGestionar && (
            <Boton bloque={false} onClick={() => navigate('/zonas/nueva')}>
              <IconoMas width={18} height={18} />
              Nueva zona
            </Boton>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <label className="relative min-w-60 flex-1">
            <span className="sr-only">Buscar zonas</span>
            <IconoBuscar
              width={18}
              height={18}
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-tinta-suave"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código o nombre…"
              className="w-full rounded-2xl border-2 border-linea bg-white py-3 pr-4 pl-11 text-base outline-none placeholder:text-tinta-suave/60 focus:border-violeta"
            />
          </label>

          {/* CA 16.5: el filtro por estado es exclusivo del administrador. */}
          {puedeGestionar && (
            <label>
              <span className="sr-only">Filtrar por estado</span>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className="h-full rounded-2xl border-2 border-linea bg-white px-4 py-3 text-base font-medium outline-none focus:border-violeta"
              >
                {ESTADOS.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className="mt-5 space-y-3 empty:hidden">
          {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
          {error && <Aviso tipo="error">{error}</Aviso>}
        </div>

        <div className="mt-5">
          {!zonas ? (
            <div className="space-y-3" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl border-2 border-linea/60 bg-white" />
              ))}
            </div>
          ) : zonas.length === 0 ? (
            <SinResultados busqueda={busqueda.trim()} />
          ) : (
            <div className="overflow-hidden rounded-3xl border-2 border-linea/70 bg-white">
              <table className="w-full text-left">
                <caption className="sr-only">
                  Zonas del barrio, ordenadas por su orden de visualización
                </caption>
                <thead>
                  <tr className="border-b-2 border-linea text-xs tracking-wide text-tinta-suave uppercase">
                    <th scope="col" className="px-4 py-3 font-bold sm:px-5">Código</th>
                    <th scope="col" className="px-4 py-3 font-bold sm:px-5">Nombre</th>
                    <th scope="col" className="hidden px-5 py-3 font-bold md:table-cell">Descripción</th>
                    <th scope="col" className="hidden px-4 py-3 font-bold sm:table-cell">Orden</th>
                    <th scope="col" className="px-4 py-3 font-bold">Estado</th>
                    <th scope="col" className="px-4 py-3 sm:px-5">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {zonas.map((z) => (
                    <tr
                      key={z.id}
                      className={`border-b border-linea/50 last:border-b-0 ${z.activa ? '' : 'text-tinta-suave'}`}
                    >
                      <td className="px-4 py-3.5 font-bold sm:px-5">{z.codigo}</td>
                      <td className="px-4 py-3.5 font-medium sm:px-5">{z.nombre}</td>
                      <td className="hidden max-w-xs truncate px-5 py-3.5 text-tinta-suave md:table-cell">
                        {z.descripcion ?? '—'}
                      </td>
                      <td className="hidden px-4 py-3.5 sm:table-cell">{z.orden}</td>
                      <td className="px-4 py-3.5">
                        <EtiquetaEstado activa={z.activa} />
                      </td>
                      <td className="px-4 py-3.5 sm:px-5">
                        <div className="flex justify-end gap-2">
                          <BotonAccion titulo={`Ver el detalle de ${z.codigo}`} to={`/zonas/${z.id}`}>
                            <IconoOjo width={16} height={16} />
                          </BotonAccion>
                          {puedeGestionar && (
                            <>
                              <BotonAccion titulo={`Editar ${z.codigo}`} to={`/zonas/${z.id}/editar`}>
                                <IconoLapiz width={16} height={16} />
                              </BotonAccion>
                              {z.activa ? (
                                <BotonAccion
                                  titulo={`Desactivar ${z.codigo}`}
                                  tono="peligro"
                                  onClick={() => abrirDesactivacion(z)}
                                >
                                  <IconoDesactivar width={16} height={16} />
                                </BotonAccion>
                              ) : (
                                <BotonAccion
                                  titulo={`Reactivar ${z.codigo}`}
                                  tono="exito"
                                  onClick={() => cambiarEstado(z, true)}
                                >
                                  <IconoReactivar width={16} height={16} />
                                </BotonAccion>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-tinta-suave">
          Las zonas se ordenan por su orden de visualización y no alfabéticamente,
          <br className="hidden sm:inline" /> así «Manzana 10» no aparece antes que «Manzana 2».
        </p>
      </main>

      <ModalDesactivar
        porDesactivar={porDesactivar}
        procesando={procesando}
        onCerrar={() => setPorDesactivar(null)}
        onConfirmar={() => cambiarEstado(porDesactivar.zona, false)}
      />
    </div>
  )
}

// HU15 · CA 15.1: la confirmación dice a cuántos vecinos y publicaciones
// afecta, y aclara que el registro no se elimina.
export function ModalDesactivar({ porDesactivar, procesando, onCerrar, onConfirmar }) {
  const zona = porDesactivar?.zona
  const uso = porDesactivar?.uso

  return (
    <Modal
      abierto={Boolean(porDesactivar)}
      titulo={zona ? `¿Desactivar la zona ${zona.codigo}?` : ''}
      onCerrar={onCerrar}
      acciones={
        <>
          <Boton bloque={false} variante="secundario" onClick={onCerrar} disabled={procesando}>
            Cancelar
          </Boton>
          <Boton bloque={false} variante="peligro" onClick={onConfirmar} cargando={procesando}>
            Desactivar zona
          </Boton>
        </>
      }
    >
      <p>
        {uso ? (
          <>
            Esta zona tiene <strong className="text-tinta">{uso.vecinos} {uso.vecinos === 1 ? 'vecino' : 'vecinos'}</strong> y{' '}
            <strong className="text-tinta">{uso.publicaciones} {uso.publicaciones === 1 ? 'publicación' : 'publicaciones'}</strong> asociadas.
          </>
        ) : (
          'Estamos contando cuántos vecinos y publicaciones dependen de esta zona…'
        )}{' '}
        Al desactivarla dejará de ofrecerse al registrarse nuevos vecinos y al crear publicaciones, pero los
        vecinos que ya viven ahí conservan su acceso y el contenido publicado sigue visible.
      </p>
      <p>La zona no se elimina: podés reactivarla en cualquier momento.</p>
    </Modal>
  )
}
