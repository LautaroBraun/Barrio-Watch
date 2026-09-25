import { Link } from 'react-router'
import PantallaCentrada from '../components/PantallaCentrada.jsx'

export default function NoEncontrada() {
  return (
    <PantallaCentrada fondo="bg-arena" techos="#E2D6BF">
      <div className="w-full max-w-md text-center">
        <svg viewBox="0 0 200 150" className="mx-auto w-56" aria-hidden="true">
          <rect x="96" y="40" width="8" height="110" rx="3" fill="#1B1A2E" />
          <g transform="rotate(-8 100 40)">
            <path d="M40 22 H150 L166 40 L150 58 H40 Z" fill="#1B1A2E" />
            <text x="98" y="46" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="800" fontFamily="var(--font-display)">
              Calle 404
            </text>
          </g>
          <path d="M60 150 Q100 136 140 150" fill="#DDD3C2" />
        </svg>
        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight">Esta calle no existe</h1>
        <p className="mt-2 text-tinta-suave">Te perdiste en el barrio. Volvé al inicio y seguimos desde ahí.</p>
        <Link
          to="/"
          className="mt-8 inline-flex h-13 items-center justify-center rounded-full bg-tinta px-8 font-bold text-white transition-colors hover:bg-tinta/90"
        >
          Volver al inicio
        </Link>
      </div>
    </PantallaCentrada>
  )
}
