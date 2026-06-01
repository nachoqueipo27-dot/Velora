import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { usePresupuestosStore, calcularTotales, subtotalItem, type ItemPresupuestoInput } from '../../store/presupuestosStore'
import { useClientesStore } from '../../store/clientesStore'
import { useInventarioStore } from '../../store/inventarioStore'
import type { Presupuesto } from '../../types/presupuestos'
import { Search, Trash2 } from 'lucide-react'

interface ModalPresupuestoProps {
  open: boolean
  onClose: () => void
  presupuesto?: Presupuesto | null
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const ModalPresupuesto = ({ open, onClose, presupuesto }: ModalPresupuestoProps) => {
  const { crearPresupuesto, actualizarPresupuesto, cargarItems, items: itemsStore } = usePresupuestosStore()
  const { clientes, cargarClientes } = useClientesStore()
  const { productos, cargarProductos } = useInventarioStore()
  const esEdicion = !!presupuesto

  const [clienteId, setClienteId] = useState<number | ''>('')
  const [descripcion, setDescripcion] = useState('')
  const [vigenciaDias, setVigenciaDias] = useState('7')
  const [tipoItem, setTipoItem] = useState<'simple' | 'conjunto'>('simple')
  const [busqueda, setBusqueda] = useState('')
  const [items, setItems] = useState<ItemPresupuestoInput[]>([])
  const [descuento, setDescuento] = useState('0')
  const [tipoDescuento, setTipoDescuento] = useState<'porcentaje' | 'monto'>('porcentaje')
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    cargarClientes(); cargarProductos()
    if (presupuesto) {
      setClienteId(presupuesto.clienteId)
      setDescripcion(presupuesto.descripcion)
      setVigenciaDias(String(presupuesto.vigenciaDias))
      setDescuento(String(presupuesto.descuento))
      setTipoDescuento(presupuesto.tipoDescuento)
      cargarItems(presupuesto.id)
    } else {
      setClienteId(''); setDescripcion(''); setVigenciaDias('7'); setItems([]); setDescuento('0'); setTipoDescuento('porcentaje')
    }
    setBusqueda(''); setTipoItem('simple'); setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, presupuesto])

  // Al cargar items en edición, pasarlos al estado local
  useEffect(() => {
    if (open && presupuesto) {
      setItems(itemsStore.map(i => ({
        productoId: i.productoId, tipoItem: i.tipoItem, nombre: i.nombre,
        cantidad: i.cantidad, precioUnitario: i.precioUnitario, descuentoItem: i.descuentoItem,
      })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsStore])

  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const ya = new Set(items.map(i => i.productoId))
    return productos.filter(p => p.tipo === tipoItem && !ya.has(p.id) && q !== '' && p.nombre.toLowerCase().includes(q)).slice(0, 6)
  }, [productos, items, busqueda, tipoItem])

  const { subtotal, totalFinal } = useMemo(
    () => calcularTotales(items, Number(descuento) || 0, tipoDescuento),
    [items, descuento, tipoDescuento]
  )

  const agregar = (id: number, nombre: string, precio: number) => {
    setItems([...items, { productoId: id, tipoItem, nombre, cantidad: 1, precioUnitario: precio, descuentoItem: 0 }])
    setBusqueda('')
  }
  const setItem = (id: number, patch: Partial<ItemPresupuestoInput>) =>
    setItems(items.map(i => i.productoId === id ? { ...i, ...patch } : i))
  const quitar = (id: number) => setItems(items.filter(i => i.productoId !== id))

  const invalido = clienteId === '' || items.length === 0

  const handleGuardar = async () => {
    if (invalido) { setTouched(true); return }
    setGuardando(true)
    try {
      const data = {
        clienteId: Number(clienteId), descripcion, vigenciaDias: Number(vigenciaDias) || 7,
        descuento: Number(descuento) || 0, tipoDescuento, items,
      }
      if (esEdicion && presupuesto) await actualizarPresupuesto(presupuesto.id, data)
      else await crearPresupuesto(data)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? `Editar presupuesto #${String(presupuesto?.numero).padStart(3, '0')}` : 'Nuevo presupuesto'} maxWidth="max-w-2xl"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
      </>}>
      <div className="flex flex-col gap-4 pb-1">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <Select label="Cliente *" value={clienteId} onChange={e => setClienteId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="" className="bg-[#141414] light:bg-white">Seleccionar cliente...</option>
            {clientes.map(c => <option key={c.id} value={c.id} className="bg-[#141414] light:bg-white">{c.nombre}</option>)}
          </Select>
          <Input label="Vigencia (días)" type="number" value={vigenciaDias} onChange={e => setVigenciaDias(e.target.value)} />
        </div>
        {touched && clienteId === '' && <span className="text-xs text-[#C0392B] -mt-2">Seleccioná un cliente</span>}

        <Textarea label="Descripción" rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />

        {/* Agregar items */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Items</span>
          <div className="flex gap-2">
            <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
              {(['simple', 'conjunto'] as const).map(t => (
                <button key={t} type="button" onClick={() => { setTipoItem(t); setBusqueda('') }}
                  className={cn('px-3 py-1.5 text-[12px] rounded-[6px] transition-all capitalize',
                    tipoItem === t ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040] light:hover:text-black')}>
                  {t === 'simple' ? 'Simple' : 'Conjunto'}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606060]" />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder={`Buscar ${tipoItem === 'simple' ? 'producto' : 'conjunto'}...`}
                className={cn('w-full pl-8 pr-3 py-1.5 text-[13px] rounded-input border bg-transparent outline-none',
                  'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
                  'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')} />
              {busqueda && disponibles.length > 0 && (
                <div className={cn('absolute z-10 mt-1 w-full rounded-card border shadow-lg overflow-hidden', 'border-[#2A2A2A] bg-[#1C1C1C] light:border-[#E4E4E4] light:bg-white')}>
                  {disponibles.map(p => (
                    <button key={p.id} type="button" onClick={() => agregar(p.id, p.nombre, p.precio)}
                      className="w-full text-left px-3 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-white/[0.06] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.04]">
                      {p.nombre} <span className="text-[11px] text-[#606060]">· {money(p.precio)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {items.length === 0 ? (
            <p className="text-[11px] text-[#606060]">{touched ? <span className="text-[#C0392B]">Agregá al menos un item</span> : 'Buscá y agregá productos o conjuntos.'}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="grid grid-cols-[1fr_70px_100px_90px_80px_28px] gap-2 text-[10px] uppercase tracking-wider text-[#606060] px-1">
                <span>Item</span><span className="text-center">Cant.</span><span className="text-center">P. unit.</span><span className="text-center">Desc.</span><span className="text-right">Subtotal</span><span />
              </div>
              {items.map(it => (
                <div key={it.productoId} className="grid grid-cols-[1fr_70px_100px_90px_80px_28px] gap-2 items-center">
                  <span className="text-[13px] text-white light:text-black truncate">{it.nombre}</span>
                  <input type="number" min={1} value={it.cantidad} onChange={e => setItem(it.productoId, { cantidad: Math.max(1, Number(e.target.value)) })}
                    className="px-2 py-1 text-[13px] text-center rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
                  <input type="number" min={0} value={it.precioUnitario} onChange={e => setItem(it.productoId, { precioUnitario: Number(e.target.value) })}
                    className="px-2 py-1 text-[13px] text-center rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
                  <input type="number" min={0} value={it.descuentoItem} onChange={e => setItem(it.productoId, { descuentoItem: Number(e.target.value) })}
                    className="px-2 py-1 text-[13px] text-center rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
                  <span className="text-[13px] text-right text-[#A0A0A0] light:text-[#404040]">{money(subtotalItem(it))}</span>
                  <button type="button" onClick={() => quitar(it.productoId)} className="w-6 h-6 rounded flex items-center justify-center text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Descuento global + resumen */}
        <div className="flex items-end justify-between gap-4 pt-2 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
          <div className="flex items-end gap-2">
            <Input label="Descuento global" type="number" value={descuento} onChange={e => setDescuento(e.target.value)} className="w-28" />
            <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
              {(['porcentaje', 'monto'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTipoDescuento(t)}
                  className={cn('px-2.5 py-1.5 text-[12px] rounded-[6px] transition-all',
                    tipoDescuento === t ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040]')}>
                  {t === 'porcentaje' ? '%' : '$'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5 text-sm">
            <span className="text-[11px] text-[#606060]">Subtotal: <span className="text-[#A0A0A0]">{money(subtotal)}</span></span>
            <span className="text-lg font-semibold text-white light:text-black">Total: {money(totalFinal)}</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}
