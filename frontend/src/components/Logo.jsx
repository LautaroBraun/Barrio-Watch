import { Link } from 'react-router'

export function Isotipo({ className = 'size-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M3 14.5 16 3.5l13 11V27a2.5 2.5 0 0 1-2.5 2.5h-21A2.5 2.5 0 0 1 3 27Z" fill="#1B1A2E" />
      <path d="M8.5 19.5Q16 12 23.5 19.5 16 27 8.5 19.5Z" fill="#F6F1E7" />
      <circle cx="16" cy="19.5" r="3.4" fill="#FF7A45" />
    </svg>
  )
}

export default function Logo({ className = '', to = '/' }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-2 rounded-lg ${className}`} aria-label="Barrio Watch, ir al inicio">
      <Isotipo />
      <span className="font-display text-xl font-bold tracking-tight">Barrio Watch</span>
    </Link>
  )
}
