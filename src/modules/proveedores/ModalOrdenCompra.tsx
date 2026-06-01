import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useProveedoresStore, type ItemOrdenInput } from '../../store/proveedoresStore'
import { useInventarioStore } from '../../store/inventarioStore'
import { Search, Trash2 } from 'lucide-react'

interface ModalOrdenCompraProps {
  open: boolean
  onClose: () => void
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const ModalOrdenCompra = ({ open, onClose }: ModalOrdenCompraProps) => {
  const { proveedores, crearOrden, cargarProveedores } = useProveedoresStore()
  const { productos, cargarProductos } = useInventarioStore()

  const [proveedorId, setProveedorId] = useState<number | ''>('')
  const [items, setItems] = useState<ItemOrdenInput[]>([])
  const [notas, setNotas] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    cargarProveedores(); cargarProductos()
    setProveedorId(''); setItems([]); setNotas(''); setBusqueda(''); setTouched(false)
  }, [open, cargarProveedores, cargarProductos])

  const prodMap = useMemo(() => {
    const m = new Map<number, string>()
    productos.forEach(p => m.set(p.id, p.nombre))
    return m
  }, [productos])

  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const ya = new Set(items.map(i => i.productoId))
    return productos.filter(p => p.tipo === 'simple' && !ya.has(p.id) && (q === '' || p.nombre.toLowerCase().includes(q))).slice(0, 6)
  }, [productos, items, busqueda])

  const total = useMemo(() => items.reduce((s, i) => s + i.cantidad * i.precioCosto, 0), [items])

  const agregar = (id: number, costo: number) => {
    setItems([...items, { productoId: id, cantidad: 1, precioCosto: costo }])
    setBusqueda('')
  }
  const setItem = (id: number, patch: Partial<ItemOrdenInput>) =>
    setItems(items.map(i => i.productoId === id ? { ...i, ...patch } : i))
  const quitar = (id: number) => setItems(items.filter(i => i.productoId !== id))

  const invalido = proveedorId === '' || items.length === 0

  const handleGuardar = async () => {
    if (invalido) { setTouched(true); return }
    setGuardando(true)
    try {
      await crearOrden(Number(proveedorId), items, notas)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva orden de compra"
      maxWidth="max-w-2xl"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar orden'}</Button>
      </>}
    >
      <div className="flex flex-col gap-4 pb-1">
        <Select label="Proveedor *" value={proveedorId} onChange={e => setProveedorId(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="" className="bg-[#141414] light:bg-white">Seleccionar proveedor...</option>
          {proveedores.filter(p => p.activo).map(p => (
            <option key={p.id} value={p.id} className="bg-[#141414] light:bg-white">{p.nombre}</option>
          ))}
        </Select>
        {touched && proveedorId === '' && <span className="text-xs text-[#C0392B] -mt-2">Seleccioná un proveedor</span>}

        {/* Buscador de productos */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Agregar productos</span>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606060]" />
            <input
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar producto..."
              className={cn('w-full pl-8 pr-3 py-1.5 text-[13px] rounded-input border bg-transparent outline-none',
                'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
                'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')}
            />
            {busqueda && disponibles.length > 0 && (
              <div className={cn('absolute z-10 mt-1 w-full rounded-card border shadow-lg overflow-hidden', 'border-[#2A2A2A] bg-[#1C1C1C] light:border-[#E4E4E4] light:bg-white')}>
                {disponibles.map(p => (
                  <button key={p.id} type="button" onClick={() => agregar(p.id, p.precioCosto)}
                    className="w-full text-left px-3 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-white/[0.06] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.04] transition-colors">
                    {p.nombre} <span className="text-[11px] text-[#606060]">· costo {money(p.precioCosto)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <p className="text-[11px] text-[#606060]">{touched ? <span className="text-[#C0392B]">Agregá al menos un producto</span> : 'Todavía no agregaste productos.'}</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="grid grid-cols-[1fr_80px_110px_90px_32px] gap-2 text-[11px] uppercase tracking-wider text-[#606060] px-1">
              <span>Producto</span><span className="text-center">Cant.</span><span className="text-center">Costo u.</span><span className="text-right">Subtotal</span><span />
            </div>
            {items.map(it => (
              <div key={it.productoId} className="grid grid-cols-[1fr_80px_110px_90px_32px] gap-2 items-center">
                <span className="text-[13px] text-white light:text-black truncate">{prodMap.get(it.productoId)}</span>
                <input type="number" min={1} value={it.cantidad} onChange={e => setItem(it.productoId, { cantidad: Math.max(1, Number(e.target.value)) })}
                  className="px-2 py-1 text-[13px] text-center rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
                <input type="number" min={0} value={it.precioCosto} onChange={e => setItem(it.productoId, { precioCosto: Number(e.target.value) })}
                  className="px-2 py-1 text-[13px] text-center rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
                <span className="text-[13px] text-right text-[#A0A0A0] light:text-[#404040]">{money(it.cantidad * it.precioCosto)}</span>
                <button type="button" onClick={() => quitar(it.productoId)} className="w-6 h-6 rounded flex items-center justify-center text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <div className="flex justify-end gap-3 mt-2 pt-2 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
              <span className="text-[11px] text-[#606060] uppercase tracking-wider">Total</span>
              <span className="text-sm font-semibold text-white light:text-black">{money(total)}</span>
            </div>
          </div>
        )}

        <Textarea label="Notas" rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
      </div>
    </Modal>
  )
}
