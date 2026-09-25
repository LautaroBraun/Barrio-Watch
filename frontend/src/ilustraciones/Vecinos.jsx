import { useEffect, useRef } from 'react'
import { useMirada } from '../hooks/useMirada.js'
import Skyline from './Skyline.jsx'

const TINTA = '#1B1A2E'
const BOCA = '#3A1F14'

/* ---------------------------------------------------------------------------
   Piezas de la cara, que cambian según el ánimo de la escena
   --------------------------------------------------------------------------- */

function Ojo({ cx, cy, rx = 7, ry = 7.5, pupila = 3.6, animo, piel }) {
  if (animo === 'exito' || animo === 'saludo') {
    return (
      <path
        d={`M${cx - rx} ${cy + 1.5} Q${cx} ${cy - ry - 1} ${cx + rx} ${cy + 1.5}`}
        stroke={TINTA}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    )
  }
  const sorpresa = animo === 'error'
  return (
    <g className="ojo pivote-centro">
      <ellipse cx={cx} cy={cy} rx={rx + (sorpresa ? 0.8 : 0)} ry={ry + (sorpresa ? 1.4 : 0)} fill="#fff" />
      <g className="pupila">
        <circle cx={cx} cy={cy} r={sorpresa ? pupila - 0.9 : pupila} fill={TINTA} />
        <circle cx={cx + 1.2} cy={cy - 1.3} r="1.1" fill="#fff" />
      </g>
      {animo === 'bloqueo' && (
        <path d={`M${cx - rx - 1.5} ${cy + 0.5} A${rx + 1.5} ${ry + 1.5} 0 0 1 ${cx + rx + 1.5} ${cy + 0.5} Z`} fill={piel} />
      )}
    </g>
  )
}

function Cejas({ izquierda, derecha, ancho = 14, color, animo }) {
  const ceja = ([x, y], lado) => {
    const m = ancho / 2
    // lado = -1 para la ceja izquierda (su extremo interno está a la derecha)
    if (animo === 'error' || animo === 'bloqueo') {
      const interno = x - lado * m
      const externo = x + lado * m
      return `M${externo} ${y + 1} Q${x} ${y - 1} ${interno} ${y - 5}`
    }
    const alto = animo === 'exito' || animo === 'saludo' ? 4 : 0
    return `M${x - m} ${y + 1 - alto} Q${x} ${y - 4 - alto} ${x + m} ${y + 1 - alto}`
  }
  return (
    <g stroke={color} strokeWidth="3" fill="none" strokeLinecap="round">
      <path d={ceja(izquierda, -1)} />
      <path d={ceja(derecha, 1)} />
    </g>
  )
}

function Boca({ x, y, ancho = 18, animo }) {
  const m = ancho / 2
  if (animo === 'error') return <ellipse cx={x} cy={y + 3} rx="4" ry="5" fill={BOCA} />
  if (animo === 'bloqueo') {
    return (
      <path
        d={`M${x - m} ${y + 3} Q${x - m / 2} ${y} ${x} ${y + 3} T${x + m} ${y + 3}`}
        stroke={BOCA}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    )
  }
  if (animo === 'exito' || animo === 'saludo') {
    return (
      <g>
        <path d={`M${x - m - 1} ${y} Q${x} ${y + 16} ${x + m + 1} ${y} Z`} fill={BOCA} />
        <ellipse cx={x} cy={y + 7} rx={m / 2.2} ry="2.6" fill="#F07C7C" />
      </g>
    )
  }
  return <path d={`M${x - m} ${y} Q${x} ${y + 7} ${x + m} ${y}`} stroke={BOCA} strokeWidth="3" fill="none" strokeLinecap="round" />
}

/* ---------------------------------------------------------------------------
   Cada vecino tiene una vista de frente y otra de espalda
   --------------------------------------------------------------------------- */

function Vecino({ indice, parpadeo, registrar, frente, espalda }) {
  return (
    <g className="vecino mira" style={{ '--i': indice, '--parpadeo': parpadeo }} ref={registrar}>
      <g className="reaccion pivote-pies">
        <g className="inclinacion pivote-pies">
          <g className="respira pivote-pies">
            <g className="frente pivote-centro">{frente}</g>
            <g className="espalda pivote-centro">{espalda}</g>
          </g>
        </g>
      </g>
    </g>
  )
}

