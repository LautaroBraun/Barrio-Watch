import { useId } from 'react'
import { IconoAlerta, IconoCheck, IconoOjo, IconoOjoTachado, IconoPunto, IconoReloj } from './Iconos.jsx'

const estiloInput =
  'w-full rounded-2xl border-2 bg-white px-4 py-3 text-base text-tinta placeholder:text-tinta-suave/60 ' +
  'transition-colors outline-none focus:border-violeta disabled:opacity-60'

function claseBorde(error) {
  return error ? 'border-error bg-error-fondo/40 focus:border-error' : 'border-linea hover:border-tinta/30'
}

export function Campo({ ref, etiqueta, error, ayuda, className = '', children, ...props }) {
  const id = useId()
  const idMensaje = `${id}-mensaje`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {etiqueta}
      </label>
      {children ?? (
        <input
          ref={ref}
          id={id}
          className={`${estiloInput} ${claseBorde(error)}`}
          aria-invalid={Boolean(error)}
          aria-describedby={error || ayuda ? idMensaje : undefined}
          {...props}
        />
      )}
      <MensajeCampo id={idMensaje} error={error} ayuda={ayuda} />
    </div>
  )
}

export function MensajeCampo({ id, error, ayuda }) {
  if (error) {
    return (
      <p id={id} role="alert" className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-error">
        <IconoAlerta width={16} height={16} className="shrink-0" />
        {error}
      </p>
    )
  }
  if (ayuda) {
    return (
      <p id={id} className="mt-1.5 text-sm text-tinta-suave">
        {ayuda}
      </p>
    )
  }
  return null
}

export function CampoSelect({ ref, etiqueta, error, ayuda, opciones, placeholder, className = '', ...props }) {
  const id = useId()
  const idMensaje = `${id}-mensaje`
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {etiqueta}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={`${estiloInput} ${claseBorde(error)} appearance-none pr-11`}
          aria-invalid={Boolean(error)}
          aria-describedby={error || ayuda ? idMensaje : undefined}
          {...props}
        >
          <option value="">{placeholder}</option>
          {opciones.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.texto}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <MensajeCampo id={idMensaje} error={error} ayuda={ayuda} />
    </div>
  )
}

// Contraseña con el botón del ojo para ver lo que se escribió.
export function CampoPassword({ ref, etiqueta, error, ayuda, visible, onCambiarVisible, extra, className = '', 'aria-describedby': describe, ...props }) {
  const id = useId()
  const idMensaje = `${id}-mensaje`
  const descripcion = [error || ayuda ? idMensaje : null, describe].filter(Boolean).join(' ') || undefined
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-semibold">
          {etiqueta}
        </label>
        {extra}
      </div>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type={visible ? 'text' : 'password'}
          className={`${estiloInput} ${claseBorde(error)} pr-13`}
          aria-invalid={Boolean(error)}
          aria-describedby={descripcion}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          {...props}
        />
        <button
          type="button"
          onClick={() => onCambiarVisible(!visible)}
          className="absolute top-1/2 right-2 grid size-10 -translate-y-1/2 place-items-center rounded-xl text-tinta-suave transition-colors hover:bg-arena hover:text-tinta"
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <IconoOjoTachado /> : <IconoOjo />}
        </button>
      </div>
      <MensajeCampo id={idMensaje} error={error} ayuda={ayuda} />
    </div>
  )
}

// CA 2.2: muestra debajo del campo qué requisitos faltan cumplir.
export function ListaRequisitos({ requisitos, marcarPendientes = false, id }) {
  return (
    <ul id={id} className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm" aria-label="Requisitos de la contraseña">
      {requisitos.map((r) => (
        <li
          key={r.id}
          className={`flex items-center gap-1.5 transition-colors ${
            r.cumple ? 'text-exito' : marcarPendientes ? 'font-medium text-error' : 'text-tinta-suave'
          }`}
        >
          <span
            className={`grid size-5 shrink-0 place-items-center rounded-full transition-all ${
              r.cumple ? 'scale-100 bg-exito text-white' : 'scale-90 bg-linea/70 text-tinta-suave'
            }`}
          >
            {r.cumple ? <IconoCheck width={13} height={13} strokeWidth={3} /> : <IconoPunto width={12} height={12} />}
          </span>
          {r.texto}
          <span className="sr-only">{r.cumple ? ' (cumplido)' : ' (pendiente)'}</span>
        </li>
      ))}
    </ul>
  )
}

const ESTILOS_AVISO = {
  exito: { caja: 'border-exito/30 bg-exito-fondo text-exito', Icono: IconoCheck },
  error: { caja: 'border-error/30 bg-error-fondo text-error', Icono: IconoAlerta },
  aviso: { caja: 'border-aviso-borde bg-aviso-fondo text-aviso', Icono: IconoReloj },
  info: { caja: 'border-violeta/25 bg-violeta-claro text-violeta', Icono: IconoAlerta },
}

export function Aviso({ tipo = 'info', titulo, children, className = '' }) {
  const { caja, Icono } = ESTILOS_AVISO[tipo]
  return (
    <div role={tipo === 'error' || tipo === 'aviso' ? 'alert' : 'status'} className={`entrar flex gap-3 rounded-2xl border-2 px-4 py-3 text-sm ${caja} ${className}`}>
      <Icono className="mt-0.5 shrink-0" width={18} height={18} strokeWidth={2.4} />
      <div>
        {titulo && <p className="font-bold">{titulo}</p>}
        <div className={titulo ? 'mt-0.5 text-tinta/80' : 'font-medium'}>{children}</div>
      </div>
    </div>
  )
}

export function Boton({ cargando = false, disabled = false, children, variante = 'primario', className = '', ...props }) {
  const variantes = {
    primario: 'bg-tinta text-white hover:bg-tinta/90 disabled:bg-tinta/35',
    secundario: 'border-2 border-linea bg-white text-tinta hover:border-tinta/40 disabled:opacity-50',
  }
  return (
    <button
      className={`relative inline-flex h-13 w-full items-center justify-center gap-2 rounded-full px-6 font-bold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${variantes[variante]} ${className}`}
      {...props}
      disabled={cargando || disabled}
      aria-busy={cargando}
    >
      {cargando && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
      {children}
    </button>
  )
}
