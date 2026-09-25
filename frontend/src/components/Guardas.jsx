import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext.jsx'
import { Isotipo } from './Logo.jsx'

function PantallaCarga() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <div className="flex flex-col items-center gap-3 text-tinta-suave">
        <Isotipo className="size-12 animate-pulse" />
        <p className="text-sm font-medium">Abriendo el barrio…</p>
      </div>
    </div>
  )
}

// CA 3.3: sin sesión no se puede entrar a las pantallas privadas, ni siquiera
// volviendo con el botón "atrás" del navegador.
export function RutaPrivada() {
  const { usuario, cargando } = useAuth()
  const ubicacion = useLocation()
  if (cargando) return <PantallaCarga />
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
  return <Outlet />
}

// Login y registro no tienen sentido con la sesión abierta.
export function SoloInvitados() {
  const { usuario, cargando } = useAuth()
  const ubicacion = useLocation()
  if (cargando) return <PantallaCarga />
  if (usuario) return <Navigate to={ubicacion.state?.desde ?? '/'} replace />
  return <Outlet />
}
