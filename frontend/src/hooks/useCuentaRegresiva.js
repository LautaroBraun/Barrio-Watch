import { useEffect, useState } from 'react'

// Segundos que faltan hasta una fecha. Se calcula en cada render (así el valor
// es correcto desde el primer momento) y un intervalo fuerza el re-render.
export function useCuentaRegresiva(hasta) {
  const [, setTic] = useState(0)

  useEffect(() => {
    if (!hasta) return
    const intervalo = setInterval(() => setTic((t) => t + 1), 1000)
    return () => clearInterval(intervalo)
  }, [hasta])

  return hasta ? Math.max(0, Math.ceil((new Date(hasta) - Date.now()) / 1000)) : 0
}

export const formatoMinutos = (segundos) =>
  `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
