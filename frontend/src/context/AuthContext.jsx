import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api, configurarSesion } from '../api/cliente.js'

const CLAVE = 'barrio-watch.sesion'
const AuthContext = createContext(null)

function leerGuardada() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE))
    if (guardada?.token && new Date(guardada.expiraEn) > new Date()) return guardada
  } catch {
    // Si localStorage no está disponible o tiene basura, se arranca sin sesión.
  }
  return null
}

function guardar(sesion) {
  try {
    if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion))
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento la sesión dura lo que la pestaña.
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [motivoSalida, setMotivoSalida] = useState(null)
  const temporizador = useRef(null)

  const limpiar = useCallback((motivo = null) => {
    clearTimeout(temporizador.current)
    guardar(null)
    configurarSesion({ token: null })
    setUsuario(null)
    setMotivoSalida(motivo)
  }, [])

  // CA 3.2: la sesión dura hasta que el vecino la cierra o hasta las 12 horas.
  const programarVencimiento = useCallback(
    (expiraEn) => {
      clearTimeout(temporizador.current)
      const restante = new Date(expiraEn) - Date.now()
      // setTimeout no admite más de ~24 días; 12 horas entra de sobra.
      temporizador.current = setTimeout(() => limpiar('expirada'), Math.max(0, restante))
    },
    [limpiar],
  )

  useEffect(() => {
    configurarSesion({ token: null, onExpirada: () => limpiar('expirada') })
    const guardada = leerGuardada()
    if (!guardada) {
      guardar(null)
      setCargando(false)
      return
    }
    configurarSesion({ token: guardada.token })
    api('/auth/sesion')
      .then(({ usuario }) => {
        setUsuario(usuario)
        programarVencimiento(guardada.expiraEn)
      })
      .catch(() => limpiar())
      .finally(() => setCargando(false))
    return () => clearTimeout(temporizador.current)
  }, [limpiar, programarVencimiento])

  // Se separa en dos pasos para que la pantalla de login pueda festejar
  // antes de entrar: primero se validan las credenciales y después se abre la sesión.
  const verificarCredenciales = useCallback(
    (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
    [],
  )

  const abrirSesion = useCallback(
    ({ token, expiraEn, usuario }) => {
      guardar({ token, expiraEn })
      configurarSesion({ token })
      programarVencimiento(expiraEn)
      setMotivoSalida(null)
      setUsuario(usuario)
    },
    [programarVencimiento],
  )

  // CA 3.3: se invalida el token en el servidor y se borra del navegador.
  const cerrarSesion = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' })
    } catch {
      // Aunque el servidor no responda, la sesión local se cierra igual.
    }
    limpiar('cerrada')
  }, [limpiar])

  const valor = useMemo(
    () => ({ usuario, cargando, motivoSalida, verificarCredenciales, abrirSesion, cerrarSesion }),
    [usuario, cargando, motivoSalida, verificarCredenciales, abrirSesion, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contexto = useContext(AuthContext)
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return contexto
}
