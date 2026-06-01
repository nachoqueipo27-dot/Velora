import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { useInventarioStore } from '../../store/inventarioStore'
import { useNavigationStore } from '../../store/navigationStore'
import { ModalProducto } from '../../modules/inventario/ModalProducto'
import { StockBadge } from '../../modules/inventario/components/StockBadge'
import type { Producto } from '../../types/inventario'
import { X, ImageOff, ScanLine, ClipboardList, ShoppingCart } from 'lucide-react'

interface ModalEscaneoProps {
  codigo: string
  onClose: () => void
}

export const ModalEscaneo = ({ codigo, onClose }: ModalEscaneoProps) => {
  const { buscarPorCodigoBarras, seleccionarProducto } = useInventarioStore()
  const { setModule } = useNavigationStore()
  const [producto, setProducto] = useState<Producto | null | 'loading'>('loading')
  const [editar, setEditar] = useState(false)
  const [crear, setCrear] = useState(false)

  useEffect(() => {
    setProducto('loading')
    buscarPorCodigoBarras(codigo).then(setProducto)
  }, [codigo, buscarPorCodigoBarras])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const verFicha = () => {
    if (producto && producto !== 'loading') {
      seleccionarProducto(producto)
      setModule('inventario')
      onClose()
    }
  }

  // Submodal de creación / edición — al cerrarlo cerramos el escaneo
  if (crear) return <ModalProducto open onClose={onClose} codigoBarrasInicial={codigo} />
  if (editar && producto && producto !== 'loading') return <ModalProducto open onClose={onClose} producto={producto} />

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 animate-overlay-in" onMouseDown={onClose}>
      <div onMouseDown={e => e.stopPropagation()}
        className={cn('w-full max-w-md rounded-modal border shadow-2xl animate-modal-in', 'border-[#2A2A2A] bg-[#141414]', 'light:border-[#E4E4E4] light:bg-white')}>
        <div className="flex items-center justify-between p-5 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white light:text-black">
            <ScanLine size={16} className="text-[#4A7FA5]" /> Código escaneado
          </div>
          <button onClick={onClose} className="p-1 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all"><X size={16} /></button>
        </div>

        <div className="px-5 pb-5">
          <p className="text-[11px] text-[#606060] mb-3">Código: <span className="text-[#A0A0A0] font-mono">{codigo}</span></p>

          {producto === 'loading' ? (
            <p className="text-sm text-[#606060] py-6 text-center">Buscando producto...</p>
          ) : producto ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 rounded-card overflow-hidden flex items-center justify-center bg-[#1C1C1C] light:bg-[#F4F4F4] shrink-0">
                  {producto.imagen ? <img src={producto.imagen} className="w-full h-full object-cover" alt="" /> : <ImageOff size={18} className="text-[#606060]" />}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-base font-semibold text-white light:text-black">{producto.nombre}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge label={producto.tipo === 'conjunto' ? 'Conjunto' : 'Simple'} variant="info" />
                    {producto.categoriaNombre && <Badge label={producto.categoriaNombre} variant="default" />}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
                <span className="text-[#606060]">Precio</span>
                <span className="text-right text-white light:text-black">${producto.precio.toLocaleString('es-AR')}</span>
                <span className="text-[#606060]">Stock</span>
                <span className="text-right flex items-center justify-end gap-2">
                  <span className="text-white light:text-black">{producto.tipo === 'conjunto' ? '—' : producto.stock}</span>
                  {producto.tipo === 'simple' && <StockBadge stock={producto.stock} stockMinimo={producto.stockMinimo} />}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant="secondary" onClick={() => console.log('Agregar a OT (Paso 9):', producto.id)}>
                  <ClipboardList size={14} className="mr-1.5" /> Agregar a OT
                </Button>
                <Button size="sm" variant="secondary" onClick={() => console.log('Agregar al POS (Paso 11):', producto.id)}>
                  <ShoppingCart size={14} className="mr-1.5" /> Agregar al POS
                </Button>
                <Button size="sm" variant="ghost" onClick={verFicha}>Ver ficha</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditar(true)}>Editar producto</Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm text-[#A0A0A0] light:text-[#404040]">Código no registrado</p>
              <p className="text-[11px] text-[#606060]">No hay ningún producto con este código de barras.</p>
              <Button size="sm" onClick={() => setCrear(true)}>Crear producto con este código</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
