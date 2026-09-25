// Silueta de techos del barrio para el pie de las pantallas centradas.
export default function Techos({ color = '#C5DCEB', className = '' }) {
  return (
    <svg viewBox="0 0 1440 160" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <path
        fill={color}
        d="M0 160V96h70V70h24v26h96V60l60-40 60 40v100h40V86h110V58h16V40h40v18h14v28h90V52l70-44 70 44v108h30V92h120V70h28v22h70V50l54-34 54 34v110h40V88h96V64h22V44h36v20h18v24h70V160Z"
      />
    </svg>
  )
}
