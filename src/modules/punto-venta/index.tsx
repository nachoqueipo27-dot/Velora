import { useState } from 'react'
import { usePosStore } from '../../store/posStore'
import { BuscadorProducto } from './BuscadorProducto'
import { Carrito } from './Carrito'
import { ResumenVenta } from './ResumenVenta'
import { ModalConfirmacion } from './ModalConfirmacion'
import type { VentaPOS } from '../../types/pos'
import { toast } from '../../store/toastStore'
import { ShoppingCart } from 'lucide-react'

const PuntoVenta = () => {
  const { carrito, limpiarCarrito } = usePosStore()
  const [confirmar, setConfirmar] = useState(false)

  const onVenta = (v: VentaPOS) => {
    setConfirmar(false)
    toast.success(`Venta #${String(v.numero).padStart(3, '0')} registrada`)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Panel izquierdo — buscador */}
      <section className="flex-1 overflow-hidden p-6 border-r border-[#2A2A2A] light:border-[#E4E4E4]">
        <BuscadorProducto />
      </section>

      {/* Panel derecho — carrito + cobro */}
      <aside className="w-[380px] shrink-0 flex flex-col p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white light:text-black">
            <ShoppingCart size={16} /> Carrito
            {carrito.length > 0 && <span className="text-[11px] text-[#606060]">({carrito.length})</span>}
          </h2>
          {carrito.length > 0 && (
            <button onClick={limpiarCarrito} className="text-[11px] text-[#606060] hover:text-[#C0392B] transition-colors">Vaciar</button>
          )}
        </div>

        <Carrito />
        <ResumenVenta onConfirmar={() => setConfirmar(true)} />
      </aside>

      <ModalConfirmacion open={confirmar} onClose={() => setConfirmar(false)} onVenta={onVenta} />
    </div>
  )
}

export default PuntoVenta
