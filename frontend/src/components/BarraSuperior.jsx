import { useState } from 'react'
import { NavLink } from 'react-router'
import { IconoMapa, IconoPin, IconoSalir } from './Iconos.jsx'
import Logo from './Logo.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export function Avatar({ nombre, apellido, className = 'size-10 text-sm' }) {
  return (
    <span className={`grid shrink-0 place-items-center rounded-full bg-coral font-display font-bold text-white ${className}`} aria-hidden="true">
      {nombre?.[0]}
      {apellido?.[0]}
    </span>
  )
}

// Barra común de las pantallas privadas. HU19 · CA 19.1: el acceso a la
// gestión de zonas solo aparece para el administrador.
export default function BarraSuperior() {
  const { usuario, cerrarSesion } = useAuth()
  const [saliendo, setSaliendo] = useState(false)
  const esAdministrador = usuario.rol === 'administrador'

  return (
    <header className="sticky top-0 z-20 border-b border-linea/70 bg-papel/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 sm:h-18 sm:px-6">
        <Logo />

        {esAdministrador && (
          <nav className="ml-2 hidden sm:flex" aria-label="Administración">
            <NavLink
              to="/zonas"
              className={({ isActive }) =>
                `inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-bold transition-colors ${
                  isActive ? 'bg-tinta text-white' : 'text-tinta-suave hover:bg-arena hover:text-tinta'
                }`
              }
            >
              <IconoMapa width={18} height={18} />
              Zonas
            </NavLink>
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold sm:inline-flex">
            <IconoPin width={16} height={16} className="text-coral" />
            {usuario.zona.nombre}
          </span>
          <span className="flex items-center gap-2.5">
            <Avatar nombre={usuario.nombre} apellido={usuario.apellido} />
            <span className="leading-tight">
              <span className="block text-sm font-bold">
                {usuario.nombre}
                <span className="hidden md:inline"> {usuario.apellido}</span>
              </span>
              <span className="hidden text-xs text-tinta-suave capitalize md:block">{usuario.rol}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={async () => {
              setSaliendo(true)
              await cerrarSesion()
            }}
            disabled={saliendo}
            className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-linea bg-white px-3 text-sm font-bold transition-colors hover:border-tinta/40 disabled:opacity-60 sm:px-4"
          >
            <IconoSalir width={18} height={18} />
            <span className="hidden sm:inline">Cerrar sesión</span>
            <span className="sr-only sm:hidden">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  )
}
