import { usePosStore } from '../../../store/posStore'
import type { ItemCarrito as TItemCarrito } from '../../../types/pos'
import { Minus, Plus, X, ImageOff } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const ItemCarrito = ({ item }: { item: TItemCarrito }) => {
  const { actualizarCantidad, actualizarDescuentoItem, quitarProducto } = usePosStore()

  return (
    <div className="flex items-center gap-2 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] p-2 animate-fade-slide-down">
      <div className="w-9 h-9 rounded-input overflow-hidden bg-[#1C1C1C] light:bg-[#F4F4F4] flex items-center justify-center shrink-0">
        {item.imagen ? <img src={item.imagen} className="w-full h-full object-cover" alt="" /> : <ImageOff size={13} className="text-[#606060]" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-white light:text-black truncate">{item.nombre}</div>
        <div className="flex items-center gap-2 mt-0.5">
          {/* Cantidad */}
          <div className="flex items-center gap-0.5">
            <button onClick={() => actualizarCantidad(item.productoId, item.cantidad - 1)} disabled={item.cantidad <= 1}
              className="w-5 h-5 rounded flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-white/10 disabled:opacity-30 light:hover:text-black light:hover:bg-black/5"><Minus size={11} /></button>
            <span className="w-5 text-center text-[12px] text-white light:text-black">{item.cantidad}</span>
            <button onClick={() => actualizarCantidad(item.productoId, item.cantidad + 1)}
              className="w-5 h-5 rounded flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5"><Plus size={11} /></button>
          </div>
          <span className="text-[11px] text-[#606060]">× {money(item.precioUnitario)}</span>
          {/* Descuento */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#606060]">Desc</span>
            <input type="number" min={0} value={item.descuentoItem || ''} placeholder="0"
              onChange={e => actualizarDescuentoItem(item.productoId, Number(e.target.value))}
              className="w-14 px-1.5 py-0.5 text-[11px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[13px] font-semibold text-white light:text-black">{money(item.subtotal)}</span>
        <button onClick={() => quitarProducto(item.productoId)} className="w-5 h-5 rounded flex items-center justify-center text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><X size={12} /></button>
      </div>
    </div>
  )
}
