import Logo from './Logo.jsx'
import Techos from '../ilustraciones/Techos.jsx'

// Diseño de las pantallas de una sola tarjeta (recuperar y restablecer):
// cielo, nubes, los techos del barrio abajo y la tarjeta al centro.
export default function PantallaCentrada({ fondo, techos, children }) {
  return (
    <main className={`relative flex min-h-dvh flex-col overflow-hidden ${fondo}`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-[14%] left-[8%] h-10 w-36 rounded-full bg-white/70" />
        <div className="absolute top-[11%] left-[12%] h-12 w-16 rounded-full bg-white/70" />
        <div className="absolute top-[22%] right-[10%] h-8 w-28 rounded-full bg-white/60" />
        <Techos color={techos} className="absolute bottom-0 left-0 h-40 w-full" />
      </div>
      <header className="relative px-5 pt-5 sm:px-10 sm:pt-8">
        <Logo />
      </header>
      <div className="relative flex flex-1 items-center justify-center px-4 pt-10 pb-24">{children}</div>
    </main>
  )
}
