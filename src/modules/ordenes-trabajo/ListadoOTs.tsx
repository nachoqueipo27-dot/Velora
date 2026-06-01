import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useOTStore } from '../../store/otStore'
import { useEmpleadosStore } from '../../store/empleadosStore'
import { ESTADOS_OT, UMBRAL_DIAS_SIN_MOVIMIENTO, type OrdenTrabajo } from '../../types/ordenesTrabajo'
import { EstadoBadgeOT } from './components/EstadoBadgeOT'
import { EtiquetaChip } from './components/EtiquetaChip'
import { KanbanOTs } from './KanbanOTs'
import { ModalCancelacion } from './ModalCancelacion'
import { Search, Plus, Eye, Play, Check, PackageCheck, X, LayoutGrid, List, FileSpreadsheet, ClipboardList } from 'lucide-react'

interface ListadoOTsProps { onVer: (ot: OrdenTrabajo) => void; onNueva: () => void }

export const ListadoOTs = ({ onVer, onNueva }: ListadoOTsProps) => {
  const { ots, etiquetas, loading, cargarOTs, cargarEtiquetas, cambiarEstado } = useOTStore()
  const { empleados, cargarEmpleados } = useEmpleadosStore()
  const [vista, setVista] = useState<'lista' | 'kanban'>('lista')
  const [busqueda, setBusqueda] = useState('')
  const [fEstado, setFEstado] = useState('Todos')
  const [fEmpleado, setFEmpleado] = useState('Todos')
  const [fEtiqueta, setFEtiqueta] = useState('Todas')
  const [cancelar, setCancelar] = useState<OrdenTrabajo | null>(null)

  useEffect(() => { cargarOTs(); cargarEtiquetas(); cargarEmpleados() }, [cargarOTs, cargarEtiquetas, cargarEmpleados])

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return ots.filter(o =>
      (fEstado === 'Todos' || o.estado === fEstado) &&
      (fEmpleado === 'Todos' || String(o.empleadoId) === fEmpleado) &&
      (fEtiqueta === 'Todas' || o.etiquetas.some(e => String(e.id) === fEtiqueta)) &&
      (q === '' || String(o.numero).includes(q) || o.clienteNombre.toLowerCase().includes(q) || o.productoNombre.toLowerCase().includes(q))
    )
  }, [ots, busqueda, fEstado, fEmpleado, fEtiqueta])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
          <button onClick={() => setVista('lista')} className={cn('px-2.5 py-1.5 rounded-[6px] transition-all', vista === 'lista' ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040]')}><List size={15} /></button>
          <button onClick={() => setVista('kanban')} className={cn('px-2.5 py-1.5 rounded-[6px] transition-all', vista === 'kanban' ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040]')}><LayoutGrid size={15} /></button>
        </div>
        <div className="relative w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input className={cn('w-full pl-9 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none',
            'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
            'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')}
            placeholder="Buscar #, cliente o producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="w-36"><Select value={fEstado} onChange={e => setFEstado(e.target.value)}>
          <option value="Todos" className="bg-[#141414] light:bg-white">Estado: todos</option>
          {ESTADOS_OT.map(e => <option key={e.value} value={e.value} className="bg-[#141414] light:bg-white">{e.label}</option>)}
        </Select></div>
        <div className="w-40"><Select value={fEmpleado} onChange={e => setFEmpleado(e.target.value)}>
          <option value="Todos" className="bg-[#141414] light:bg-white">Empleado: todos</option>
          {empleados.map(e => <option key={e.id} value={String(e.id)} className="bg-[#141414] light:bg-white">{e.nombre}</option>)}
        </Select></div>
        <div className="w-36"><Select value={fEtiqueta} onChange={e => setFEtiqueta(e.target.value)}>
          <option value="Todas" className="bg-[#141414] light:bg-white">Etiqueta: todas</option>
          {etiquetas.map(e => <option key={e.id} value={String(e.id)} className="bg-[#141414] light:bg-white">{e.nombre}</option>)}
        </Select></div>
        <div className="flex-1" />
        <Button size="sm" variant="secondary" onClick={() => console.log('Exportar OTs:', filtradas)}><FileSpreadsheet size={14} className="mr-1.5" /> Excel</Button>
        <Button size="sm" onClick={onNueva}><Plus size={14} className="mr-1.5" /> Nueva OT</Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {vista === 'kanban' ? (
          <KanbanOTs onVer={onVer} />
        ) : (
          <div className="h-full overflow-y-auto">
            {loading && ots.length === 0 ? (
              <div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-input animate-shimmer" />)}</div>
            ) : filtradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><ClipboardList size={20} className="text-[#606060]" /></div>
                <p className="text-sm text-[#A0A0A0] light:text-[#404040]">No hay OTs que coincidan</p>
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                  <th className="text-left font-medium px-3 py-2">#</th>
                  <th className="text-left font-medium px-3 py-2">Cliente</th>
                  <th className="text-left font-medium px-3 py-2">Producto</th>
                  <th className="text-left font-medium px-3 py-2">Estado</th>
                  <th className="text-left font-medium px-3 py-2">Empleado</th>
                  <th className="text-left font-medium px-3 py-2">Etiquetas</th>
                  <th className="text-right font-medium px-3 py-2">Días s/mov.</th>
                  <th className="text-right font-medium px-3 py-2">Acciones</th>
                </tr></thead>
                <tbody>
                  {filtradas.map(o => {
                    const excedido = o.diasSinMovimiento > UMBRAL_DIAS_SIN_MOVIMIENTO && o.estado !== 'entregado' && o.estado !== 'cancelado'
                    return (
                      <tr key={o.id} className={cn('border-t transition-colors', 'border-[#2A2A2A] hover:bg-white/[0.03]', 'light:border-[#E4E4E4] light:hover:bg-black/[0.02]')}>
                        <td className="px-3 py-2.5 font-medium text-white light:text-black">#{String(o.numero).padStart(3, '0')}</td>
                        <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{o.clienteNombre}</td>
                        <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{o.productoNombre}</td>
                        <td className="px-3 py-2.5"><EstadoBadgeOT estado={o.estado} /></td>
                        <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{o.empleadoNombre ?? '—'}</td>
                        <td className="px-3 py-2.5"><div className="flex gap-1">{o.etiquetas.map(e => <EtiquetaChip key={e.id} etiqueta={e} />)}</div></td>
                        <td className={cn('px-3 py-2.5 text-right', excedido ? 'text-[#D4921A] font-medium' : 'text-[#A0A0A0] light:text-[#404040]')}>{o.diasSinMovimiento}d</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <IconBtn title="Ver" onClick={() => onVer(o)}><Eye size={14} /></IconBtn>
                            {o.estado === 'recepcion' && <>
                              <IconBtn title="A en proceso" onClick={() => cambiarEstado(o.id, 'en_proceso')}><Play size={14} /></IconBtn>
                              <IconBtn title="Cancelar" danger onClick={() => setCancelar(o)}><X size={14} /></IconBtn>
                            </>}
                            {o.estado === 'en_proceso' && <>
                              <IconBtn title="Finalizar" onClick={() => cambiarEstado(o.id, 'finalizado')}><Check size={14} /></IconBtn>
                              <IconBtn title="Entregar" onClick={() => cambiarEstado(o.id, 'entregado')}><PackageCheck size={14} /></IconBtn>
                              <IconBtn title="Cancelar" danger onClick={() => setCancelar(o)}><X size={14} /></IconBtn>
                            </>}
                            {o.estado === 'finalizado' && <>
                              <IconBtn title="Entregar" onClick={() => cambiarEstado(o.id, 'entregado')}><PackageCheck size={14} /></IconBtn>
                              <IconBtn title="Cancelar" danger onClick={() => setCancelar(o)}><X size={14} /></IconBtn>
                            </>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <ModalCancelacion open={cancelar !== null} ot={cancelar} onClose={() => setCancelar(null)} />
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
