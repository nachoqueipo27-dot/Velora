import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { useInventarioStore } from '../../store/inventarioStore'
import { usePosStore } from '../../store/posStore'
import { ProductoCard } from './components/ProductoCard'
import { Search, PackageX } from 'lucide-react'

export const BuscadorProducto = () => {
  const { productos, loading, cargarProductos } = useInventarioStore()
  const { agregarProducto } = usePosStore()
  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState<'simple' | 'conjunto'>('simple')

  useEffect(() => { cargarProductos() }, [cargarProductos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(p => p.tipo === tipo && p.activo &&
      (q === '' || p.nombre.toLowerCase().includes(q) || p.codigoSku.toLowerCase().includes(q)))
  }, [productos, tipo, busqueda])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input className={cn('w-full pl-9 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none',
            'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
            'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')}
            placeholder="Buscar por nombre o SKU..." value={busqueda} onChange={e => setBusqueda(e.target.value)} autoFocus />
        </div>
        <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
          {(['simple', 'conjunto'] as const).map(t => (
            <button key={t} onClick={() => setTipo(t)}
              className={cn('px-3 py-1.5 text-[12px] rounded-[6px] transition-all capitalize',
                tipo === t ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040]')}>
              {t === 'simple' ? 'Simples' : 'Conjuntos'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && productos.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 rounded-card animate-shimmer" />)}</div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><PackageX size={20} className="text-[#606060]" /></div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">No hay productos que coincidan</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtrados.map(p => <ProductoCard key={p.id} producto={p} onAgregar={() => agregarProducto(p.id, p.tipo)} />)}
          </div>
        )}
      </div>
    </div>
  )
}
