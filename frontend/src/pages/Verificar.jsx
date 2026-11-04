import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { normalizarEmail, validarEmail } from '@barrio-watch/shared'
import { api } from '../api/cliente.js'
import { Aviso, Boton, Campo } from '../components/Formulario.jsx'
import { IconoCheck, IconoSobre } from '../components/Iconos.jsx'
import PantallaCentrada from '../components/PantallaCentrada.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const ERRORES_ENLACE = ['ENLACE_INVALIDO', 'ENLACE_VENCIDO', 'ENLACE_USADO']

const TITULOS_ENLACE = {
  ENLACE_VENCIDO: 'Este enlace ya venció',
  ENLACE_USADO: 'Este enlace ya se usó',
  ENLACE_INVALIDO: 'Este enlace no funciona',
}

function Tarjeta({ children }) {
  return (
    <div className="w-full max-w-md rounded-[32px] bg-white px-6 py-8 shadow-[0_24px_60px_-30px_rgba(27,26,46,0.45)] sm:px-10">
      {children}
    </div>
  )
}

// HU06 · CA 6.2 y CA 6.3 — Confirmar el correo desde el enlace recibido
export default function Verificar() {
  const { usuario, recargarSesion } = useAuth()
  // Igual que en Restablecer: el token se lee una sola vez y se saca de la
  // barra de direcciones para que no quede en el historial ni en un copiado.
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'))
  const [etapa, setEtapa] = useState(token ? 'verificando' : 'invalido')
  const [enlace, setEnlace] = useState(
    token
      ? null
      : { codigo: 'ENLACE_INVALIDO', mensaje: 'Al enlace le falta una parte. Copialo completo desde el correo o pedí uno nuevo.' },
  )
  const [resultado, setResultado] = useState(null)
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [reenvio, setReenvio] = useState({ estado: 'listo', mensaje: null })
  const refEmail = useRef(null)

  useEffect(() => {
    if (!token) return
    window.history.replaceState(null, '', '/verificar')
    api('/auth/verificar', { method: 'POST', body: { token } })
      .then((datos) => {
        setResultado(datos)
        setEtapa('listo')
        // Si la verificación ocurre con la sesión abierta, el aviso de solo
        // lectura tiene que desaparecer sin obligar a volver a entrar.
        recargarSesion?.()
      })
      .catch((error) => {
        setEnlace({
          codigo: ERRORES_ENLACE.includes(error.codigo) ? error.codigo : 'ENLACE_INVALIDO',
          mensaje: error.message,
        })
        setEtapa('invalido')
      })
  }, [token, recargarSesion])

  const errorEmail = enviado ? validarEmail(email) : null

  // CA 6.3: desde el enlace vencido o usado se pide uno nuevo sin tener que
  // volver al registro. CA 6.5: el servidor puede responder que hay que esperar.
  async function reenviar(e) {
    e.preventDefault()
    setEnviado(true)
    if (validarEmail(email)) return refEmail.current?.focus()

    setReenvio({ estado: 'enviando', mensaje: null })
    try {
      const { mensaje } = await api('/auth/reenviar-verificacion', {
        method: 'POST',
        body: { email: normalizarEmail(email) },
      })
      setReenvio({ estado: 'enviado', mensaje })
    } catch (error) {
      setReenvio({ estado: 'espera', mensaje: error.message })
    }
  }

  let contenido
  if (etapa === 'verificando') {
    contenido = (
      <Tarjeta>
        <div className="flex flex-col items-center gap-4 py-10 text-tinta-suave" role="status">
          <span className="size-8 animate-spin rounded-full border-3 border-violeta border-t-transparent" />
          Confirmando tu correo…
        </div>
      </Tarjeta>
    )
  } else if (etapa === 'listo') {
    // CA 6.2: confirmación con acceso directo al inicio de sesión.
    contenido = (
      <Tarjeta>
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-exito-fondo text-exito">
            <IconoCheck width={28} height={28} strokeWidth={3} />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight">
            Cuenta confirmada{resultado?.nombre ? `, ${resultado.nombre}` : ''}
          </h1>
          <p className="mt-2 text-tinta-suave">{resultado?.mensaje}</p>
        </div>
        <div className="mt-7">
          {usuario ? (
            <Link to="/" className="relative inline-flex h-13 w-full items-center justify-center rounded-full bg-tinta px-6 font-bold text-white transition-all hover:bg-tinta/90 active:scale-[0.98]">
              Ir al barrio
            </Link>
          ) : (
            <Link to="/login" className="relative inline-flex h-13 w-full items-center justify-center rounded-full bg-tinta px-6 font-bold text-white transition-all hover:bg-tinta/90 active:scale-[0.98]">
              Iniciar sesión
            </Link>
          )}
        </div>
      </Tarjeta>
    )
  } else {
    contenido = (
      <Tarjeta>
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-aviso-fondo text-aviso">
            <IconoSobre width={26} height={26} />
          </span>
          <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight">
            {TITULOS_ENLACE[enlace.codigo]}
          </h1>
          <p className="mt-2 text-tinta-suave">{enlace.mensaje}</p>
        </div>

        {reenvio.estado === 'enviado' ? (
          <Aviso tipo="exito" className="mt-7">
            {reenvio.mensaje}
          </Aviso>
        ) : (
          <form noValidate onSubmit={reenviar} className="mt-7 space-y-4">
            <Campo
              ref={refEmail}
              etiqueta="Tu correo electrónico"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errorEmail}
              ayuda="Te mandamos un enlace nuevo a esta casilla."
            />
            {reenvio.estado === 'espera' && <Aviso tipo="aviso">{reenvio.mensaje}</Aviso>}
            <Boton type="submit" cargando={reenvio.estado === 'enviando'}>
              Enviarme un enlace nuevo
            </Boton>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-tinta-suave">
          <Link to="/login" className="font-bold text-tinta underline decoration-violeta decoration-2 underline-offset-4 hover:decoration-tinta">
            Volver al inicio de sesión
          </Link>
        </p>
      </Tarjeta>
    )
  }

  return (
    <PantallaCentrada fondo="bg-violeta-claro" techos="#D4CDF8">
      {contenido}
    </PantallaCentrada>
  )
}
