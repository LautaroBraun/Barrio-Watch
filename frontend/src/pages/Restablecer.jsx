import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { MENSAJES, LIMITES, requisitosPassword, validarPassword } from '@barrio-watch/shared'
import { api } from '../api/cliente.js'
import { Aviso, Boton, CampoPassword, ListaRequisitos } from '../components/Formulario.jsx'
import PantallaCentrada from '../components/PantallaCentrada.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import Llave from '../ilustraciones/Llave.jsx'

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

// HU05 · CA 5.3, 5.4 y 5.5 — Elegir la nueva contraseña desde el enlace
export default function Restablecer() {
  const navigate = useNavigate()
  const { usuario, cerrarSesion } = useAuth()
  // El token se lee una sola vez y se saca de la barra de direcciones.
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'))
  const [etapa, setEtapa] = useState(token ? 'verificando' : 'invalido')
  const [enlace, setEnlace] = useState(
    token ? null : { codigo: 'ENLACE_INVALIDO', mensaje: 'Al enlace le falta una parte. Copialo completo desde el correo o pedí uno nuevo.' },
  )
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [repetida, setRepetida] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [tocados, setTocados] = useState({})
  const [enviado, setEnviado] = useState(false)
  const [errorServidor, setErrorServidor] = useState(null)
  const [problema, setProblema] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [mensajeFinal, setMensajeFinal] = useState('')
  const refPassword = useRef(null)
  const refRepetida = useRef(null)

  useEffect(() => {
    if (!token) return
    window.history.replaceState(null, '', '/restablecer')
    api('/auth/restablecer/verificar', { method: 'POST', body: { token } })
      .then(({ nombre }) => {
        setNombre(nombre)
        setEtapa('formulario')
      })
      .catch((error) => {
        setEnlace({ codigo: ERRORES_ENLACE.includes(error.codigo) ? error.codigo : 'ENLACE_INVALIDO', mensaje: error.message })
        setEtapa('invalido')
      })
  }, [token])

  const requisitos = requisitosPassword(password)
  const errorPassword = validarPassword(password)
  const coinciden = repetida === password
  const errorRepetida = !repetida
    ? enviado ? MENSAJES.obligatorio : null
    : !coinciden && (tocados.repetida || enviado) ? MENSAJES.passwordsDistintas : null

  async function enviar(e) {
    e.preventDefault()
    setEnviado(true)
    setProblema(null)
    if (errorPassword) return refPassword.current?.focus()
    if (!coinciden || !repetida) return refRepetida.current?.focus()

    setEnviando(true)
    try {
      const { mensaje } = await api('/auth/restablecer', { method: 'POST', body: { token, password } })
      setMensajeFinal(mensaje)
      setEtapa('listo')
      // CA 5.5: el servidor cerró todas las sesiones; si había una abierta acá, se borra.
      if (usuario) cerrarSesion()
    } catch (error) {
      if (ERRORES_ENLACE.includes(error.codigo)) {
        setEnlace({ codigo: error.codigo, mensaje: error.message })
        setEtapa('invalido')
      } else if (error.campos?.password) {
        setErrorServidor(error.campos.password)
      } else {
        setProblema(error.message)
      }
    } finally {
      setEnviando(false)
    }
  }

  let contenido
  if (etapa === 'verificando') {
    contenido = (
      <Tarjeta>
        <div className="flex flex-col items-center gap-4 py-10 text-tinta-suave" role="status">
          <span className="size-8 animate-spin rounded-full border-3 border-violeta border-t-transparent" />
          Revisando tu enlace…
        </div>
      </Tarjeta>
    )
  } else if (etapa === 'invalido') {
    // CA 5.4: se explica el motivo y se ofrece pedir un enlace nuevo.
    contenido = (
      <Tarjeta>
        <Llave rota className="mx-auto -mt-2 w-full max-w-72" />
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">{TITULOS_ENLACE[enlace.codigo]}</h1>
        <Aviso tipo="error" className="mt-5">
          {enlace.mensaje}
        </Aviso>
        <p className="mt-4 text-tinta-suave">No pasa nada: pedí otro enlace y en un ratito lo tenés en tu correo.</p>
        <Link
          to="/recuperar"
          className="mt-7 inline-flex h-13 w-full items-center justify-center rounded-full bg-tinta px-6 font-bold text-white transition-colors hover:bg-tinta/90"
        >
          Pedir un enlace nuevo
        </Link>
      </Tarjeta>
    )
  } else if (etapa === 'listo') {
    contenido = (
      <Tarjeta>
        <Llave abierta dientes={[true, true, true, true]} className="mx-auto -mt-2 w-full max-w-72" />
        <div className="entrar" style={{ animationDelay: '0.9s' }}>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">¡Listo, llave nueva!</h1>
          <Aviso tipo="exito" className="mt-5">
            {mensajeFinal}
          </Aviso>
          <p className="mt-4 text-tinta-suave">Por seguridad cerramos tu sesión en todos los dispositivos donde estaba abierta.</p>
          <Boton type="button" className="mt-7" onClick={() => navigate('/login', { state: { restablecida: true } })}>
            Iniciar sesión
          </Boton>
        </div>
      </Tarjeta>
    )
  } else {
    contenido = (
      <Tarjeta>
        <Llave dientes={requisitos.map((r) => r.cumple)} dorada={!errorPassword && coinciden} className="mx-auto -mt-2 w-full max-w-72" />
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">
          {nombre ? `Hola, ${nombre}.` : 'Hola.'} Hagamos una llave nueva
        </h1>
        <p className="mt-2 text-tinta-suave">Elegí tu nueva contraseña. Cada requisito que cumplas le agrega un diente a la llave.</p>
        {problema && (
          <Aviso tipo="error" className="mt-5">
            {problema}
          </Aviso>
        )}
        <form noValidate onSubmit={enviar} className="mt-6 space-y-5">
          <div>
            <CampoPassword
              ref={refPassword}
              etiqueta="Nueva contraseña"
              name="password"
              autoComplete="new-password"
              autoFocus
              maxLength={LIMITES.passwordMax}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setErrorServidor(null)
              }}
              onBlur={() => setTocados((t) => ({ ...t, password: true }))}
              visible={verPassword}
              onCambiarVisible={setVerPassword}
              error={errorServidor ?? (enviado && !password ? MENSAJES.obligatorio : null)}
              aria-describedby="requisitos-nueva"
            />
            <ListaRequisitos
              id="requisitos-nueva"
              requisitos={requisitos}
              marcarPendientes={Boolean(password) && (tocados.password || enviado)}
            />
          </div>
          <CampoPassword
            ref={refRepetida}
            etiqueta="Repetí la contraseña"
            name="repetida"
            autoComplete="new-password"
            maxLength={LIMITES.passwordMax}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
            onBlur={() => setTocados((t) => ({ ...t, repetida: true }))}
            visible={verPassword}
            onCambiarVisible={setVerPassword}
            error={errorRepetida}
          />
          <Boton type="submit" cargando={enviando} disabled={Boolean(password) && Boolean(errorPassword)}>
            Guardar contraseña
          </Boton>
        </form>
      </Tarjeta>
    )
  }

  return (
    <PantallaCentrada fondo="bg-[#DDF3EE]" techos="#BFE3D9">
      {contenido}
    </PantallaCentrada>
  )
}
