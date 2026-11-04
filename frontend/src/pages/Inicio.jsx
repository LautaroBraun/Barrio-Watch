import { useEffect, useState } from 'react'
import { api } from '../api/cliente.js'
import BarraSuperior, { Avatar } from '../components/BarraSuperior.jsx'
import { Aviso, Boton } from '../components/Formulario.jsx'
import { IconoCheck, IconoPin } from '../components/Iconos.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const CATEGORIAS = {
  Seguridad: { color: '#FF7A45', fondo: '#FFE8DD' },
  Servicios: { color: '#5B4BF0', fondo: '#E9E5FF' },
  Eventos: { color: '#B8860B', fondo: '#FFF3CC' },
  'Ayuda mutua': { color: '#138A7E', fondo: '#D9F4F1' },
}
const NIVELES = { baja: 'Alerta baja', media: 'Alerta media', alta: 'Alerta alta', critica: 'Alerta crítica' }

const tiempoRelativo = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' })
function haceCuanto(fecha) {
  const minutos = Math.round((new Date(fecha) - Date.now()) / 60_000)
  if (Math.abs(minutos) < 60) return tiempoRelativo.format(minutos, 'minute')
  const horas = Math.round(minutos / 60)
  if (Math.abs(horas) < 24) return tiempoRelativo.format(horas, 'hour')
  return tiempoRelativo.format(Math.round(horas / 24), 'day')
}

function saludo() {
  const hora = new Date().getHours()
  if (hora >= 6 && hora < 13) return 'Buen día'
  if (hora >= 13 && hora < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

// HU06 · CA 6.4 — aviso persistente mientras la cuenta no confirme el correo.
// Acompaña al bloqueo real, que vive en el servidor (requiereEmailVerificado).
function AvisoSinVerificar({ email }) {
  const [reenvio, setReenvio] = useState({ estado: 'listo', mensaje: null })

  async function reenviar() {
    setReenvio({ estado: 'enviando', mensaje: null })
    try {
      const { mensaje } = await api('/auth/reenviar-verificacion', { method: 'POST' })
      setReenvio({ estado: 'enviado', mensaje })
    } catch (error) {
      setReenvio({ estado: 'espera', mensaje: error.message })
    }
  }

  return (
    <Aviso tipo="aviso" titulo="Te falta confirmar tu correo" className="mb-6">
      {reenvio.estado === 'enviado' || reenvio.estado === 'espera' ? (
        <p>{reenvio.mensaje}</p>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Podés leer lo que pasa en tu zona, pero hasta confirmar <strong className="font-bold">{email}</strong> no vas
            a poder publicar ni reportar.
          </p>
          <Boton
            variante="secundario"
            bloque={false}
            onClick={reenviar}
            cargando={reenvio.estado === 'enviando'}
            className="h-11 shrink-0 text-sm"
          >
            Reenviar el correo
          </Boton>
        </div>
      )}
    </Aviso>
  )
}

function Publicacion({ p }) {
  const estilo = CATEGORIAS[p.categoria] ?? { color: '#5C5A70', fondo: '#EFE7D8' }
  return (
    <article className="entrar relative overflow-hidden rounded-3xl border-2 border-linea/70 bg-white p-5 sm:p-6">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: estilo.color }} aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full px-3 py-1 font-bold" style={{ color: estilo.color, background: estilo.fondo }}>
          {p.categoria}
        </span>
        {p.alerta && (
          <span className="inline-flex items-center gap-1 rounded-full bg-tinta px-3 py-1 font-bold text-white">
            {NIVELES[p.alerta.nivel]}
            {p.alerta.verificada && (
              <span className="inline-flex items-center gap-0.5 font-medium text-mostaza">
                · <IconoCheck width={14} height={14} strokeWidth={3} /> verificada
              </span>
            )}
          </span>
        )}
        <time className="ml-auto text-tinta-suave" dateTime={p.fecha}>
          {haceCuanto(p.fecha)}
        </time>
      </div>
      <h3 className="mt-3 font-display text-xl leading-snug font-bold">{p.titulo}</h3>
      <p className="mt-1.5 leading-relaxed text-tinta/80">{p.descripcion}</p>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-tinta-suave">
        <span className="inline-flex items-center gap-1.5">
          <Avatar nombre={p.autor.split(' ')[0]} apellido={p.autor.split(' ')[1]} className="size-6 text-[10px]" />
          {p.autor}
        </span>
        {p.ubicacion && (
          <span className="inline-flex items-center gap-1">
            <IconoPin width={16} height={16} />
            {p.ubicacion}
          </span>
        )}
      </div>
    </article>
  )
}

