import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { useProveedoresStore } from '../../store/proveedoresStore'
import type { OrdenCompra, EstadoOrdenCompra } from '../../types/proveedores'
import { ModalOrdenCompra } from './ModalOrdenCompra'
import { Plus, Eye, Send, PackageCheck, Trash2, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface OrdenesCompraProps {
  onVerDetalle: (o: OrdenCompra) => void
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const numFmt = (n: number) => `#${String(n).padStart(3, '0')}`

const estadoBadge = (e: EstadoOrdenCompra) => {
  if (e === 'enviada') return <Badge label="Enviada" variant="info" />
  if (e === 'recibida') return <Badge label="Recibida" variant="success" />
  return <Badge label="Borrador" variant="default" />
}

export const OrdenesCompra = ({ onVerDetalle }: OrdenesCompraProps) => {
  const { ordenes, proveedores, loading, cargarOrdenes, cargarProveedores, actualizarEstadoOrden, eliminarOrden } = useProveedoresStore()
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroProv, setFiltroProv] = useState('Todos')
  const [modalNueva, setModalNueva] = useState(false)
  const [confirmRecibir, setConfirmRecibir] = useState<OrdenCompra | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null)

  useEffect(() => { cargarOrdenes(); cargarProveedores() }, [cargarOrdenes, cargarProveedores])

  const filtradas = useMemo(() =>
    ordenes.filter(o =>
      (filtroEstado === 'Todos' || o.estado === filtroEstado) &&
      (filtroProv === 'Todos' || o.proveedorNombre === filtroProv)
    ), [ordenes, filtroEstado, filtroProv])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-40"><Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="Todos" className="bg-[#141414] light:bg-white">Todos los estados</option>
          <option value="borrador" className="bg-[#141414] light:bg-white">Borrador</option>
          <option value="enviada" className="bg-[#141414] light:bg-white">Enviada</option>
          <option value="recibida" className="bg-[#141414] light:bg-white">Recibida</option>
        </Select></div>
        <div className="w-52"><Select value={filtroProv} onChange={e => setFiltroProv(e.target.value)}>
          <option value="Todos" className="bg-[#141414] light:bg-white">Todos los proveedores</option>
          {proveedores.map(p => <option key={p.id} value={p.nombre} className="bg-[#141414] light:bg-white">{p.nombre}</option>)}
        </Select></div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setModalNueva(true)}><Plus size={14} className="mr-1.5" /> Nueva orden</Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && ordenes.length === 0 ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-input animate-shimmer" />)}</div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><FileText size={20} className="text-[#606060]" /></div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">No hay órdenes que coincidan</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
              <th className="text-left font-medium px-3 py-2">N°</th>
              <th className="text-left font-medium px-3 py-2">Proveedor</th>
              <th className="text-left font-medium px-3 py-2">Estado</th>
              <th className="text-right font-medium px-3 py-2">Total</th>
              <th className="text-left font-medium px-3 py-2">Creación</th>
              <th className="text-right font-medium px-3 py-2">Acciones</th>
            </tr></thead>
            <tbody>
              {filtradas.map(o => (
                <tr key={o.id} className={cn('border-t transition-colors', 'border-[#2A2A2A] hover:bg-white/[0.03]', 'light:border-[#E4E4E4] light:hover:bg-black/[0.02]')}>
                  <td className="px-3 py-2.5 font-medium text-white light:text-black">{numFmt(o.numero)}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{o.proveedorNombre}</td>
                  <td className="px-3 py-2.5">{estadoBadge(o.estado)}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black">{money(o.total)}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(o.creadoEn), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5">
                    {confirmEliminar === o.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] text-[#A0A0A0]">¿Eliminar?</span>
                        <Button size="sm" variant="danger" onClick={() => { eliminarOrden(o.id); setConfirmEliminar(null) }}>Sí</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmEliminar(null)}>No</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Ver detalle" onClick={() => onVerDetalle(o)}><Eye size={14} /></IconBtn>
                        {o.estado === 'borrador' && (
                          <>
                            <IconBtn title="Marcar como enviada" onClick={() => actualizarEstadoOrden(o.id, 'enviada')}><Send size={14} /></IconBtn>
                            <IconBtn title="Eliminar" danger onClick={() => setConfirmEliminar(o.id)}><Trash2 size={14} /></IconBtn>
                          </>
                        )}
                        {o.estado === 'enviada' && (
                          <IconBtn title="Marcar como recibida" onClick={() => setConfirmRecibir(o)}><PackageCheck size={14} /></IconBtn>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalOrdenCompra open={modalNueva} onClose={() => setModalNueva(false)} />

      <Modal
        open={confirmRecibir !== null}
        onClose={() => setConfirmRecibir(null)}
        title="Confirmar recepción"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmRecibir(null)}>Cancelar</Button>
          <Button onClick={() => { if (confirmRecibir) actualizarEstadoOrden(confirmRecibir.id, 'recibida'); setConfirmRecibir(null) }}>Confirmar recepción</Button>
        </>}
      >
        <p className="text-sm text-[#A0A0A0] light:text-[#404040] pb-2">
          ¿Confirmar recepción de la orden {confirmRecibir && numFmt(confirmRecibir.numero)}? Esto sumará los productos al stock.
        </p>
      </Modal>
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
