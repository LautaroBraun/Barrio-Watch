// La llave de "Nueva contraseña": le crece un diente por cada requisito
// cumplido, se vuelve dorada cuando las dos contraseñas coinciden y, al
// guardar, entra en el candado, gira y lo abre.
const GRIS = '#C9CCD6'
const DORADO = '#F5C542'
const DIENTES = [
  { x: 118, alto: 14 },
  { x: 140, alto: 22 },
  { x: 162, alto: 12 },
  { x: 184, alto: 18 },
]

function Candado({ roto }) {
  return (
    <g>
      <path
        className="arco-candado"
        d="M250 52 V36 a19 19 0 0 1 38 0 V52"
        stroke="#8A8FA3"
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="236" y="48" width="66" height="58" rx="14" fill={roto ? '#B8BCC8' : '#FF7A45'} />
      <circle cx="269" cy="72" r="6.5" fill="#1B1A2E" />
      <rect x="266" y="74" width="6" height="16" rx="3" fill="#1B1A2E" />
    </g>
  )
}

export default function Llave({ dientes = [], dorada = false, abierta = false, rota = false, className = '' }) {
  if (rota) {
    return (
      <svg viewBox="0 0 320 130" className={className} aria-hidden="true">
        <Candado roto />
        <g transform="rotate(-8 60 70)">
          <circle cx="50" cy="70" r="26" fill={GRIS} />
          <circle cx="50" cy="70" r="10" fill="#fff" />
          <path d="M72 64 H116 L110 70 L118 76 H72 Z" fill={GRIS} />
        </g>
        <g transform="translate(14 14) rotate(14 150 70)">
          <path d="M124 64 L118 70 L126 76 H200 a4 4 0 0 0 4 -4 V68 a4 4 0 0 0 -4 -4 Z" fill={GRIS} />
          <rect x="140" y="76" width="14" height="22" rx="2" fill={GRIS} />
          <rect x="184" y="76" width="14" height="18" rx="2" fill={GRIS} />
        </g>
        <g stroke="#1B1A2E" strokeWidth="2.5" strokeLinecap="round">
          <path d="M112 40 l6 -8 M124 44 l10 -4 M104 38 l-2 -10" />
        </g>
      </svg>
    )
  }

  const color = dorada || abierta ? DORADO : GRIS
  return (
    <svg viewBox="0 0 320 130" className={`llave overflow-visible ${className}`} data-abierta={abierta} aria-hidden="true">
      <g className="llave-mover">
        <g className="llave-girar" style={{ transformBox: 'view-box', transformOrigin: '0px 70px' }}>
          {DIENTES.map((d, i) => (
            <rect
              key={d.x}
              className="diente"
              x={d.x}
              y="74"
              width="14"
              height={d.alto + 2}
              rx="2"
              fill={color}
              style={{ transform: dientes[i] ? 'scaleY(1)' : 'scaleY(0)' }}
            />
          ))}
          <rect className="cuerpo-llave" x="70" y="63" width="134" height="14" rx="5" fill={color} />
          <circle className="cuerpo-llave" cx="48" cy="70" r="28" fill={color} />
          {/* el agujero de la llave tiene la forma del logo */}
          <path d="M38 72 L48 62 L58 72 V80 H38 Z" fill="#fff" />
        </g>
      </g>
      <Candado />
      {abierta && (
        <g fill="#F5C542" className="entrar" style={{ animationDelay: '1.3s' }}>
          <path d="M300 14 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
          <path d="M228 20 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" />
          <path d="M312 58 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 Z" />
        </g>
      )}
    </svg>
  )
}
