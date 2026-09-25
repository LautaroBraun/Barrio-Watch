import { useEffect, useRef } from 'react'

const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor))

let lienzo = null

// Punto de la pantalla donde está el cursor de texto de un input, para que
// los personajes "lean" lo que se va escribiendo.
function posicionDelTexto(input) {
  const caja = input.getBoundingClientRect()
  if (input.tagName !== 'INPUT') {
    return { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 }
  }
  const estilo = getComputedStyle(input)
  lienzo ??= document.createElement('canvas').getContext('2d')
  lienzo.font = `${estilo.fontWeight} ${estilo.fontSize} ${estilo.fontFamily}`

  // Los inputs de tipo email no exponen selectionStart: se usa el final del texto.
  let hasta = input.value.length
  try {
    if (typeof input.selectionStart === 'number') hasta = input.selectionStart
  } catch {
    // Algunos tipos de input tiran error al leer la selección.
  }
  const texto = input.type === 'password' ? '•'.repeat(hasta) : input.value.slice(0, hasta)
  const izquierda = parseFloat(estilo.paddingLeft) || 0
  const derecha = parseFloat(estilo.paddingRight) || 0
  const ancho = Math.min(lienzo.measureText(texto).width, caja.width - izquierda - derecha)
  return { x: caja.left + izquierda + ancho, y: caja.top + caja.height / 2 }
}

/**
 * Hace que los personajes de una ilustración sigan con la mirada al puntero
 * o al campo de texto que se está usando.
 *
 * Cada personaje registrado debe tener adentro un elemento [data-ancla] (el
 * punto medio entre los ojos). El hook escribe en el personaje las variables
 * CSS --px/--py (pupilas), --fx/--fy (rostro) y --lean (inclinación), que el
 * CSS convierte en transformaciones. Todo se hace fuera de React para no
 * re-renderizar 60 veces por segundo.
 */
export function useMirada({ maxPupila = 3.2, maxRostro = 3.6, maxInclinacion = 3.5 } = {}) {
  const personajes = useRef([])

  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const tactil = window.matchMedia('(pointer: coarse)').matches
    // De entrada miran hacia el formulario (a la derecha); en pantallas
    // táctiles, de frente hasta que se toque algo.
    let objetivo = tactil ? null : { x: window.innerWidth * 0.72, y: window.innerHeight * 0.42 }
    let anclas = []
    const actual = []
    let cuadro = 0
    let contador = 0

    const medir = () => {
      anclas = personajes.current.map((el) => {
        const ancla = el?.querySelector('[data-ancla]')
        if (!ancla) return null
        const caja = ancla.getBoundingClientRect()
        return { x: caja.left + caja.width / 2, y: caja.top + caja.height / 2 }
      })
    }

    const alMoverPuntero = (e) => {
      objetivo = { x: e.clientX, y: e.clientY }
    }
    const alUsarCampo = (e) => {
      const el = e.target
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        objetivo = posicionDelTexto(el)
      }
    }

    const cuadroSiguiente = () => {
      // Se vuelve a medir cada tanto por si el layout se movió (fuentes que
      // terminan de cargar, avisos que aparecen arriba del formulario, etc.).
      if (++contador % 20 === 0) medir()
      personajes.current.forEach((el, i) => {
        if (!el) return
        const ancla = anclas[i]
        const deseado = { px: 0, py: 0, fx: 0, fy: 0, lean: 0 }
        if (objetivo && ancla) {
          const dx = objetivo.x - ancla.x
          const dy = objetivo.y - ancla.y
          const distancia = Math.hypot(dx, dy) || 1
          const cerca = Math.min(1, distancia / 140)
          const ux = dx / distancia
          const uy = dy / distancia
          deseado.px = ux * maxPupila * cerca
          deseado.py = uy * maxPupila * cerca
          deseado.fx = ux * maxRostro * cerca
          deseado.fy = uy * maxRostro * cerca * 0.7
          deseado.lean = limitar(dx / 420, -1, 1) * maxInclinacion
        }

        const a = (actual[i] ??= { px: 0, py: 0, fx: 0, fy: 0, lean: 0 })
        const suavizado = reducido ? 1 : 0.14
        let cambio = false
        for (const clave in deseado) {
          const siguiente = a[clave] + (deseado[clave] - a[clave]) * suavizado
          if (Math.abs(siguiente - a[clave]) > 0.002) {
            a[clave] = siguiente
            cambio = true
          }
        }
        if (cambio) {
          el.style.setProperty('--px', a.px.toFixed(3))
          el.style.setProperty('--py', a.py.toFixed(3))
          el.style.setProperty('--fx', a.fx.toFixed(3))
          el.style.setProperty('--fy', a.fy.toFixed(3))
          el.style.setProperty('--lean', a.lean.toFixed(3))
        }
      })
      cuadro = requestAnimationFrame(cuadroSiguiente)
    }

    medir()
    const observador = new ResizeObserver(medir)
    personajes.current.forEach((el) => el && observador.observe(el.ownerSVGElement ?? el))
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, { capture: true, passive: true })
    window.addEventListener('pointermove', alMoverPuntero, { passive: true })
    window.addEventListener('pointerdown', alMoverPuntero, { passive: true })
    document.addEventListener('focusin', alUsarCampo)
    document.addEventListener('input', alUsarCampo)
    document.addEventListener('keyup', alUsarCampo)
    cuadro = requestAnimationFrame(cuadroSiguiente)

    return () => {
      cancelAnimationFrame(cuadro)
      observador.disconnect()
      window.removeEventListener('resize', medir)
      window.removeEventListener('scroll', medir, { capture: true })
      window.removeEventListener('pointermove', alMoverPuntero)
      window.removeEventListener('pointerdown', alMoverPuntero)
      document.removeEventListener('focusin', alUsarCampo)
      document.removeEventListener('input', alUsarCampo)
      document.removeEventListener('keyup', alUsarCampo)
    }
  }, [maxPupila, maxRostro, maxInclinacion])

  return personajes
}
