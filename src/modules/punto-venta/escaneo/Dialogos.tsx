import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { aCentavos, formatearPesos } from '../../../lib/dinero'
import { UNIDAD_ABREVIADA, type Producto } from '../../../types/inventario'
import { cn } from '../../../lib/utils'
import { useCapturaEscaneo } from '../../../lib/escaneo'
import { toast } from '../../../store/toastStore'

// Diálogos chicos del escaneo en el punto de venta (diseño nuevo).

const campo = 'h-[42px] w-full rounded-control border border-borde-fuerte bg-superficie px-3 text-seccion text-texto outline-none focus:border-texto'

interface BaseProps { titulo: string; etiqueta: string; onCerrar: () => void; onSubmit: (e: FormEvent) => void; boton: string; children: ReactNode }

const Dialogo = ({ titulo, etiqueta, onCerrar, onSubmit, boton, children }: BaseProps) => {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])
  useCapturaEscaneo(true, () => toast.info('Terminá este paso antes de escanear otro código'))
  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-texto/30 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <form role="dialog" aria-modal="true" onSubmit={onSubmit}
        className="flex w-[400px] max-w-full flex-col gap-4 rounded-panel border border-borde bg-superficie p-6 text-cuerpo text-texto shadow-xl">
        <div>
          <div className="font-mono text-etiqueta uppercase text-texto-3">{etiqueta}</div>
          <h2 className="mt-1 text-titulo font-semibold">{titulo}</h2>
        </div>
        {children}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCerrar} className="h-10 rounded-pastilla border border-borde-fuerte px-4 text-cuerpo hover:bg-superficie-suave">Cancelar</button>
          <button type="submit" className="h-10 rounded-pastilla bg-texto px-4 text-cuerpo font-medium text-superficie hover:opacity-90">{boton}</button>
        </div>
      </form>
    </div>
  )
}

/** Vender un código desconocido sin darlo de alta: descripción (opcional) y precio. */
export const DialogoProductoX = ({ codigo, onCerrar, onConfirmar }: {
  codigo: string
  onCerrar: () => void
  onConfirmar: (datos: { descripcion: string; precio: number }) => void
}) => {
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const centavos = aCentavos(precio)
    if (centavos <= 0) { setError('Poné el precio'); return }
    onConfirmar({ descripcion, precio: centavos })
  }
  return (
    <Dialogo titulo='Vender como "Producto X"' etiqueta={`Código ${codigo}`} boton="Sumar a la venta" onCerrar={onCerrar} onSubmit={submit}>
      <p className="-mt-2 text-[13px] text-texto-2">No se crea el producto ni se descuenta stock. En la venta queda con esta descripción y el código.</p>
      <label className="flex flex-col gap-1.5 text-[13px] text-texto-2">Descripción (opcional)
        <input value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Producto X" className={campo} />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] text-texto-2">Precio
        <input value={precio} onChange={e => { setPrecio(e.target.value); setError(null) }} inputMode="decimal" placeholder="$ 0"
          autoFocus className={cn(campo, 'font-mono')} />
        {error && <span className="text-[12px] text-error">{error}</span>}
      </label>
    </Dialogo>
  )
}

/** Productos por peso o metro: al escanearlos se pide la cantidad (con decimales). */
export const DialogoCantidad = ({ producto, onCerrar, onConfirmar }: {
  producto: Producto
  onCerrar: () => void
  onConfirmar: (cantidad: number) => void
}) => {
  const [cantidad, setCantidad] = useState('')
  const [error, setError] = useState<string | null>(null)
  const unidad = UNIDAD_ABREVIADA[producto.unidadMedida] ?? ''
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(cantidad.replace(',', '.'))
    if (!(n > 0)) { setError('Poné la cantidad'); return }
    onConfirmar(n)
  }
  return (
    <Dialogo titulo={producto.nombre} etiqueta={`${formatearPesos(producto.precio)} por ${unidad}`} boton="Sumar a la venta" onCerrar={onCerrar} onSubmit={submit}>
      <label className="flex flex-col gap-1.5 text-[13px] text-texto-2">Cantidad ({unidad})
        <input value={cantidad} onChange={e => { setCantidad(e.target.value); setError(null) }} inputMode="decimal"
          placeholder="0,375" autoFocus className={cn(campo, 'font-mono')} />
        {error && <span className="text-[12px] text-error">{error}</span>}
      </label>
    </Dialogo>
  )
}
