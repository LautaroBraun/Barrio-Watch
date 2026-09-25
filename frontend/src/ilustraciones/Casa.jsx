// La casa del registro: arranca como un plano punteado y se va construyendo
// a medida que el vecino completa sus datos.
//   nombre válido    → se pintan las paredes
//   apellido válido  → se pinta el techo y aparece el cartel "Flia. …"
//   correo válido    → el buzón levanta la banderita
//   contraseña       → se prende una ventana por cada requisito cumplido
//   zona elegida     → el cartel de la calle muestra la zona
//   cuenta creada    → se abre la puerta y sale humo de la chimenea

const PLANO = '#9D90F2'
const trazoPlano = { fill: 'none', stroke: PLANO, strokeWidth: 2.5, strokeDasharray: '7 6', strokeLinejoin: 'round' }

function Capa({ visible, children }) {
  return (
    <g className="capa pivote-pies" style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(6px)' }}>
      {children}
    </g>
  )
}

const VENTANAS = [
  { x: 110, y: 218 },
  { x: 244, y: 218 },
  { x: 110, y: 298 },
  { x: 244, y: 298 },
]

function recortar(texto, maximo) {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto
}

export default function Casa({ paredes, techo, apellido, buzon, ventanas = [], zona, lista, className = '' }) {
  const completa = paredes && techo && buzon && zona && ventanas.every(Boolean)

  return (
    <svg viewBox="0 0 400 440" className={`casa ${className}`} data-lista={lista} aria-hidden="true">
      <defs>
        <radialGradient id="resplandor">
          <stop offset="0%" stopColor="#FFD166" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FFD166" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* cielo */}
      <circle cx="334" cy="74" r="26" fill="#F5C542" />
      <g fill="#fff" opacity="0.9">
        <ellipse cx="74" cy="80" rx="34" ry="12" />
        <ellipse cx="94" cy="70" rx="20" ry="14" />
        <ellipse cx="268" cy="44" rx="24" ry="8" />
      </g>

      {/* suelo */}
      <rect x="-10" y="378" width="420" height="70" fill="#D6CFFA" />
      <rect x="-10" y="378" width="420" height="4" fill="#C4BAF6" />

      {/* chimenea */}
      {!techo && <rect x="252" y="126" width="28" height="60" rx="3" {...trazoPlano} />}
      <Capa visible={techo}>
        <rect x="252" y="126" width="28" height="60" rx="3" fill="#C8552A" />
        <rect x="248" y="120" width="36" height="10" rx="3" fill="#A8431F" />
      </Capa>
      {(completa || lista) && (
        <g fill="#fff">
          {[0, 0.9, 1.8].map((retraso) => (
            <circle key={retraso} className="humo" cx="266" cy="110" r="9" style={{ animationDelay: `${retraso}s` }} />
          ))}
        </g>
      )}

      {/* paredes */}
      {!paredes && <rect x="90" y="196" width="220" height="184" rx="4" {...trazoPlano} />}
      <Capa visible={paredes}>
        <rect x="90" y="196" width="220" height="184" rx="4" fill="#FFF6E5" />
        <rect x="90" y="360" width="220" height="20" fill="#F1E3C8" />
      </Capa>

      {/* techo */}
      {!techo && <path d="M66 204 L200 106 L334 204 Z" {...trazoPlano} />}
      <Capa visible={techo}>
        <path d="M66 204 L200 106 L334 204 Z" fill="#FF7A45" strokeLinejoin="round" stroke="#FF7A45" strokeWidth="8" />
        <circle cx="200" cy="164" r="13" fill="#FFF6E5" />
        <path d="M191 164 Q200 155 209 164 Q200 173 191 164 Z" fill="#1B1A2E" />
        <circle cx="200" cy="164" r="3" fill="#FF7A45" />
      </Capa>

      {/* ventanas: una por cada requisito de la contraseña */}
      {VENTANAS.map(({ x, y }, i) => (
        <g key={i}>
          {!paredes && <rect x={x} y={y} width="46" height="42" rx="5" {...trazoPlano} />}
          <Capa visible={paredes}>
            <rect x={x} y={y} width="46" height="42" rx="5" fill="#CFC8F5" />
          </Capa>
          <g className="ventana-luz" style={{ opacity: ventanas[i] ? 1 : 0 }}>
            <circle cx={x + 23} cy={y + 21} r="44" fill="url(#resplandor)" />
            <rect x={x} y={y} width="46" height="42" rx="5" fill="#FFD166" />
          </g>
          <path d={`M${x + 23} ${y} V${y + 42} M${x} ${y + 21} H${x + 46}`} stroke={paredes ? '#FFF6E5' : PLANO} strokeWidth="3" />
        </g>
      ))}

      {/* puerta: detrás, la luz de adentro */}
      <path d="M174 380 V316 a26 26 0 0 1 52 0 V380 Z" fill="#FFD166" />
      <path className="puerta-hoja" d="M174 380 V316 a26 26 0 0 1 52 0 V380 Z" fill={completa || lista ? '#6C5CE7' : paredes ? '#B7ADF7' : '#E9E5FF'} stroke={paredes ? 'none' : PLANO} strokeWidth="2.5" strokeDasharray="7 6" />
      <circle cx="216" cy="350" r="3.5" fill="#F5C542" opacity={paredes ? 1 : 0} />

      {/* cartel con el apellido */}
      <Capa visible={Boolean(apellido)}>
        <rect x="152" y="258" width="96" height="24" rx="7" fill="#1B1A2E" />
        <text x="200" y="274.5" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" fontFamily="var(--font-sans)">
          {`Flia. ${recortar(apellido ?? '', 12)}`}
        </text>
      </Capa>

      {/* buzón */}
      <rect x="341" y="330" width="7" height="50" fill={buzon ? '#1B1A2E' : 'none'} stroke={buzon ? 'none' : PLANO} strokeWidth="2" strokeDasharray="5 4" />
      <path d="M322 334 V318 a14 14 0 0 1 28 0 V334 Z" fill={buzon ? '#2EC4B6' : 'none'} stroke={buzon ? 'none' : PLANO} strokeWidth="2.5" strokeDasharray="6 5" />
      <g className="bandera" style={{ transform: buzon ? 'rotate(0deg)' : 'rotate(90deg)' }}>
        <rect x="351" y="306" width="4" height="22" fill="#FF7A45" />
        <rect x="351" y="306" width="14" height="9" fill="#FF7A45" />
      </g>
      <Capa visible={buzon}>
        <rect x="326" y="310" width="18" height="12" rx="1.5" fill="#fff" stroke="#1B1A2E" strokeWidth="1.5" transform="rotate(-8 335 316)" />
      </Capa>

      {/* cartel de la calle con la zona */}
      <rect x="44" y="262" width="6" height="118" fill={zona ? '#1B1A2E' : 'none'} stroke={zona ? 'none' : PLANO} strokeWidth="2" strokeDasharray="5 4" />
      <rect x="4" y="236" width="88" height="30" rx="6" fill={zona ? '#1B1A2E' : '#F3F0FF'} stroke={zona ? 'none' : PLANO} strokeWidth="2.5" strokeDasharray="7 6" />
      <text x="48" y="255.5" textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="var(--font-sans)" fill={zona ? '#fff' : PLANO}>
        {zona ? recortar(zona, 12) : '¿Tu zona?'}
      </text>
    </svg>
  )
}
