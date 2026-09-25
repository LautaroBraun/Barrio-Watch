import { useCallback, useEffect, useRef, useState } from 'react'

// Estado de ánimo pasajero de una ilustración: reacciona y a los pocos
// segundos vuelve a la calma. El pulso permite repetir la misma reacción.
export function useReaccion(inicial = 'neutral') {
  const [estado, setEstado] = useState({ animo: inicial, pulso: 0 })
  const temporizador = useRef(null)

  const reaccionar = useCallback((animo, duracion = 2400) => {
    clearTimeout(temporizador.current)
    setEstado((e) => ({ animo, pulso: e.pulso + 1 }))
    if (duracion) {
      temporizador.current = setTimeout(() => setEstado((e) => ({ ...e, animo: 'neutral' })), duracion)
    }
  }, [])

  useEffect(() => () => clearTimeout(temporizador.current), [])

  return [estado, reaccionar]
}
