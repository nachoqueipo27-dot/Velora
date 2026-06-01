import { usePosStore } from '../../store/posStore'
import { ItemCarrito } from './components/ItemCarrito'
import { ShoppingCart } from 'lucide-react'

export const Carrito = () => {
  const { carrito } = usePosStore()

  if (carrito.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><ShoppingCart size={20} className="text-[#606060]" /></div>
        <p className="text-sm text-[#A0A0A0] light:text-[#404040]">Agregá productos para comenzar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1">
      {carrito.map(item => <ItemCarrito key={item.productoId} item={item} />)}
    </div>
  )
}
