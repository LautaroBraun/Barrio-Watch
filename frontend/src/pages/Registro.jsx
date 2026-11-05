import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { MENSAJES, LIMITES, normalizarEmail, requisitosPassword, validarRegistro } from '@barrio-watch/shared'
import { api } from '../api/cliente.js'
import {
  Aviso,
  Boton,
  Campo,
  CampoCasilla,
  CampoPassword,
  CampoSelect,
  ListaRequisitos,
  MensajeCampo,
} from '../components/Formulario.jsx'
import { IconoSobre } from '../components/Iconos.jsx'
import Logo from '../components/Logo.jsx'
import Modal from '../components/Modal.jsx'
import Casa from '../ilustraciones/Casa.jsx'
import { DOCUMENTOS } from '../textos/legales.js'

// HU08 · CA 8.1: el teléfono viaja vacío si no se completa; es opcional.
// HU07 · CA 7.1: la aceptación arranca sin marcar y es obligatoria.
const VACIO = { nombre: '', apellido: '', email: '', telefono: '', password: '', idZona: '', terminos: false }
const COLORES_CONFETI = ['#FF7A45', '#F5C542', '#6C5CE7', '#2EC4B6', '#1B1A2E']

function Confeti() {
  const piezas = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        color: COLORES_CONFETI[i % COLORES_CONFETI.length],
        cx: `${Math.round((Math.random() - 0.5) * 320)}px`,
        cy: `${Math.round(-60 - Math.random() * 200)}px`,
        cr: `${Math.round((Math.random() - 0.5) * 720)}deg`,
        retraso: `${Math.random() * 0.25}s`,
        ancho: 6 + Math.round(Math.random() * 6),
      })),
    [],
  )
  return (
    <div className="pointer-events-none absolute top-[62%] left-1/2" aria-hidden="true">
      {piezas.map((p, i) => (
        <span
          key={i}
          className="confeti absolute block h-2.5 rounded-sm"
          style={{ background: p.color, width: p.ancho, '--cx': p.cx, '--cy': p.cy, '--cr': p.cr, animationDelay: p.retraso }}
        />
      ))}
    </div>
  )
}

function textoProgreso(listos, total, creada) {
  if (creada) return '¡Te damos la bienvenida al barrio!'
  if (listos === 0) return 'Completá tus datos y vamos levantando tu casa.'
  if (listos === total) return '¡Tu casa está lista! Solo falta tocar «Crear cuenta».'
  const faltan = total - listos
  return `¡Vamos bien! ${faltan === 1 ? 'Falta 1 dato' : `Faltan ${faltan} datos`}.`
}

// HU06 · CA 6.1 — lo que se ve apenas la cuenta queda creada: el correo salió
// y hasta que no se confirme la cuenta entra en solo lectura (CA 6.4).
function RevisaTuCorreo({ cuenta, reenvio, onReenviar }) {
  return (
    <div className="entrar">
      <span className="grid size-14 place-items-center rounded-full bg-violeta-claro text-violeta">
        <IconoSobre width={26} height={26} />
      </span>
      <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Revisá tu correo</h1>
      <p className="mt-2 text-tinta-suave">
        {cuenta.nombre}, le mandamos un enlace a <strong className="font-bold text-tinta">{cuenta.email}</strong> para
        confirmar que la casilla es tuya. El enlace vale 24 horas y se usa una sola vez.
      </p>
      <p className="mt-3 text-sm text-tinta-suave">
        Hasta confirmarlo vas a poder entrar y leer lo que pasa en tu zona, pero todavía no publicar ni reportar.
      </p>

      <div className="mt-6 space-y-3 empty:hidden">
        {reenvio.estado === 'enviado' && <Aviso tipo="exito">{reenvio.mensaje}</Aviso>}
        {reenvio.estado === 'espera' && <Aviso tipo="aviso">{reenvio.mensaje}</Aviso>}
      </div>

      <div className="mt-6 space-y-3">
        <Boton variante="secundario" onClick={onReenviar} cargando={reenvio.estado === 'enviando'}>
          Reenviar el correo
        </Boton>
        <p className="text-center text-sm text-tinta-suave">
          ¿No llegó? Mirá en correo no deseado, o{' '}
          <Link to="/login" className="font-bold text-tinta underline decoration-violeta decoration-2 underline-offset-4 hover:decoration-tinta">
            entrá igual
          </Link>{' '}
          y confirmalo más tarde.
        </p>
      </div>
    </div>
  )
}