// Tomás: el más alto, con gorro de lana.
function tomas(animo) {
  const piel = '#C98B5E'
  const sombra = '#AE7349'
  const pelo = '#2B2118'
  const cuerpo = 'M132 196 Q132 162 164 160 L196 160 Q228 162 228 196 L228 420 L132 420 Z'
  const gorro = (
    <>
      <path d="M143 110 Q143 73 180 73 Q217 73 217 110 Z" fill="#F5C542" />
      <rect x="140" y="98" width="80" height="15" rx="7.5" fill="#E3AE2A" />
      <circle cx="180" cy="70" r="9" fill="#F5C542" />
    </>
  )
  return {
    frente: (
      <>
        <circle className="mano" cx="130" cy="266" r="10" fill={piel} />
        <circle className="mano" cx="226" cy="266" r="10" fill={piel} />
        <path d={cuerpo} fill="#6C5CE7" />
        <path d="M168 146 h24 v18 q-12 7 -24 0 Z" fill={sombra} />
        <path d="M160 162 Q180 178 200 162" stroke="#8B7EF2" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="145" cy="125" r="7" fill={sombra} />
        <circle cx="215" cy="125" r="7" fill={sombra} />
        <circle cx="180" cy="120" r="36" fill={piel} />
        <path d="M146 110 q-2 14 3 22 l4 -2 q-3 -9 -2 -20 Z M214 110 q2 14 -3 22 l-4 -2 q3 -9 2 -20 Z" fill={pelo} />
        {gorro}
        <circle data-ancla cx="180" cy="128" r="0.5" fill="none" />
        <g className="rostro">
          <Cejas izquierda={[166, 118]} derecha={[194, 118]} color={pelo} animo={animo} />
          <Ojo cx={166} cy={129} animo={animo} piel={piel} />
          <Ojo cx={194} cy={129} animo={animo} piel={piel} />
          <path d="M180 132 Q185 140 179 142" stroke={sombra} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <Boca x={180} y={147} animo={animo} />
        </g>
      </>
    ),
    espalda: (
      <>
        <circle cx="130" cy="266" r="10" fill={piel} />
        <circle cx="226" cy="266" r="10" fill={piel} />
        <path d={cuerpo} fill="#5A4BD6" />
        <path d="M168 146 h24 v18 q-12 7 -24 0 Z" fill={sombra} />
        <circle cx="145" cy="125" r="7" fill={sombra} />
        <circle cx="215" cy="125" r="7" fill={sombra} />
        <circle cx="180" cy="120" r="36" fill={pelo} />
        {gorro}
      </>
    ),
  }
}

// Luz: pelo afro enrulado y pañuelo coral.
function luz(animo) {
  const piel = '#8D5A3B'
  const sombra = '#744629'
  const pelo = '#1A1410'
  const cuerpo = 'M248 226 Q248 198 274 196 L306 196 Q332 198 332 226 L332 420 L248 420 Z'
  const rulos = Array.from({ length: 11 }, (_, k) => {
    const angulo = Math.PI * (0.92 + k * 0.116)
    return <circle key={k} cx={290 + Math.cos(angulo) * 40} cy={150 + Math.sin(angulo) * 40} r="14" fill={pelo} />
  })
  const afro = (
    <>
      <circle cx="290" cy="150" r="42" fill={pelo} />
      {rulos}
    </>
  )
  const aros = (
    <g stroke="#F5C542" strokeWidth="2.6" fill="none">
      <circle cx="259" cy="184" r="5" />
      <circle cx="321" cy="184" r="5" />
    </g>
  )
  return {
    frente: (
      <>
        <circle className="mano" cx="251" cy="286" r="9" fill={piel} />
        <circle className="mano" cx="329" cy="286" r="9" fill={piel} />
        <path d={cuerpo} fill="#23233A" />
        <path d="M282 180 h16 v20 q-8 5 -16 0 Z" fill={sombra} />
        {afro}
        <circle cx="290" cy="160" r="30" fill={piel} />
        <g fill={pelo}>
          <circle cx="271" cy="134" r="9" />
          <circle cx="283" cy="130" r="9" />
          <circle cx="297" cy="130" r="9" />
          <circle cx="309" cy="135" r="9" />
        </g>
        {aros}
        <path d="M270 197 Q290 214 310 197 L304 216 Q290 224 276 216 Z" fill="#FF7A45" />
        <circle data-ancla cx="290" cy="162" r="0.5" fill="none" />
        <g className="rostro">
          <Cejas izquierda={[277, 151]} derecha={[303, 151]} ancho={12} color={pelo} animo={animo} />
          <Ojo cx={277} cy={162} rx={6.5} ry={7} pupila={3.4} animo={animo} piel={piel} />
          <Ojo cx={303} cy={162} rx={6.5} ry={7} pupila={3.4} animo={animo} piel={piel} />
          <path d="M270 158 l-4 -3 M310 158 l4 -3" stroke={pelo} strokeWidth="2" strokeLinecap="round" />
          <path d="M290 166 Q294 173 289 174" stroke={sombra} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <Boca x={290} y={180} ancho={16} animo={animo} />
        </g>
      </>
    ),
    espalda: (
      <>
        <circle cx="251" cy="286" r="9" fill={piel} />
        <circle cx="329" cy="286" r="9" fill={piel} />
        <path d={cuerpo} fill="#1A1A2C" />
        <path d="M282 180 h16 v20 q-8 5 -16 0 Z" fill={sombra} />
        {afro}
        {aros}
        <path d="M276 199 Q290 206 304 199 L300 212 Q290 216 280 212 Z" fill="#E8612F" />
      </>
    ),
  }
}

