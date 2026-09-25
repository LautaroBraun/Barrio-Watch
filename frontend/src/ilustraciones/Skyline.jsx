// Fondo del barrio: casas bajas, un tanque de agua, un árbol y un farol.
// Colores apagados a propósito para que los personajes resalten.
export default function Skyline({ fondo = '#E4D9C4', ventanas = '#D5C7AC', vereda = '#DACDB5' }) {
  return (
    <g>
      {/* árbol */}
      <rect x="54" y="168" width="8" height="80" rx="4" fill={ventanas} />
      <circle cx="44" cy="160" r="26" fill={fondo} />
      <circle cx="72" cy="150" r="30" fill={fondo} />
      <circle cx="58" cy="128" r="24" fill={fondo} />

      {/* casa izquierda con tanque de agua */}
      <rect x="-10" y="232" width="104" height="120" fill={fondo} />
      <rect x="-10" y="224" width="108" height="10" rx="2" fill={ventanas} />
      <rect x="14" y="254" width="22" height="30" rx="3" fill={ventanas} />
      <rect x="50" y="254" width="22" height="30" rx="3" fill={ventanas} />
      <g fill={ventanas}>
        <rect x="20" y="206" width="4" height="18" />
        <rect x="42" y="206" width="4" height="18" />
        <rect x="14" y="184" width="38" height="24" rx="5" />
      </g>

      {/* casa de dos pisos, atrás del grupo */}
      <rect x="196" y="112" width="150" height="240" fill={fondo} />
      <rect x="192" y="104" width="158" height="10" rx="2" fill={ventanas} />
      {[216, 256, 296].map((x) => (
        <rect key={x} x={x} y="130" width="26" height="32" rx="3" fill={ventanas} />
      ))}

      {/* casa de techo a dos aguas */}
      <path d="M338 212 L410 160 L482 212 Z" fill={ventanas} />
      <rect x="348" y="208" width="130" height="144" fill={fondo} />
      <rect x="440" y="230" width="24" height="30" rx="3" fill={ventanas} />

      {/* farol */}
      <rect x="455" y="150" width="5" height="190" fill={ventanas} />
      <path d="M443 150 h29 l-5 10 h-19 Z" fill={ventanas} />
      <circle cx="457.5" cy="166" r="14" fill="#FFE9A8" opacity="0.55" />

      {/* vereda */}
      <rect x="-20" y="334" width="520" height="40" fill={vereda} />
      <rect x="-20" y="334" width="520" height="3" fill={ventanas} />
      <g stroke={ventanas} strokeWidth="2">
        {[20, 80, 140, 200, 260, 320, 380, 440].map((x) => (
          <line key={x} x1={x} y1="337" x2={x - 8} y2="360" />
        ))}
      </g>
    </g>
  )
}
