import { useEffect, useRef } from 'react'
import { IconoCerrar } from './Iconos.jsx'

// Cuadro de confirmación. Se monta sobre un <dialog> nativo para heredar el
// foco atrapado, el cierre con Escape y el rol de diálogo modal sin tener que
// reimplementarlos.
export default function Modal({ abierto, titulo, onCerrar, children, acciones }) {
  const dialogo = useRef(null)

  useEffect(() => {
    const elemento = dialogo.current
    if (!elemento) return
    if (abierto && !elemento.open) elemento.showModal()
    if (!abierto && elemento.open) elemento.close()
  }, [abierto])

  if (!abierto) return null

  return (
    <dialog
      ref={dialogo}
      onCancel={(e) => {
        e.preventDefault()
        onCerrar()
      }}
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-3xl bg-white p-0 text-tinta backdrop:bg-tinta/45 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-6 sm:p-7">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-extrabold tracking-tight">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="-mt-1 -mr-1 grid size-9 shrink-0 place-items-center rounded-full text-tinta-suave transition-colors hover:bg-arena hover:text-tinta"
          >
            <IconoCerrar width={18} height={18} />
          </button>
        </div>
        <div className="space-y-3 text-sm leading-relaxed text-tinta-suave">{children}</div>
        {acciones && <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">{acciones}</div>}
      </div>
    </dialog>
  )
}
