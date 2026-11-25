import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useCapturaEscaneo } from '../../../lib/escaneo'
import { toast } from '../../../store/toastStore'
import { UNIDAD_ABREVIADA, permiteDecimales, type Producto } from '../../../types/inventario'

interface DialogoCantidadIngresoProps {
  producto: Producto
  /** Código escaneado (si vino del lector). */
  codigo: string | null
  /** Unidades del pack si el código es de un pack; null si es una unidad. */
  unidadesPack: number | null
  /** Lo que ya se sumó de este producto en el ingreso. */
  yaSumado: number
  onCerrar: () => void
  onConfirmar: (cantidad: number) => void
}

const formato = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 3 })

/** "¿Cuántas unidades de …?" — 1 (o las del pack) precargado y seleccionado; Enter suma, Esc cancela. */
export const DialogoCantidadIngreso = ({ producto, codigo, unidadesPack, yaSumado, onCerrar, onConfirmar }: DialogoCantidadIngresoProps) => {
  const decimales = permiteDecimales(producto.unidadMedida)
  const unidad = UNIDAD_ABREVIADA[producto.unidadMedida] ?? ''
  const [valor, setValor] = useState(String(unidadesPack ?? 1))
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { input.current?.select() }, [])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])
  useCapturaEscaneo(true, () => toast.info('Confirmá la cantidad (Enter) antes de escanear otro producto'))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const n = Number(valor.replace(',', '.'))
    if (!(n > 0)) { setError('Poné una cantidad mayor a 0'); return }
    if (!decimales && !Number.isInteger(n)) { setError('Este producto se cuenta por unidad: sin decimales'); return }
    onConfirmar(n)
  }

  return (
    <div className="fixed inset-0 z-[950] flex items-center justify-center bg-texto/30 p-6" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <form role="dialog" aria-modal="true" aria-labelledby="cantidad-ingreso-titulo" onSubmit={submit}
        className="flex w-[420px] max-w-full flex-col gap-4 rounded-[18px] border border-borde bg-superficie p-[22px] text-cuerpo text-texto">
        <div>
          <div className="font-mono text-etiqueta uppercase text-texto-3">{codigo ? `Escaneado · ${codigo}` : 'Agregar al ingreso'}</div>
          <h2 id="cantidad-ingreso-titulo" className="mt-1.5 text-[20px] font-semibold tracking-[-0.01em]">
            {decimales ? `¿Cuánto ingresa de ${producto.nombre}?` : `¿Cuántas unidades de ${producto.nombre}?`}
          </h2>
          <p className="mt-1.5 text-[13px] text-texto-2">
            Stock actual: {formato(producto.stock)}{decimales ? ` ${unidad}` : ''}.
            {yaSumado > 0 && ` Ya sumaste ${formato(yaSumado)}${decimales ? ` ${unidad}` : ''} en este ingreso.`}
            {unidadesPack !== null && ` 1 pack = ${formato(unidadesPack)} unidades.`}
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-texto-2">
          Cantidad{decimales ? ` (${unidad})` : ''}
          <input ref={input} value={valor} autoFocus inputMode={decimales ? 'decimal' : 'numeric'}
            onChange={e => { setValor(e.target.value); setError(null) }}
            className="h-14 rounded-[12px] border-2 border-texto bg-superficie px-4 text-[28px] font-semibold tabular-nums text-texto outline-none" />
          {error && <span className="text-[12px] text-error">{error}</span>}
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar}
            className="h-11 rounded-pastilla border border-borde-fuerte bg-superficie px-[18px] text-seccion text-texto hover:bg-superficie-suave">
            Cancelar <span className="font-mono text-[11px] text-texto-3">Esc</span>
          </button>
          <button type="submit" className="h-11 rounded-pastilla bg-texto px-[18px] text-seccion font-medium text-superficie hover:opacity-90">
            Sumar <span className="font-mono text-[11px] text-borde-fuerte">Enter</span>
          </button>
        </div>
      </form>
    </div>
  )
}
