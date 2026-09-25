import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { MENSAJES, normalizarEmail } from '@barrio-watch/shared'
import { Aviso, Boton, Campo, CampoPassword } from '../components/Formulario.jsx'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatoMinutos, useCuentaRegresiva } from '../hooks/useCuentaRegresiva.js'
import { useReaccion } from '../hooks/useReaccion.js'
import Vecinos from '../ilustraciones/Vecinos.jsx'

// "No" con la cabeza: el formulario se sacude al rechazar las credenciales.
function sacudir(elemento) {
  if (!elemento || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  elemento.animate(
    [0, -7, 6, -4, 2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
    { duration: 420, easing: 'ease-in-out' },
  )
}

const horaCorta = (fecha) => new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })

// HU03 · Inicio de sesión — HU04 · Verificación de credenciales
export default function Login() {
  const { verificarCredenciales, abrirSesion, motivoSalida } = useAuth()
  const { state } = useLocation()

  const [email, setEmail] = useState(state?.email ?? '')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [errores, setErrores] = useState({})
  const [problema, setProblema] = useState(null)
  const [bloqueadaHasta, setBloqueadaHasta] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [nombre, setNombre] = useState(state?.nombre)
  const [{ animo, pulso }, reaccionar] = useReaccion(state?.registrado ? 'saludo' : 'neutral')

  const refPassword = useRef(null)
  const refEmail = useRef(null)
  const refFormulario = useRef(null)
  const segundosBloqueo = useCuentaRegresiva(bloqueadaHasta)

  useEffect(() => {
    if (state?.registrado) reaccionar('saludo', 3200)
    ;(state?.email ? refPassword : refEmail).current?.focus()
    // Solo al entrar a la pantalla.
  }, [])

  useEffect(() => {
    if (bloqueadaHasta && segundosBloqueo === 0) {
      setBloqueadaHasta(null)
      setProblema(null)
    }
  }, [bloqueadaHasta, segundosBloqueo])

  async function enviar(e) {
    e.preventDefault()
    const faltantes = {}
    if (!email.trim()) faltantes.email = MENSAJES.obligatorio
    if (!password) faltantes.password = MENSAJES.obligatorio
    setErrores(faltantes)
    if (Object.keys(faltantes).length) {
      ;(faltantes.email ? refEmail : refPassword).current?.focus()
      return
    }

    setEnviando(true)
    setProblema(null)
    try {
      const datos = await verificarCredenciales(normalizarEmail(email), password)
      // Festejo breve y recién ahí se abre la sesión (la guarda de rutas lleva al inicio).
      setVerPassword(false)
      setNombre(datos.usuario.nombre)
      reaccionar('exito', 0)
      const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setTimeout(() => abrirSesion(datos), reducido ? 150 : 1100)
    } catch (error) {
      setEnviando(false)
      if (error.codigo === 'CUENTA_BLOQUEADA') {
        setBloqueadaHasta(error.datos.bloqueadaHasta)
        setProblema({ tipo: 'bloqueo', mensaje: error.message })
        setPassword('')
        reaccionar('bloqueo', 3600)
        return
      }
      if (error.codigo === 'CREDENCIALES_INVALIDAS') {
        // CA 4.1: se limpia la contraseña y no se dice cuál de los dos datos falló.
        setPassword('')
        refPassword.current?.focus()
      }
      if (error.codigo === 'DATOS_INVALIDOS') setErrores(error.campos)
      setProblema({ tipo: 'error', mensaje: error.message })
      sacudir(refFormulario.current)
      reaccionar('error')
    }
  }

  const bloqueada = segundosBloqueo > 0

  return (
    <main className="min-h-dvh p-3 sm:p-6 lg:grid lg:place-items-center">
      <div className="mx-auto grid w-full max-w-[1120px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_-28px_rgba(27,26,46,0.35)] lg:min-h-[660px] lg:grid-cols-[1.08fr_1fr] lg:rounded-[36px]">
        {/* Panel ilustrado */}
        <section className="relative flex flex-col overflow-hidden bg-arena">
          <div className="px-6 pt-6 sm:px-10 sm:pt-9">
            <Logo />
            <div className="mt-8 hidden max-w-sm lg:block">
              <p className="font-display text-[2.6rem] leading-[1.02] font-extrabold tracking-tight text-balance">
                La cuadra se cuida entre todos.
              </p>
              <p className="mt-3 text-tinta-suave">Alertas, servicios y ayuda mutua de tu barrio, en un solo lugar.</p>
            </div>
          </div>
          <Vecinos
            className="mt-2 lg:mt-auto"
            animo={animo}
            pulso={pulso}
            deEspaldas={verPassword && password.length > 0}
            nombre={nombre}
          />
        </section>

        {/* Formulario */}
        <section className="flex flex-col justify-center px-6 py-9 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">¡Qué bueno verte de nuevo!</h1>
            <p className="mt-2 text-tinta-suave">Ingresá tus datos para ver qué está pasando en tu cuadra.</p>

            <div className="mt-6 space-y-3 empty:hidden">
              {state?.registrado && !problema && (
                <Aviso tipo="exito">¡Listo{nombre ? `, ${nombre}` : ''}! Tu cuenta fue creada. Ya podés iniciar sesión.</Aviso>
              )}
              {state?.restablecida && !problema && (
                <Aviso tipo="exito">Tu contraseña fue actualizada. Entrá con la nueva.</Aviso>
              )}
              {motivoSalida === 'expirada' && !problema && (
                <Aviso tipo="info">Tu sesión terminó. Iniciá sesión de nuevo para seguir.</Aviso>
              )}
              {problema?.tipo === 'error' && <Aviso tipo="error">{problema.mensaje}</Aviso>}
              {problema?.tipo === 'bloqueo' && bloqueada && (
                <Aviso tipo="aviso" titulo="Acceso bloqueado por unos minutos">
                  {problema.mensaje} Vas a poder volver a intentar a las {horaCorta(bloqueadaHasta)}.
                </Aviso>
              )}
            </div>

            <form ref={refFormulario} noValidate onSubmit={enviar} className="mt-6 space-y-5">
              <Campo
                ref={refEmail}
                etiqueta="Correo electrónico"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errores.email) setErrores((x) => ({ ...x, email: null }))
                }}
                error={errores.email}
              />
              <CampoPassword
                ref={refPassword}
                etiqueta="Contraseña"
                name="password"
                autoComplete="current-password"
                placeholder="Tu contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errores.password) setErrores((x) => ({ ...x, password: null }))
                }}
                visible={verPassword}
                onCambiarVisible={setVerPassword}
                error={errores.password}
                extra={
                  <Link to="/recuperar" state={{ email }} className="text-sm font-semibold text-violeta hover:underline">
                    ¿Olvidaste tu contraseña?
                  </Link>
                }
              />
              <Boton type="submit" cargando={enviando} disabled={bloqueada}>
                {bloqueada ? `Esperá ${formatoMinutos(segundosBloqueo)}` : 'Iniciar sesión'}
              </Boton>
            </form>

            <p className="mt-8 text-center text-sm text-tinta-suave">
              ¿Todavía no tenés cuenta?{' '}
              <Link to="/registro" className="font-bold text-tinta underline decoration-coral decoration-2 underline-offset-4 hover:decoration-tinta">
                Sumate al barrio
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
