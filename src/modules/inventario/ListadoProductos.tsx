import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useInventarioStore } from '../../store/inventarioStore'
import { UNIDADES_MEDIDA, type Producto } from '../../types/inventario'
import { StockBadge } from './components/StockBadge'
import { ModalProducto } from './ModalProducto'
import { Search, Plus, Eye, Pencil, Trash2, ImageOff, AlertTriangle, PackageX } from 'lucide-react'

const LABEL_UNIDAD: Record<string, string> = Object.fromEntries(UNIDADES_MEDIDA.map(u => [u.value, u.label]))

interface ListadoProductosProps {
  tipo: 'simple' | 'conjunto'
  onVer: (p: Producto) => void
}

export const ListadoProductos = ({ tipo, onVer }: ListadoProductosProps) => {
  const { productos, categorias, loading, cargarComponentes, eliminarProducto } = useInventarioStore()
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState('Todas')
  const [modal, setModal] = useState<{ open: boolean; producto: Producto | null }>({ open: false, producto: null })
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [warnings, setWarnings] = useState<Record<number, boolean>>({})

  const prodMap = useMemo(() => {
    const m = new Map<number, Producto>()
    productos.forEach(p => m.set(p.id, p))
    return m
  }, [productos])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(p =>
      p.tipo === tipo &&
      (filtroCat === 'Todas' || p.categoriaNombre === filtroCat) &&
      (q === '' || p.nombre.toLowerCase().includes(q) || p.codigoSku.toLowerCase().includes(q))
    )
  }, [productos, tipo, busqueda, filtroCat])

  // Advertencia de componentes bajo mínimo para conjuntos
  useEffect(() => {
    if (tipo !== 'conjunto') return
    let cancel = false
    ;(async () => {
      const w: Record<number, boolean> = {}
      for (const c of filtrados) {
        const comps = await cargarComponentes(c.id)
        w[c.id] = comps.some(x => {
          const prod = prodMap.get(x.componenteId)
          return prod ? prod.stock <= prod.stockMinimo : false
        })
      }
      if (!cancel) setWarnings(w)
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, tipo])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input
            className={cn('w-full pl-9 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none', 'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white', 'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')}
            placeholder="Buscar por nombre o SKU..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
            <option value="Todas" className="bg-[#141414] light:bg-white">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.nombre} className="bg-[#141414] light:bg-white">{c.nombre}</option>)}
          </Select>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setModal({ open: true, producto: null })}>
          <Plus size={14} className="mr-1.5" /> {tipo === 'conjunto' ? 'Nuevo conjunto' : 'Nuevo producto'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && productos.length === 0 ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 rounded-input animate-shimmer" />)}</div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><PackageX size={20} className="text-[#606060]" /></div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">{tipo === 'conjunto' ? 'No hay conjuntos' : 'No hay productos'} que coincidan</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                <th className="text-left font-medium px-3 py-2">Producto</th>
                <th className="text-left font-medium px-3 py-2">Categoría</th>
                <th className="text-right font-medium px-3 py-2">Precio</th>
                <th className="text-right font-medium px-3 py-2">Stock</th>
                <th className="text-left font-medium px-3 py-2">Estado</th>
                <th className="text-right font-medium px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} className={cn('border-t transition-colors', 'border-[#2A2A2A] hover:bg-white/[0.03]', 'light:border-[#E4E4E4] light:hover:bg-black/[0.02]')}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-input overflow-hidden flex items-center justify-center bg-[#1C1C1C] light:bg-[#F4F4F4] shrink-0">
                        {p.imagen ? <img src={p.imagen} className="w-full h-full object-cover" alt="" /> : <ImageOff size={14} className="text-[#606060]" />}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white light:text-black">{p.nombre}</span>
                        {tipo === 'conjunto' && warnings[p.id] && (
                          <span title="Algún componente está bajo mínimo" className="text-[#D4921A]"><AlertTriangle size={13} /></span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{p.categoriaNombre || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black">${p.precio.toLocaleString('es-AR')}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">
                    {p.tipo === 'conjunto' ? '—' : `${p.stock} ${LABEL_UNIDAD[p.unidadMedida] ?? ''}`}
                  </td>
                  <td className="px-3 py-2.5">{p.tipo === 'conjunto' ? <span className="text-[11px] text-[#606060]">—</span> : <StockBadge stock={p.stock} stockMinimo={p.stockMinimo} />}</td>
                  <td className="px-3 py-2.5">
                    {confirmId === p.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] text-[#A0A0A0]">¿Eliminar?</span>
                        <Button size="sm" variant="danger" onClick={() => { eliminarProducto(p.id); setConfirmId(null) }}>Sí</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>No</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Ver" onClick={() => onVer(p)}><Eye size={14} /></IconBtn>
                        <IconBtn title="Editar" onClick={() => setModal({ open: true, producto: p })}><Pencil size={14} /></IconBtn>
                        <IconBtn title="Eliminar" danger onClick={() => setConfirmId(p.id)}><Trash2 size={14} /></IconBtn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalProducto open={modal.open} producto={modal.producto} tipoInicial={tipo} onClose={() => setModal({ open: false, producto: null })} />
    </div>
  )
}

const IconBtn = ({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) => (
  <button title={title} onClick={onClick}
    className={cn('p-1.5 rounded-input transition-all duration-150',
      danger ? 'text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10' : 'text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5')}>
    {children}
  </button>
)
