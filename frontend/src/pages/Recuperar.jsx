import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { normalizarEmail, validarEmail } from '@barrio-watch/shared'
import { api } from '../api/cliente.js'
import { Aviso, Boton, Campo } from '../components/Formulario.jsx'
import { IconoFlecha } from '../components/Iconos.jsx'
import PantallaCentrada from '../components/PantallaCentrada.jsx'
import Paloma from '../ilustraciones/Paloma.jsx'

// HU05 · CA 5.1 — Pedir el enlace de recuperación
export default function Recuperar() {
  const { state } = useLocation()
  const [email, setEmail] = useState(state?.email ?? '')
  const [error, setError] = useState(null)
  const [problema, setProblema] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [respuesta, setRespuesta] = useState(null)
  const [vuelta, setVuelta] = useState(0)
  const refEmail = useRef(null)

  async function enviar(e) {
    e.preventDefault()
    const errorEmail = validarEmail(email)
    setError(errorEmail)
    setProblema(null)
    if (errorEmail) {
      refEmail.current?.focus()
      return
    }
    setEnviando(true)
    try {
      const { mensaje } = await api('/auth/recuperar', { method: 'POST', body: { email: normalizarEmail(email) } })
      setRespuesta(mensaje)
    } catch (err) {
      if (err.campos?.email) setError(err.campos.email)
      else setProblema(err.message)
    } finally {
      setEnviando(false)
    }
  }

  function mandarOtro() {
    setRespuesta(null)
    setVuelta((n) => n + 1)
  }

  return (
    <PantallaCentrada fondo="bg-cielo" techos="#C3D9E8">
      <div className="relative mt-24 w-full max-w-md">
        <Paloma
          key={vuelta}
          className="absolute -top-[104px] right-5 w-40 sm:right-8 sm:w-44"
          aletea={enviando}
          vuela={Boolean(respuesta)}
          llega={vuelta > 0}
        />
        <div className="relative rounded-[32px] bg-white px-6 pt-10 pb-8 shadow-[0_24px_60px_-30px_rgba(27,26,46,0.45)] sm:px-10">
          {respuesta ? (
            <div className="entrar" aria-live="polite">
              <p className="font-display text-sm font-bold tracking-wide text-violeta uppercase">Enlace en camino</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">¡La paloma ya salió!</h1>
              <Aviso tipo="exito" className="mt-5">
                {respuesta}
              </Aviso>
              <p className="mt-4 text-tinta-suave">
                Revisá tu bandeja de entrada (y la carpeta de spam, por las dudas). El enlace vale por una hora y se puede usar una sola vez.
              </p>
              <div className="mt-7 space-y-3">
                <Link
                  to="/login"
                  className="inline-flex h-13 w-full items-center justify-center rounded-full bg-tinta px-6 font-bold text-white transition-colors hover:bg-tinta/90"
                >
                  Volver a iniciar sesión
                </Link>
                <Boton variante="secundario" type="button" onClick={mandarOtro}>
                  ¿No te llegó? Mandar otro
                </Boton>
              </div>
            </div>
          ) : (
            <>
              <h1 className="font-display text-3xl font-extrabold tracking-tight">¿Te olvidaste la contraseña?</h1>
              <p className="mt-2 text-tinta-suave">
                Pasa en las mejores familias. Dejanos tu correo y la paloma te lleva un enlace para crear una nueva.
              </p>
              {problema && (
                <Aviso tipo="error" className="mt-5">
                  {problema}
                </Aviso>
              )}
              <form noValidate onSubmit={enviar} className="mt-6 space-y-5">
                <Campo
                  ref={refEmail}
                  etiqueta="Correo electrónico"
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@correo.com"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  error={error}
                />
                <Boton type="submit" cargando={enviando}>
                  Enviar enlace
                </Boton>
              </form>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-tinta-suave transition-colors hover:text-tinta"
              >
                <IconoFlecha width={16} height={16} />
                Volver a iniciar sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </PantallaCentrada>
  )
}