// Rosa: la vecina de toda la vida, con rodete y anteojos.
function rosa(animo) {
  const piel = '#F2C9A0'
  const sombra = '#DDA97E'
  const pelo = '#D3D0DE'
  const cuerpo = 'M34 420 L34 306 Q34 244 112 242 Q190 244 190 306 L190 420 Z'
  const rodete = <circle cx="112" cy="172" r="15" fill={pelo} />
  return {
    frente: (
      <>
        <path d={cuerpo} fill="#FF7A45" />
        <path d="M100 244 L124 244 L132 420 L92 420 Z" fill="#FFE1D2" />
        <g fill="#C8552A">
          <circle cx="92" cy="286" r="2.8" />
          <circle cx="91" cy="312" r="2.8" />
          <circle cx="90" cy="338" r="2.8" />
        </g>
        <path d="M103 228 h18 v18 q-9 5 -18 0 Z" fill={sombra} />
        <g fill="#fff">
          {[99, 104, 110, 116, 122, 127].map((x, k) => (
            <circle key={x} cx={x + 0.5} cy={249 + [0, 3, 4.5, 4.5, 3, 0][k]} r="2.3" />
          ))}
        </g>
        <circle className="mano" cx="103" cy="302" r="9.5" fill={piel} />
        <circle className="mano" cx="121" cy="302" r="9.5" fill={piel} />
        {rodete}
        <circle cx="112" cy="210" r="32" fill={piel} />
        <circle cx="82" cy="206" r="9" fill={pelo} />
        <circle cx="142" cy="206" r="9" fill={pelo} />
        <path d="M80 210 Q78 176 112 176 Q146 176 144 210 Q140 191 124 188 Q112 197 100 188 Q84 191 80 210 Z" fill={pelo} />
        <circle data-ancla cx="112" cy="214" r="0.5" fill="none" />
        <g className="rostro">
          <Cejas izquierda={[99, 199]} derecha={[125, 199]} ancho={13} color="#A9A4BB" animo={animo} />
          <circle cx="93" cy="228" r="5.5" fill="#F29C8A" opacity="0.55" />
          <circle cx="131" cy="228" r="5.5" fill="#F29C8A" opacity="0.55" />
          <Ojo cx={99} cy={214} rx={6} ry={6.5} pupila={3.3} animo={animo} piel={piel} />
          <Ojo cx={125} cy={214} rx={6} ry={6.5} pupila={3.3} animo={animo} piel={piel} />
          <g stroke={TINTA} strokeWidth="2.4" fill="none">
            <circle cx="99" cy="214" r="10" />
            <circle cx="125" cy="214" r="10" />
            <path d="M109 213 Q112 210 115 213 M89 212 L81 209 M135 212 L143 209" strokeLinecap="round" />
          </g>
          <path d="M112 219 Q116 226 111 227" stroke={sombra} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <Boca x={112} y={233} ancho={16} animo={animo} />
        </g>
      </>
    ),
    espalda: (
      <>
        <path d={cuerpo} fill="#E9683A" />
        {rodete}
        <circle cx="112" cy="210" r="33" fill={pelo} />
        <path d="M96 186 Q112 180 128 186" stroke="#BDB9CB" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </>
    ),
  }
}

