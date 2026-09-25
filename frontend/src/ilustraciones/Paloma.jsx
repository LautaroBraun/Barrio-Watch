import { useMirada } from '../hooks/useMirada.js'

/**
 * La paloma mensajera de "Olvidé mi contraseña". Te sigue con el ojo, lleva
 * el sobre en el pico y sale volando cuando se pide el enlace.
 * - aletea: mueve las alas (mientras se envía)
 * - vuela: se va volando con el sobre
 * - llega: vuelve a posarse (al pedir otro enlace)
 */
export default function Paloma({ aletea = false, vuela = false, llega = false, className = '' }) {
  const personajes = useMirada({ maxPupila: 2, maxRostro: 2.4, maxInclinacion: 3 })

  return (
    <div className={`paloma-vuelo ${className}`} data-vuela={vuela} data-llega={llega} aria-hidden="true">
      <svg viewBox="-24 0 204 150" className="paloma size-full overflow-visible" data-vuela={aletea || vuela}>
        <defs>
          <linearGradient id="cuello-paloma" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#62B89E" />
            <stop offset="100%" stopColor="#8570D6" />
          </linearGradient>
        </defs>
        <g className="mira" ref={(el) => (personajes.current[0] = el)}>
          <g className="inclinacion pivote-pies">
            {/* patas */}
            <g stroke="#E86E7A" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M74 120 L72 144 M66 145 L80 145" />
              <path d="M94 120 L96 144 M89 145 L103 145" />
            </g>
            {/* cola */}
            <path d="M118 86 L178 74 L174 98 L122 106 Z" fill="#6F7E9A" />
            <path d="M150 80 L176 76 L175 86 L152 90 Z" fill="#3B3A4A" opacity="0.7" />
            {/* cuerpo */}
            <path d="M38 92 Q42 56 86 54 Q130 54 140 88 Q142 118 100 126 Q56 130 42 110 Z" fill="#A3B1CB" />
            <ellipse cx="78" cy="108" rx="34" ry="15" fill="#B9C4D9" />
            {/* cuello tornasolado */}
            <path d="M36 58 Q32 86 50 98 Q68 92 68 72 Q66 54 50 48 Z" fill="url(#cuello-paloma)" />
            {/* ala */}
            <g className="ala" style={{ transformBox: 'view-box', transformOrigin: '80px 72px' }}>
              <path d="M74 70 Q114 58 140 86 Q124 106 86 100 Q68 90 74 70 Z" fill="#8594B2" />
              <path d="M92 80 Q108 78 120 90 M88 90 Q104 90 114 98" stroke="#3B3A4A" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>
            {/* cabeza */}
            <g className="cabeza">
              <circle data-ancla cx="38" cy="40" r="0.5" fill="none" />
              <g className="rostro">
                <circle cx="44" cy="42" r="21" fill="#A3B1CB" />
                <g className="ojo pivote-centro">
                  <circle cx="36" cy="38" r="6.5" fill="#F2A65A" />
                  <g className="pupila">
                    <circle cx="36" cy="38" r="3" fill="#1B1A2E" />
                    <circle cx="37.2" cy="36.8" r="1" fill="#fff" />
                  </g>
                </g>
                {/* pico con el sobre */}
                <path d="M24 44 L8 49 L24 52 Z" fill="#3B3A4A" />
                <ellipse cx="25" cy="44" rx="4" ry="3" fill="#E9EDF5" />
                <g transform="rotate(-10 6 58)">
                  <rect x="-16" y="48" width="36" height="24" rx="3" fill="#fff" stroke="#1B1A2E" strokeWidth="2.2" />
                  <path d="M-16 50 L2 63 L20 50" stroke="#1B1A2E" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
                  <path d="M2 66 l-3.2 -3 a2 2 0 0 1 3.2 -2.4 a2 2 0 0 1 3.2 2.4 Z" fill="#FF7A45" />
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
