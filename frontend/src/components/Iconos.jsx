// Íconos de trazo simple, heredan el color del texto.
const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const IconoOjo = (props) => (
  <svg {...base} {...props}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const IconoOjoTachado = (props) => (
  <svg {...base} {...props}>
    <path d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-2.9 3.9M6.6 6.6C3.7 8.5 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
  </svg>
)

export const IconoCheck = (props) => (
  <svg {...base} {...props}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const IconoPunto = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" />
  </svg>
)

export const IconoAlerta = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </svg>
)

export const IconoReloj = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 7v5l3 2" />
  </svg>
)

export const IconoPin = (props) => (
  <svg {...base} {...props}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)

export const IconoSalir = (props) => (
  <svg {...base} {...props}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
  </svg>
)

export const IconoFlecha = (props) => (
  <svg {...base} {...props}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
)

// --- Sprint 2 · gestión de zonas -------------------------------------------

export const IconoBuscar = (props) => (
  <svg {...base} {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </svg>
)

export const IconoMas = (props) => (
  <svg {...base} {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const IconoLapiz = (props) => (
  <svg {...base} {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

export const IconoDesactivar = (props) => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6 18.4 18.4" />
  </svg>
)

export const IconoReactivar = (props) => (
  <svg {...base} {...props}>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
)

export const IconoCandado = (props) => (
  <svg {...base} {...props}>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
)

export const IconoMapa = (props) => (
  <svg {...base} {...props}>
    <path d="m9 4-6 2.5v13L9 17l6 3 6-2.5v-13L15 7Z" />
    <path d="M9 4v13M15 7v13" />
  </svg>
)

export const IconoCerrar = (props) => (
  <svg {...base} {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const IconoSobre = (props) => (
  <svg {...base} {...props}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
)