// Nico: el más chico del grupo, gorra para atrás y buzo con capucha.
function nico(animo) {
  const piel = '#F6D7B8'
  const sombra = '#E6BD98'
  const pelo = '#7A4A26'
  const cuerpo = 'M350 306 Q350 268 378 266 L398 266 Q426 268 426 306 L426 420 L350 420 Z'
  return {
    frente: (
      <>
        <circle className="mano" cx="346" cy="324" r="8.5" fill={piel} />
        <circle className="mano mano-saludo pivote-pies" cx="430" cy="324" r="8.5" fill={piel} />
        <path d={cuerpo} fill="#F5C542" />
        <rect x="364" y="320" width="48" height="24" rx="10" fill="#E3AE2A" />
        <path d="M362 270 Q388 292 414 270 Q406 259 388 259 Q370 259 362 270 Z" fill="#E3AE2A" />
        <g stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <path d="M380 276 L378 298 M396 276 L398 298" />
        </g>
        <path d="M381 250 h14 v16 q-7 4 -14 0 Z" fill={sombra} />
        <ellipse cx="362" cy="212" rx="18" ry="6" transform="rotate(-24 362 212)" fill="#23A396" />
        <circle cx="388" cy="236" r="27" fill={piel} />
        <path d="M361 226 q-1 10 3 14 l3 -3 q-2 -5 -1 -11 Z M415 226 q1 10 -3 14 l-3 -3 q2 -5 1 -11 Z" fill={pelo} />
        <path d="M361 225 Q361 197 388 197 Q415 197 415 225 Z" fill="#2EC4B6" />
        <path d="M381 225 A7 7 0 0 1 395 225 Z" fill={pelo} />
        <circle data-ancla cx="388" cy="241" r="0.5" fill="none" />
        <g className="rostro">
          <Cejas izquierda={[377, 231]} derecha={[399, 231]} ancho={11} color={pelo} animo={animo} />
          <Ojo cx={377} cy={241} rx={6.3} ry={7} pupila={3.5} animo={animo} piel={piel} />
          <Ojo cx={399} cy={241} rx={6.3} ry={7} pupila={3.5} animo={animo} piel={piel} />
          <g fill="#D9A07A">
            <circle cx="370" cy="251" r="1.3" />
            <circle cx="374" cy="253" r="1.3" />
            <circle cx="402" cy="253" r="1.3" />
            <circle cx="406" cy="251" r="1.3" />
          </g>
          <Boca x={388} y={254} ancho={14} animo={animo} />
        </g>
      </>
    ),
    espalda: (
      <>
        <circle cx="346" cy="324" r="8.5" fill={piel} />
        <circle cx="430" cy="324" r="8.5" fill={piel} />
        <path d={cuerpo} fill="#E3AE2A" />
        <path d="M360 270 Q388 298 416 270 L412 302 Q388 316 364 302 Z" fill="#D59E1B" />
        <path d="M381 250 h14 v16 q-7 4 -14 0 Z" fill={sombra} />
        {/* La media cara que se asoma por el costado: queda tapada por la cabeza. */}
        <g className="espia">
          <circle cx="402" cy="240" r="11" fill={piel} />
          <ellipse cx="409" cy="238" rx="3.4" ry="3.8" fill="#fff" />
          <circle cx="410" cy="238" r="2" fill={TINTA} />
        </g>
        <circle cx="388" cy="236" r="27" fill={pelo} />
        <path d="M361 225 Q361 197 388 197 Q415 197 415 225 Z" fill="#2EC4B6" />
        <ellipse cx="388" cy="226" rx="31" ry="7" fill="#23A396" />
      </>
    ),
  }
}

const PERSONAJES = [
  { dibujar: tomas, parpadeo: '4.6s' },
  { dibujar: luz, parpadeo: '5.8s' },
  { dibujar: rosa, parpadeo: '5.2s' },
  { dibujar: nico, parpadeo: '4.1s' },
]

// Dónde aparece el globito de cada uno (en % del ancho y alto de la escena).
const POSICION_BURBUJA = {
  tomas: { left: '37.5%', top: '15%' },
  luz: { left: '60.5%', top: '26%' },
  rosa: { left: '23.5%', top: '42%' },
  nico: { left: '81%', top: '50.5%' },
}

function burbujasSegun({ animo, deEspaldas, nombre }) {
  if (deEspaldas) return [{ quien: 'nico', texto: '¡No miro, eh!' }]
  switch (animo) {
    case 'error':
      return [
        { quien: 'rosa', texto: '¡Uy!' },
        { quien: 'tomas', texto: 'Mmm… esa no era' },
      ]
    case 'bloqueo':
      return [{ quien: 'luz', texto: 'Tomate un mate y volvé en un ratito' }]
    case 'exito':
      return [{ quien: 'nico', texto: nombre ? `¡Hola, ${nombre}!` : '¡Hola!' }]
    case 'saludo':
      return [{ quien: 'tomas', texto: '¡Qué alegría tenerte en el barrio!' }]
    default:
      return []
  }
}