// HU01 · Registro de usuario — HU02 · Validación de los datos de registro
export default function Registro() {
  const [datos, setDatos] = useState(VACIO)
  const [tocados, setTocados] = useState({})
  const [enviado, setEnviado] = useState(false)
  const [erroresServidor, setErroresServidor] = useState({})
  const [problema, setProblema] = useState(null)
  const [verPassword, setVerPassword] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [creada, setCreada] = useState(false)
  const [zonas, setZonas] = useState(null)
  const [errorZonas, setErrorZonas] = useState(null)
  // HU06 · CA 6.1: con la cuenta creada el formulario deja paso al aviso de
  // «revisá tu correo», que también permite pedir el enlace de nuevo.
  const [cuenta, setCuenta] = useState(null)
  const [reenvio, setReenvio] = useState({ estado: 'listo', mensaje: null })
  // HU07 · CA 7.3: los textos se abren en un diálogo, sin navegar, así no se
  // pierde nada de lo ya cargado en el formulario.
  const [documento, setDocumento] = useState(null)
  const refs = {
    nombre: useRef(null),
    apellido: useRef(null),
    email: useRef(null),
    telefono: useRef(null),
    password: useRef(null),
    idZona: useRef(null),
    terminos: useRef(null),
  }
  const refPanel = useRef(null)

  useEffect(() => {
    api('/zonas')
      .then(({ zonas }) => setZonas(zonas))
      .catch((e) => setErrorZonas(e.message))
  }, [])

  const validacion = validarRegistro(datos)
  const requisitos = requisitosPassword(datos.password)

  // Qué error mostrar en cada campo: el de formato apenas se sale del campo
  // (CA 2.1), el de obligatorio recién al intentar crear la cuenta (CA 2.3).
  const errorVisible = (campo) => {
    if (erroresServidor[campo]) return erroresServidor[campo]
    const error = validacion[campo]
    if (!error) return null
    if (error === MENSAJES.obligatorio) return enviado ? error : null
    if (campo === 'password') return null // lo explica la lista de requisitos
    return tocados[campo] || enviado ? error : null
  }

  // CA 2.1 y 2.2: con un correo mal escrito o una contraseña débil el botón
  // queda deshabilitado. Los campos vacíos se señalan al presionarlo (CA 2.3).
  // CA 7.1: la casilla sin marcar deshabilita el botón desde el principio, no
  // recién después del primer intento como el resto de los campos.
  const hayErroresDeFormato = Object.entries(validacion).some(([campo, error]) => {
    if (campo === 'terminos') return true
    if (error === MENSAJES.obligatorio) return false
    if (campo === 'password') return true
    return tocados[campo] || enviado
  })

  const listos = [
    !validacion.nombre,
    !validacion.apellido,
    !validacion.email,
    !validacion.password,
    !validacion.idZona,
  ].filter(Boolean).length

  const cambiar = (campo) => (e) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }))
    if (erroresServidor[campo]) setErroresServidor((x) => ({ ...x, [campo]: null }))
  }
  const cambiarCasilla = (campo) => (e) => {
    setDatos((d) => ({ ...d, [campo]: e.target.checked }))
    setTocados((t) => ({ ...t, [campo]: true }))
  }
  const tocar = (campo) => () => setTocados((t) => ({ ...t, [campo]: true }))

  // HU06 · CA 6.5. El servidor responde 429 con los minutos que faltan cuando
  // ya mandó uno hace menos de cinco minutos; acá solo se muestra.
  async function reenviarVerificacion() {
    setReenvio({ estado: 'enviando', mensaje: null })
    try {
      const { mensaje } = await api('/auth/reenviar-verificacion', { method: 'POST', body: { email: cuenta.email } })
      setReenvio({ estado: 'enviado', mensaje })
    } catch (error) {
      setReenvio({ estado: 'espera', mensaje: error.message })
    }
  }

  async function enviar(e) {
    e.preventDefault()
    setEnviado(true)
    setProblema(null)

    const campoConError = Object.keys(VACIO).find((campo) => validacion[campo])
    if (campoConError) {
      refs[campoConError].current?.focus()
      return
    }

    setEnviando(true)
    try {
      const { usuario } = await api('/usuarios/registro', {
        method: 'POST',
        body: {
          ...datos,
          email: normalizarEmail(datos.email),
          telefono: datos.telefono.trim() || null,
          idZona: Number(datos.idZona),
        },
      })
      setCreada(true)
      refPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // CA 6.1: la cuenta existe pero todavía no está confirmada, así que en
      // lugar de llevar al login se explica que hay un correo esperando.
      setTimeout(() => setCuenta({ email: usuario.email, nombre: usuario.nombre }), 1800)
    } catch (error) {
      setEnviando(false)
      if (error.campos && Object.keys(error.campos).length) {
        // CA 1.3 y CA 2.4: los errores del servidor se muestran junto a cada campo.
        setErroresServidor(error.campos)
        const primero = Object.keys(VACIO).find((campo) => error.campos[campo])
        refs[primero]?.current?.focus()
      } else {
        setProblema(error.message)
      }
    }
  }

  const zonaElegida = zonas?.find((z) => String(z.id) === datos.idZona)
  const idRequisitos = 'requisitos-password'

  return (
    <main className="min-h-dvh p-3 sm:p-6 lg:grid lg:place-items-center">
      <div className="mx-auto grid w-full max-w-[1120px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_-28px_rgba(27,26,46,0.35)] lg:grid-cols-[1fr_1.02fr] lg:rounded-[36px]">
        {/* Formulario */}
        <section className="order-2 px-6 py-9 sm:px-12 lg:order-1 lg:px-16 lg:py-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 hidden lg:block">
              <Logo />
            </div>

            {cuenta ? (
              <RevisaTuCorreo cuenta={cuenta} reenvio={reenvio} onReenviar={reenviarVerificacion} />
            ) : (
              <>
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">Sumate al barrio</h1>
            <p className="mt-2 text-tinta-suave">Creá tu cuenta en un minuto. Tus vecinos ya te están esperando.</p>

            <div className="mt-6 space-y-3 empty:hidden">
              {creada && <Aviso tipo="exito">¡Listo! Tu cuenta fue creada. Te llevamos a iniciar sesión…</Aviso>}
              {problema && <Aviso tipo="error">{problema}</Aviso>}
            </div>

            <form noValidate onSubmit={enviar} className="mt-6 space-y-5">
              <fieldset disabled={creada} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Campo
                    ref={refs.nombre}
                    etiqueta="Nombre"
                    name="nombre"
                    autoComplete="given-name"
                    maxLength={LIMITES.nombre}
                    value={datos.nombre}
                    onChange={cambiar('nombre')}
                    onBlur={tocar('nombre')}
                    error={errorVisible('nombre')}
                  />
                  <Campo
                    ref={refs.apellido}
                    etiqueta="Apellido"
                    name="apellido"
                    autoComplete="family-name"
                    maxLength={LIMITES.apellido}
                    value={datos.apellido}
                    onChange={cambiar('apellido')}
                    onBlur={tocar('apellido')}
                    error={errorVisible('apellido')}
                  />
                </div>

                <Campo
                  ref={refs.email}
                  etiqueta="Correo electrónico"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  maxLength={LIMITES.email}
                  value={datos.email}
                  onChange={cambiar('email')}
                  onBlur={tocar('email')}
                  error={errorVisible('email')}
                />

                {/* HU08 · CA 8.1 y 8.2 — opcional, pero si se carga se valida. */}
                <Campo
                  ref={refs.telefono}
                  etiqueta="Teléfono de contacto (opcional)"
                  type="tel"
                  name="telefono"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+54 351 123 4567"
                  maxLength={LIMITES.telefono}
                  value={datos.telefono}
                  onChange={cambiar('telefono')}
                  onBlur={tocar('telefono')}
                  error={errorVisible('telefono')}
                  ayuda="Solo lo ven los vecinos de tu zona, para contactarte ante una urgencia."
                />

                <div>
                  <CampoPassword
                    ref={refs.password}
                    etiqueta="Contraseña"
                    name="password"
                    autoComplete="new-password"
                    maxLength={LIMITES.passwordMax}
                    value={datos.password}
                    onChange={cambiar('password')}
                    onBlur={tocar('password')}
                    visible={verPassword}
                    onCambiarVisible={setVerPassword}
                    error={errorVisible('password')}
                    aria-describedby={idRequisitos}
                  />
                  <ListaRequisitos
                    id={idRequisitos}
                    requisitos={requisitos}
                    marcarPendientes={Boolean(datos.password) && (tocados.password || enviado)}
                  />
                </div>

                {errorZonas ? (
                  <div>
                    <p className="mb-1.5 text-sm font-semibold">¿En qué parte del barrio vivís?</p>
                    <MensajeCampo error={`No pudimos cargar las zonas. ${errorZonas}`} />
                  </div>
                ) : (
                  <CampoSelect
                    ref={refs.idZona}
                    etiqueta="¿En qué parte del barrio vivís?"
                    name="idZona"
                    placeholder={zonas ? 'Elegí tu zona' : 'Cargando zonas…'}
                    disabled={!zonas}
                    opciones={(zonas ?? []).map((z) => ({ valor: String(z.id), texto: z.descripcion ? `${z.nombre} · ${z.descripcion}` : z.nombre }))}
                    value={datos.idZona}
                    onChange={cambiar('idZona')}
                    onBlur={tocar('idZona')}
                    error={errorVisible('idZona')}
                    ayuda="Vas a ver las publicaciones y alertas de tu zona."
                  />
                )}

                {/* HU07 · CA 7.1 y 7.3 */}
                <CampoCasilla
                  ref={refs.terminos}
                  name="terminos"
                  checked={datos.terminos}
                  onChange={cambiarCasilla('terminos')}
                  error={errorVisible('terminos')}
                >
                  Leí y acepto los{' '}
                  <button type="button" onClick={() => setDocumento('terminos')} className="font-bold text-tinta underline decoration-violeta decoration-2 underline-offset-4 hover:decoration-tinta">
                    términos de uso
                  </button>{' '}
                  y la{' '}
                  <button type="button" onClick={() => setDocumento('privacidad')} className="font-bold text-tinta underline decoration-violeta decoration-2 underline-offset-4 hover:decoration-tinta">
                    política de privacidad
                  </button>.
                </CampoCasilla>
              </fieldset>

              <Boton type="submit" cargando={enviando} disabled={hayErroresDeFormato || creada}>
                Crear cuenta
              </Boton>
            </form>

            <p className="mt-8 text-center text-sm text-tinta-suave">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="font-bold text-tinta underline decoration-violeta decoration-2 underline-offset-4 hover:decoration-tinta">
                Iniciá sesión
              </Link>
            </p>
              </>
            )}
          </div>
        </section>

        {/* Panel ilustrado */}
        <section ref={refPanel} className="relative order-1 flex scroll-mt-4 flex-col overflow-hidden bg-violeta-claro lg:order-2">
          <div className="px-6 pt-6 sm:px-10 sm:pt-9 lg:hidden">
            <Logo />
          </div>
          <div className="px-6 pt-6 sm:px-10 lg:pt-12">
            <p className="font-display text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl lg:text-[2.2rem]">Tu lugar en el barrio</p>
            <p className="mt-2 font-medium text-tinta-suave" aria-live="polite">
              {textoProgreso(listos, 5, creada)}
            </p>
            <div className="mt-4 flex gap-1.5" aria-hidden="true">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className={`h-2 flex-1 rounded-full transition-colors duration-500 ${i < listos || creada ? 'bg-violeta' : 'bg-white'}`} />
              ))}
            </div>
          </div>
          <div className="relative mx-auto mt-auto w-full max-w-[540px] px-4 pt-4">
            <Casa
              className="w-full"
              paredes={!validacion.nombre}
              techo={!validacion.apellido}
              apellido={!validacion.apellido ? datos.apellido.trim() : null}
              buzon={!validacion.email}
              ventanas={requisitos.map((r) => r.cumple)}
              zona={zonaElegida?.nombre}
              lista={creada}
            />
            {creada && <Confeti />}
          </div>
        </section>
      </div>

      {/* CA 7.3: el texto se abre acá mismo, el formulario queda intacto detrás. */}
      <Modal
        abierto={Boolean(documento)}
        titulo={documento ? DOCUMENTOS[documento].titulo : ''}
        onCerrar={() => setDocumento(null)}
        acciones={
          <Boton variante="secundario" bloque={false} onClick={() => setDocumento(null)}>
            Cerrar
          </Boton>
        }
      >
        {documento && (
          <>
            <p className="text-xs font-bold tracking-wide text-tinta-suave uppercase">{DOCUMENTOS[documento].resumen}</p>
            <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
              {DOCUMENTOS[documento].secciones.map((seccion) => (
                <section key={seccion.titulo}>
                  <h3 className="font-bold text-tinta">{seccion.titulo}</h3>
                  {seccion.parrafos.map((parrafo, i) => (
                    <p key={i} className="mt-1">
                      {parrafo}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </>
        )}
      </Modal>
    </main>
  )
}
