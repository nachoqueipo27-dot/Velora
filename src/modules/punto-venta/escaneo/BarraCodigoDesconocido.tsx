import { useEffect, useMemo } from 'react'
import { cn } from '../../../lib/utils'
import type { AccionDesconocido } from '../../../store/escaneoStore'

export type OpcionDesconocido = 'alta' | 'borrador' | 'producto_x' | 'avisar'

interface Opcion { id: OpcionDesconocido; label: string }

interface BarraCodigoDesconocidoProps {
  codigo: string
  /** Puede editar Inventario: ofrece Alta rápida y Borrador. Si no: Producto X y Avisar al encargado. */
  puedeDarAlta: boolean
  /** Acción que corre con Enter (Configuración → Punto de venta). 'opciones': ninguna. */
  accionEnter: AccionDesconocido
  onElegir: (opcion: OpcionDesconocido) => void
  onCerrar: () => void
}

const enFormulario = () => {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
}

/** Barra sobre la venta cuando se escanea un código que no está en el inventario (Main.dc.html). */
export const BarraCodigoDesconocido = ({ codigo, puedeDarAlta, accionEnter, onElegir, onCerrar }: BarraCodigoDesconocidoProps) => {
  const opciones: Opcion[] = useMemo(() => puedeDarAlta
    ? [
        { id: 'alta', label: 'Alta rápida' },
        { id: 'borrador', label: 'Borrador' },
        { id: 'producto_x', label: 'Vender como "Producto X"' },
      ]
    : [
        { id: 'producto_x', label: 'Vender como "Producto X"' },
        { id: 'avisar', label: 'Avisar al encargado' },
      ], [puedeDarAlta])
  const porDefecto = accionEnter !== 'opciones' && opciones.some(o => o.id === accionEnter)
    ? (accionEnter as OpcionDesconocido)
    : null

  useEffect(() => {
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCerrar(); return }
      if (enFormulario() || e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key === 'Enter' && porDefecto) { e.preventDefault(); onElegir(porDefecto); return }
      const n = Number(e.key)
      if (n >= 1 && n <= opciones.length) { e.preventDefault(); onElegir(opciones[n - 1].id) }
    }
    window.addEventListener('keydown', teclas)
    return () => window.removeEventListener('keydown', teclas)
  }, [opciones, porDefecto, onElegir, onCerrar])

  return (
    <div role="status" className="mb-4 flex flex-wrap items-center gap-3.5 rounded-tarjeta border border-acento/30 bg-superficie px-4 py-3.5 text-texto">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-acento-suave">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          className="text-acento-hover" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>
      </span>
      <div className="min-w-0 flex-[1_1_220px]">
        <div className="text-seccion font-medium"><span className="font-mono">{codigo}</span> no está en inventario</div>
        <div className="mt-0.5 text-cuerpo text-texto-2">
          {porDefecto ? 'Elegí cómo seguir. Enter usa la acción por defecto.' : 'Elegí cómo seguir con las teclas 1 a ' + opciones.length + '. Esc cierra.'}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {opciones.map((o, i) => {
          const principal = o.id === porDefecto
          return (
            <button key={o.id} type="button" onClick={() => onElegir(o.id)}
              className={cn('flex h-10 items-center gap-2 rounded-pastilla px-3.5 text-cuerpo',
                principal ? 'bg-texto font-medium text-superficie' : 'border border-borde-fuerte bg-superficie text-texto hover:bg-superficie-suave')}>
              <kbd className={cn('rounded-[4px] px-1.5 font-mono text-[11px]', principal ? 'bg-texto-2 text-superficie' : 'bg-superficie-suave text-texto-2')}>{i + 1}</kbd>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