const REACCIONES = {
  error: {
    cuadros: [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-4deg)' },
      { transform: 'rotate(3.5deg)' },
      { transform: 'rotate(-2deg)' },
      { transform: 'rotate(0deg)' },
    ],
    opciones: { duration: 520, easing: 'ease-in-out' },
    escalon: 60,
  },
  exito: {
    cuadros: [
      { transform: 'translateY(0)' },
      { transform: 'translateY(-22px)' },
      { transform: 'translateY(0)' },
      { transform: 'translateY(-11px)' },
      { transform: 'translateY(0)' },
    ],
    opciones: { duration: 720, easing: 'ease-out' },
    escalon: 70,
  },
  bloqueo: {
    cuadros: [{ transform: 'scaleY(1)' }, { transform: 'scaleY(0.95)' }, { transform: 'scaleY(1)' }],
    opciones: { duration: 700, easing: 'ease-in-out' },
    escalon: 90,
  },
  girar: {
    cuadros: [{ transform: 'translateY(0)' }, { transform: 'translateY(-9px)' }, { transform: 'translateY(0)' }],
    opciones: { duration: 340, easing: 'ease-out' },
    escalon: 70,
  },
}

/**
 * Los vecinos del login.
 * - Siguen con la mirada al puntero y a lo que se escribe.
 * - animo: 'neutral' | 'error' | 'bloqueo' | 'exito' | 'saludo'
 * - deEspaldas: se dan vuelta para no ver la contraseña.
 * - pulso: cambia cada vez que hay que repetir la reacción (dos errores seguidos).
 */
export default function Vecinos({ animo = 'neutral', deEspaldas = false, pulso = 0, nombre, className = '' }) {
  const personajes = useMirada()
  const primeraVez = useRef(true)

  const reaccionar = (tipo) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const { cuadros, opciones, escalon } = REACCIONES[tipo]
    personajes.current.forEach((el, i) => {
      el?.querySelector('.reaccion')?.animate(cuadros, { ...opciones, delay: i * escalon })
    })
  }

  useEffect(() => {
    if (pulso && REACCIONES[animo]) reaccionar(animo)
    // Solo se reacciona cuando llega un pulso nuevo.
  }, [pulso])

  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false
      return
    }
    reaccionar('girar')
  }, [deEspaldas])

  const burbujas = burbujasSegun({ animo, deEspaldas, nombre })

  return (
    <div className={`relative aspect-[4/3] w-full select-none ${className}`} aria-hidden="true">
      <svg
        viewBox="0 0 480 360"
        className="escena-vecinos absolute inset-0 size-full overflow-visible"
        data-animo={animo}
        data-espaldas={deEspaldas}
      >
        <Skyline />
        {PERSONAJES.map(({ dibujar, parpadeo }, i) => {
          const { frente, espalda } = dibujar(animo)
          return (
            <Vecino
              key={i}
              indice={i}
              parpadeo={parpadeo}
              registrar={(el) => {
                personajes.current[i] = el
              }}
              frente={frente}
              espalda={espalda}
            />
          )
        })}
      </svg>

      {deEspaldas && (
        <div className="absolute" style={{ left: '46%', top: '20%' }}>
          <span className="nota-musical absolute font-display text-2xl font-bold text-violeta">♪</span>
          <span className="nota-musical absolute left-4 font-display text-xl font-bold text-violeta" style={{ animationDelay: '0.6s' }}>
            ♫
          </span>
          <span className="nota-musical absolute left-1 font-display text-lg font-bold text-violeta" style={{ animationDelay: '1.2s' }}>
            ♪
          </span>
        </div>
      )}

      {burbujas.map(({ quien, texto }) => (
        <div
          key={`${quien}-${texto}`}
          className="burbuja absolute z-10 w-max max-w-40 rounded-2xl border-2 border-tinta bg-white px-3 py-1.5 text-center text-xs leading-tight sm:max-w-48 sm:text-sm font-bold text-tinta shadow-[3px_3px_0_#1B1A2E]"
          style={{ ...POSICION_BURBUJA[quien], transform: 'translate(-50%, -100%)' }}
        >
          {texto}
          <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-tinta bg-white" />
        </div>
      ))}
    </div>
  )
}
