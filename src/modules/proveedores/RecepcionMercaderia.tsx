import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useProveedoresStore } from '../../store/proveedoresStore'
import { useInventarioStore } from '../../store/inventarioStore'
import { ArrowLeft, Send, PackageCheck, Search, Trash2, Plus } from 'lucide-react'
import { format } from 'date-fns'

interface RecepcionMercaderiaProps {
  onVolver: () => void
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const numFmt = (n: number) => `#${String(n).padStart(3, '0')}`

export const RecepcionMercaderia = ({ onVolver }: RecepcionMercaderiaProps) => {
  const { ordenSeleccionada, items, cargarItemsOrden, actualizarEstadoOrden, agregarItemOrden, eliminarItemOrden } = useProveedoresStore()
  const { productos, cargarProductos } = useInventarioStore()
  const [confirmRecibir, setConfirmRecibir] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  const o = ordenSeleccionada

  useEffect(() => {
    if (o) cargarItemsOrden(o.id)
    cargarProductos()
  }, [o, cargarItemsOrden, cargarProductos])

  const total = useMemo(() => items.reduce((s, i) => s + i.cantidad * i.precioCosto, 0), [items])
  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const ya = new Set(items.map(i => i.productoId))
    return productos.filter(p => p.tipo === 'simple' && !ya.has(p.id) && q !== '' && p.nombre.toLowerCase().includes(q)).slice(0, 6)
  }, [productos, items, busqueda])

  if (!o) return null
  const esBorrador = o.estado === 'borrador'

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={onVolver} className="p-1.5 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all"><ArrowLeft size={16} /></button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white light:text-black">Orden {numFmt(o.numero)}</h2>
              {o.estado === 'recibida' ? <Badge label="Recibida" variant="success" /> : o.estado === 'enviada' ? <Badge label="Enviada" variant="info" /> : <Badge label="Borrador" variant="default" />}
            </div>
            <span className="text-[11px] text-[#606060]">{o.proveedorNombre}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {o.estado === 'borrador' && <Button size="sm" variant="secondary" onClick={() => actualizarEstadoOrden(o.id, 'enviada')}><Send size={14} className="mr-1.5" /> Marcar como enviada</Button>}
          {o.estado === 'enviada' && <Button size="sm" onClick={() => setConfirmRecibir(true)}><PackageCheck size={14} className="mr-1.5" /> Confirmar recepción</Button>}
        </div>
      </div>

      {/* Fechas */}
      <div className="flex gap-6 mb-4 text-sm">
        <div className="flex flex-col"><span className="text-[11px] text-[#606060] uppercase tracking-wider">Creación</span><span className="text-white light:text-black">{format(new Date(o.creadoEn), 'dd/MM/yyyy')}</span></div>
        {o.fechaEnvio && <div className="flex flex-col"><span className="text-[11px] text-[#606060] uppercase tracking-wider">Enviada</span><span className="text-white light:text-black">{format(new Date(o.fechaEnvio), 'dd/MM/yyyy')}</span></div>}
        {o.fechaRecepcion && <div className="flex flex-col"><span className="text-[11px] text-[#606060] uppercase tracking-wider">Recibida</span><span className="text-white light:text-black">{format(new Date(o.fechaRecepcion), 'dd/MM/yyyy')}</span></div>}
      </div>

      {/* Agregar items en borrador */}
      {esBorrador && (
        <div className="relative mb-3 max-w-sm">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Agregar producto a la orden..."
            className={cn('w-full pl-8 pr-3 py-1.5 text-[13px] rounded-input border bg-transparent outline-none',
              'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
              'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')} />
          {disponibles.length > 0 && (
            <div className={cn('absolute z-10 mt-1 w-full rounded-card border shadow-lg overflow-hidden', 'border-[#2A2A2A] bg-[#1C1C1C] light:border-[#E4E4E4] light:bg-white')}>
              {disponibles.map(p => (
                <button key={p.id} type="button" onClick={() => { agregarItemOrden(o.id, p.id, 1, p.precioCosto); setBusqueda('') }}
                  className="w-full text-left px-3 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-white/[0.06] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.04] flex items-center gap-1.5">
                  <Plus size={12} /> {p.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      <table className="w-full text-sm border-collapse">
        <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
          <th className="text-left font-medium px-3 py-2">Producto</th>
          <th className="text-right font-medium px-3 py-2">Cantidad</th>
          <th className="text-right font-medium px-3 py-2">Precio costo</th>
          <th className="text-right font-medium px-3 py-2">Subtotal</th>
          {esBorrador && <th className="text-right font-medium px-3 py-2" />}
        </tr></thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
              <td className="px-3 py-2.5 text-white light:text-black font-medium">{it.productoNombre}</td>
              <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{it.cantidad}</td>
              <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(it.precioCosto)}</td>
              <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(it.cantidad * it.precioCosto)}</td>
              {esBorrador && (
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => eliminarItemOrden(it.id)} className="w-6 h-6 rounded inline-flex items-center justify-center text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={13} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-[#2A2A2A] light:border-[#E4E4E4]">
            <td className="px-3 py-2.5 font-semibold text-white light:text-black" colSpan={3}>Total</td>
            <td className="px-3 py-2.5 text-right font-semibold text-white light:text-black">{money(total)}</td>
            {esBorrador && <td />}
          </tr>
        </tfoot>
      </table>

      {o.notas && <p className="mt-4 text-[13px] text-[#A0A0A0] light:text-[#404040]"><span className="text-[#606060]">Notas: </span>{o.notas}</p>}

      <Modal
        open={confirmRecibir}
        onClose={() => setConfirmRecibir(false)}
        title="Confirmar recepción"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmRecibir(false)}>Cancelar</Button>
          <Button onClick={() => { actualizarEstadoOrden(o.id, 'recibida'); setConfirmRecibir(false) }}>Confirmar recepción</Button>
        </>}
      >
        <p className="text-sm text-[#A0A0A0] light:text-[#404040] pb-2">¿Confirmar recepción? Esto sumará los productos al stock.</p>
      </Modal>
    </div>
  )
}