function Esqueleto() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-3xl border-2 border-linea/60 bg-white p-6">
          <div className="h-6 w-28 rounded-full bg-arena" />
          <div className="mt-4 h-5 w-2/3 rounded-full bg-arena" />
          <div className="mt-3 h-4 w-full rounded-full bg-arena/70" />
          <div className="mt-2 h-4 w-4/5 rounded-full bg-arena/70" />
        </div>
      ))}
    </div>
  )
}

function Tranquilo({ zona }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-linea bg-white px-6 py-12 text-center">
      <svg viewBox="0 0 120 80" className="mx-auto w-32" aria-hidden="true">
        <circle cx="92" cy="18" r="10" fill="#F5C542" />
        <path d="M20 74 V40 L44 22 L68 40 V74 Z" fill="#EFE7D8" />
        <rect x="38" y="52" width="12" height="22" rx="6" fill="#6C5CE7" />
        <path d="M8 74 H112" stroke="#DDD3C2" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <p className="mt-4 font-display text-xl font-bold">Todo tranquilo en {zona}</p>
      <p className="mt-1 text-tinta-suave">Todavía no hay publicaciones en tu zona. Cuando algún vecino publique, lo vas a ver acá.</p>
    </div>
  )
}

// CA 3.1: pantalla principal con el nombre en la barra y las publicaciones de su zona.
export default function Inicio() {
  const { usuario } = useAuth()
  const [publicaciones, setPublicaciones] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api('/publicaciones')
      .then(({ publicaciones }) => setPublicaciones(publicaciones))
      .catch((e) => setError(e.message))
  }, [])

  const alertas = publicaciones?.filter((p) => p.alerta).length ?? 0

  return (
    <div className="min-h-dvh">
      <BarraSuperior />

      <main className="mx-auto max-w-5xl px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        {!usuario.emailVerificado && <AvisoSinVerificar email={usuario.email} />}

        <section className="relative overflow-hidden rounded-[32px] bg-tinta px-6 py-8 text-white sm:px-10 sm:py-10">
          <svg viewBox="0 0 400 160" className="absolute right-0 bottom-0 hidden h-full opacity-90 sm:block" aria-hidden="true">
            <path d="M150 160 V96 L196 62 L242 96 V160 Z" fill="#2B2A45" />
            <path d="M250 160 V70 L306 30 L362 70 V160 Z" fill="#33325A" />
            <rect x="270" y="90" width="22" height="24" rx="3" fill="#F5C542" />
            <rect x="320" y="90" width="22" height="24" rx="3" fill="#F5C542" opacity="0.5" />
            <rect x="182" y="110" width="18" height="20" rx="3" fill="#F5C542" />
            <circle cx="360" cy="24" r="12" fill="#F5C542" opacity="0.9" />
          </svg>
          <div className="relative max-w-lg">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold sm:hidden">
              <IconoPin width={14} height={14} className="text-coral" />
              {usuario.zona.nombre}
            </p>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:mt-0 sm:text-4xl">
              {saludo()}, {usuario.nombre}
            </h1>
            <p className="mt-2 text-white/75">Esto es lo que está pasando en {usuario.zona.nombre}.</p>
            {publicaciones && (
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {publicaciones.length} {publicaciones.length === 1 ? 'publicación' : 'publicaciones'}
                </span>
                <span className={`rounded-full px-3 py-1.5 ${alertas ? 'bg-coral text-white' : 'bg-white/10'}`}>
                  {alertas} {alertas === 1 ? 'alerta' : 'alertas'} de seguridad
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="titulo-feed">
          <h2 id="titulo-feed" className="font-display text-2xl font-extrabold tracking-tight">
            Novedades de tu zona
          </h2>
          <div className="mt-5">
            {error ? (
              <Aviso tipo="error">{error}</Aviso>
            ) : !publicaciones ? (
              <Esqueleto />
            ) : publicaciones.length === 0 ? (
              <Tranquilo zona={usuario.zona.nombre} />
            ) : (
              <div className="space-y-4">
                {publicaciones.map((p) => (
                  <Publicacion key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
