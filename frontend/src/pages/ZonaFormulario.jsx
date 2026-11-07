import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { LIMITES, MENSAJES, validarZonaFormulario } from '@barrio-watch/shared'
import { api } from '../api/cliente.js'
import BarraSuperior from '../components/BarraSuperior.jsx'
import { Aviso, Boton, Campo, CampoArea, CampoBloqueado, CampoCasilla } from '../components/Formulario.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const VACIO = { codigo: '', nombre: '', descripcion: '', orden: '', activa: true }

function fechaHora(valor) {
  return new Date(valor).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

// HU13 · Alta de zona — HU14 · Modificación de zona
// La misma pantalla sirve para los dos casos: lo único que cambia es que en la
// edición el código se muestra bloqueado (CA 14.2) y no viaja al servidor.
export default function ZonaFormulario() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const esEdicion = Boolean(id)

  const [datos, setDatos] = useState(VACIO)
  const [zona, setZona] = useState(null)
  const [cargando, setCargando] = useState(esEdicion)
  const [enviado, setEnviado] = useState(false)
  const [tocados, setTocados] = useState({})
  const [erroresServidor, setErroresServidor] = useState({})
  const [problema, setProblema] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const refs = { codigo: useRef(null), nombre: useRef(null), orden: useRef(null), descripcion: useRef(null) }

  // CA 19.1 y 19.2: la pantalla no es para vecinos. El servidor igual rechaza
  // la operación con 403; esto solo evita mostrar un formulario inútil.
  const esAdministrador = usuario.rol === 'administrador'

  useEffect(() => {
    if (!esEdicion) return
    api(`/zonas/${id}`)
      .then(({ zona }) => {
        setZona(zona)
        setDatos({
          codigo: zona.codigo,
          nombre: zona.nombre,
          descripcion: zona.descripcion ?? '',
          orden: String(zona.orden),
          activa: zona.activa,
        })
      })
      .catch((e) => setProblema(e.message))
      .finally(() => setCargando(false))
  }, [esEdicion, id])

  const validacion = validarZonaFormulario(datos, { conCodigo: !esEdicion })

  const errorVisible = (campo) => {
    if (erroresServidor[campo]) return erroresServidor[campo]
    const error = validacion[campo]
    if (!error) return null
    if (error === MENSAJES.obligatorio) return enviado ? error : null
    return tocados[campo] || enviado ? error : null
  }

  // CA 18.2: mientras falte un dato obligatorio o haya un formato inválido, el
  // botón de confirmación queda deshabilitado.
  const incompleto = Object.keys(validacion).length > 0

  const cambiar = (campo) => (e) => {
    const valor = campo === 'codigo' ? e.target.value.toUpperCase() : e.target.value
    setDatos((d) => ({ ...d, [campo]: valor }))
    if (erroresServidor[campo]) setErroresServidor((x) => ({ ...x, [campo]: null }))
  }
  const tocar = (campo) => () => setTocados((t) => ({ ...t, [campo]: true }))

  async function enviar(e) {
    e.preventDefault()
    setEnviado(true)
    setProblema(null)

    const primero = ['codigo', 'nombre', 'orden', 'descripcion'].find((campo) => validacion[campo])
    if (primero) return refs[primero].current?.focus()

    const cuerpo = {
      nombre: datos.nombre.trim(),
      descripcion: datos.descripcion.trim() || null,
      orden: Number(datos.orden),
      activa: datos.activa,
    }
    if (!esEdicion) cuerpo.codigo = datos.codigo.trim()

    setGuardando(true)
    try {
      const { mensaje } = esEdicion
        ? await api(`/zonas/${id}`, { method: 'PUT', body: cuerpo })
        : await api('/zonas', { method: 'POST', body: cuerpo })
      // El aviso se muestra en el listado, que es adonde vuelve el administrador.
      navigate('/zonas', { state: { mensaje } })
    } catch (error) {
      setGuardando(false)
      if (error.campos && Object.keys(error.campos).length) {
        setErroresServidor(error.campos)
        const campo = ['codigo', 'nombre', 'orden', 'descripcion'].find((c) => error.campos[c])
        refs[campo]?.current?.focus()
      } else {
        setProblema(error.message)
      }
    }
  }

  return (
    <div className="min-h-dvh">
      <BarraSuperior />
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-16 sm:px-6 sm:pt-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {esEdicion ? 'Editar zona' : 'Nueva zona'}
        </h1>
        <p className="mt-1 text-tinta-suave">
          {esEdicion
            ? 'Modificá el nombre, la descripción o el orden de la zona.'
            : 'Creá una manzana o sector del barrio.'}
        </p>

        {!esAdministrador ? (
          <Aviso tipo="error" className="mt-8">
            Esta pantalla es exclusiva del administrador del barrio.
          </Aviso>
        ) : cargando ? (
          <div className="mt-10 flex items-center gap-3 text-tinta-suave" role="status">
            <span className="size-6 animate-spin rounded-full border-3 border-violeta border-t-transparent" />
            Buscando la zona…
          </div>
        ) : (
          <form noValidate onSubmit={enviar} className="mt-8 space-y-5">
            {problema && <Aviso tipo="error">{problema}</Aviso>}

            <div className="grid gap-5 sm:grid-cols-2">
              {esEdicion ? (
                <CampoBloqueado etiqueta="Código" valor={datos.codigo} ayuda="El código no puede modificarse." />
              ) : (
                <Campo
                  ref={refs.codigo}
                  etiqueta="Código *"
                  name="codigo"
                  placeholder="MZ-05"
                  maxLength={LIMITES.codigoZona}
                  value={datos.codigo}
                  onChange={cambiar('codigo')}
                  onBlur={tocar('codigo')}
                  error={errorVisible('codigo')}
                  ayuda="Dos letras, guion y dos o tres números. No podrá modificarse después."
                />
              )}
              <Campo
                ref={refs.orden}
                etiqueta="Orden de visualización *"
                name="orden"
                type="number"
                min={0}
                inputMode="numeric"
                value={datos.orden}
                onChange={cambiar('orden')}
                onBlur={tocar('orden')}
                error={errorVisible('orden')}
                ayuda="Define la posición en el listado y en el selector del registro."
              />
            </div>

            <Campo
              ref={refs.nombre}
              etiqueta="Nombre *"
              name="nombre"
              placeholder="Manzana 5"
              maxLength={LIMITES.nombreZona}
              value={datos.nombre}
              onChange={cambiar('nombre')}
              onBlur={tocar('nombre')}
              error={errorVisible('nombre')}
            />

            <CampoArea
              ref={refs.descripcion}
              etiqueta="Descripción"
              name="descripcion"
              placeholder="Referencia geográfica de la zona (opcional)"
              maxLength={LIMITES.descripcionZona}
              value={datos.descripcion}
              onChange={cambiar('descripcion')}
              onBlur={tocar('descripcion')}
              error={errorVisible('descripcion')}
            />

            <CampoCasilla
              name="activa"
              checked={datos.activa}
              onChange={(e) => setDatos((d) => ({ ...d, activa: e.target.checked }))}
            >
              Zona activa — se ofrece en el registro de vecinos y en la creación de publicaciones.
            </CampoCasilla>

            {/* HU19 · CA 19.4: quién tocó esto por última vez, y cuándo. */}
            {esEdicion && zona?.ultimaModificacion && (
              <Aviso tipo="aviso">
                Última modificación: <strong className="font-bold">{fechaHora(zona.ultimaModificacion.fecha)}</strong>
                {zona.ultimaModificacion.autor ? ` por ${zona.ultimaModificacion.autor}` : ''}.
              </Aviso>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
              <Boton variante="secundario" bloque={false} type="button" onClick={() => navigate('/zonas')}>
                Cancelar
              </Boton>
              <Boton bloque={false} type="submit" cargando={guardando} disabled={incompleto}>
                {esEdicion ? 'Guardar cambios' : 'Crear zona'}
              </Boton>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
