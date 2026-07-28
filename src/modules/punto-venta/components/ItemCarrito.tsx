import { useEffect, useRef } from 'react'
import { usePosStore } from '../../../store/posStore'
import type { ItemCarrito as TItemCarrito } from '../../../types/pos'
import { UNIDAD_ABREVIADA, permiteDecimales } from '../../../types/inventario'
import { cn } from '../../../lib/utils'
import { Minus, Plus, X, ImageOff } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
// Oculta las flechas nativas del <input type="number"> — el propio par +/- ya cumple esa función.
const sinFlechas = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

export const ItemCarrito = ({ item }: { item: TItemCarrito }) => {
  const { tipoDescuentoGlobal, actualizarCantidad, actualizarDescuentoItem, quitarProducto, itemEnEdicion, limpiarItemEnEdicion } = usePosStore()
  const permite = permiteDecimales(item.unidadMedida)
  const minCant = permite ? 0.01 : 1
  const abrev = UNIDAD_ABREVIADA[item.unidadMedida]
  const cantidadRef = useRef<HTMLInputElement>(null)

  // Al re-tocar un producto fraccionable ya en el carrito, posStore marca este ítem
  // como "en edición" en vez de sumarle 1 a ciegas — acá se le da el foco y se
  // preselecciona el valor para que escribir un número lo reemplace directo.
  useEffect(() => {
    if (itemEnEdicion !== item.productoId) return
    cantidadRef.current?.focus()
    cantidadRef.current?.select()
    limpiarItemEnEdicion()
  }, [itemEnEdicion, item.productoId, limpiarItemEnEdicion])

  return (
    <div className="flex gap-3 rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] bg-[#141414] light:bg-white p-3 transition-colors hover:border-[#3A3A3A] light:hover:border-[#D0D0D0] animate-fade-slide-down">
      <div className="w-10 h-10 rounded-input overflow-hidden bg-[#1C1C1C] light:bg-[#F4F4F4] flex items-center justify-center shrink-0">
        {item.imagen ? <img src={item.imagen} className="w-full h-full object-cover" alt="" /> : <ImageOff size={14} className="text-[#606060]" />}
      </div>

      {/* Grid 2x2: fila 1 = qué es / cuánto sale — fila 2 = cuánto llevás / qué le aplicaste.
          Así "subtotal" queda arriba de "descuento", comunicando que uno explica al otro. */}
      <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2">
        <span className="min-w-0 text-[13px] font-medium text-white light:text-black truncate">{item.nombre}</span>
        <span className="text-[14px] font-semibold text-white light:text-black">{money(item.subtotal)}</span>

        <div className="flex items-center gap-2 min-w-0">
          {/* Cantidad + unidad viven en un único control para leerse como un solo valor ("1,5 m"),
              no como piezas sueltas — el +/- flanquea ese valor igual que un stepper nativo. */}
          <div className="flex items-center h-7 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden shrink-0">
            <button
              type="button" aria-label="Restar"
              onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)}
              disabled={item.cantidad <= minCant}
              className="w-7 h-full flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors light:text-[#707070] light:hover:text-black light:hover:bg-black/5"
            >
              <Minus size={12} />
            </button>
            <div className="flex items-baseline h-full pl-1 pr-1.5 bg-white/[0.03] light:bg-black/[0.02]">
              <input
                ref={cantidadRef}
                type="number" step={permite ? '0.01' : '1'} min={minCant} value={item.cantidad}
                onChange={e => actualizarCantidad(item.productoId, Number(e.target.value))}
                aria-label="Cantidad"
                className={cn('w-9 text-center bg-transparent text-[13px] font-semibold text-white light:text-black outline-none', sinFlechas)}
              />
              <span className="text-[10px] font-medium text-[#808080]">{abrev}</span>
            </div>
            <button
              type="button" aria-label="Sumar"
              onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
              className="w-7 h-full flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-white/10 transition-colors light:text-[#707070] light:hover:text-black light:hover:bg-black/5"
            >
              <Plus size={12} />
            </button>
          </div>
          {/* "$1.000/m" en vez de "× $1.000": deja explícito que el precio es POR unidad de medida. */}
          <span className="text-[11px] text-[#606060] truncate">
            {money(item.precioUnitario)}{permite ? `/${abrev}` : ' c/u'}
          </span>
        </div>

        <div className="flex items-center justify-end gap-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#606060]">Desc.</span>
            <div className={cn(
              'flex items-center h-6 rounded-input border overflow-hidden transition-colors',
              item.descuentoItem > 0
                ? 'border-[#D4921A]/40 bg-[#D4921A]/[0.06]'
                : 'border-[#2A2A2A] light:border-[#E4E4E4]',
            )}>
              <input
                type="number" min={0} value={item.descuentoItem || ''} placeholder="0"
                onChange={e => actualizarDescuentoItem(item.productoId, Number(e.target.value))}
                aria-label="Descuento del ítem"
                className={cn('w-7 text-center bg-transparent text-[11px] text-white light:text-black outline-none placeholder:text-[#606060]', sinFlechas)}
              />
              <span className="text-[10px] text-[#606060] pr-1.5">{tipoDescuentoGlobal === 'porcentaje' ? '%' : '$'}</span>
            </div>
          </div>
          <button
            type="button" aria-label="Quitar del carrito"
            onClick={() => quitarProducto(item.productoId)}
            className="w-6 h-6 rounded flex items-center justify-center text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10 transition-colors shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}
