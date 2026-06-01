import { useState } from 'react'
import { cn } from '../../../lib/utils'
import { StockBadge } from '../../inventario/components/StockBadge'
import type { Producto } from '../../../types/inventario'
import { ImageOff } from 'lucide-react'

interface ProductoCardProps {
  producto: Producto
  onAgregar: () => void
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const ProductoCard = ({ producto, onAgregar }: ProductoCardProps) => {
  const [flash, setFlash] = useState(false)
  const esConjunto = producto.tipo === 'conjunto'
  const sinStock = !esConjunto && producto.stock === 0

  const handle = () => {
    if (sinStock) return
    onAgregar()
    setFlash(true)
    setTimeout(() => setFlash(false), 400)
  }

  return (
    <button onClick={handle} disabled={sinStock}
      className={cn('flex flex-col rounded-card border overflow-hidden text-left transition-all duration-300',
        'border-[#2A2A2A] bg-[#141414] hover:border-[#3A3A3A] hover:-translate-y-0.5',
        'light:border-[#E4E4E4] light:bg-white light:hover:border-[#D0D0D0]',
        sinStock && 'opacity-40 cursor-not-allowed hover:translate-y-0',
        flash && 'ring-2 ring-[#4CAF7D] bg-[#4CAF7D]/10')}>
      <div className="aspect-[3/2] w-full bg-[#1C1C1C] light:bg-[#F4F4F4] flex items-center justify-center overflow-hidden">
        {producto.imagen ? <img src={producto.imagen} className="w-full h-full object-cover" alt="" /> : <ImageOff size={20} className="text-[#606060]" />}
      </div>
      <div className="p-2 flex flex-col gap-1">
        <span className="text-[13px] font-medium text-white light:text-black truncate">{producto.nombre}</span>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white light:text-black">{money(producto.precio)}</span>
          {esConjunto ? <span className="text-[10px] text-[#606060]">Conjunto</span> : <StockBadge stock={producto.stock} stockMinimo={producto.stockMinimo} />}
        </div>
      </div>
    </button>
  )
}
