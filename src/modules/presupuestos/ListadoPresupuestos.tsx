import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { usePresupuestosStore } from '../../store/presupuestosStore'
import { MOTIVOS_RECHAZO, type Presupuesto } from '../../types/presupuestos'
import { EstadoBadge } from './components/EstadoBadge'
import { VigenciaIndicador } from './components/VigenciaIndicador'
import { ModalPresupuesto } from './ModalPresupuesto'
import { Search, Plus, Eye, Pencil, Send, Check, X, RefreshCw, ArrowRightCircle, Trash2, FileText } from 'lucide-react'
import { format } from 'date-fns'

interface ListadoPresupuestosProps {
  onVer: (p: Presupuesto) => void
  modo?: 'todos' | 'historial'
  abrirNuevo?: boolean
  onNuevoAbierto?: () => void
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const numFmt = (n: number) => `#${String(n).padStart(3, '0')}`

export const ListadoPresupuestos = ({ onVer, modo = 'todos', abrirNuevo, onNuevoAbierto }: ListadoPresupuestosProps) => {
  const { presupuestos, loading, cargarPresupuestos, cambiarEstado, reenviar, convertirAOT, eliminarPresupuesto } = usePresupuestosStore()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [modalEdit, setModalEdit] = useState<{ open: boolean; presupuesto: Presupuesto | null }>({ open: false, presupuesto: null })
  const [confirmEliminar, setConfirmEliminar] = useState<number | null>(null)
  const [rechazar, setRechazar] = useState<Presupuesto | null>(null)
  const [convertir, setConvertir] = useState<Presupuesto | null>(null)
  const [motivo, setMotivo] = useState(MOTIVOS_RECHAZO[0])
  const [motivoOtro, setMotivoOtro] = useState('')

  useEffect(() => { cargarPresupuestos() }, [cargarPresupuestos])

  useEffect(() => {
    if (abrirNuevo) { setModalEdit({ open: true, presupuesto: null }); onNuevoAbierto?.() }
  }, [abrirNuevo, onNuevoAbierto])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return presupuestos.filter(p => {
      const baseHistorial = modo === 'todos' || p.estado === 'rechazado' || p.estado === 'convertido'
      const matchEstado = filtroEstado === 'Todos' || p.estado === filtroEstado
      const matchQ = q === '' || p.clienteNombre.toLowerCase().includes(q) || numFmt(p.numero).includes(q) || String(p.numero) === q
      return baseHistorial && matchEstado && matchQ
    })
  }, [presupuestos, busqueda, filtroEstado, modo])

  const confirmarRechazo = () => {
    if (!rechazar) return
    const m = motivo === 'Otro' ? (motivoOtro.trim() || 'Otro') : motivo
    cambiarEstado(rechazar.id, 'rechazado', m)
    setRechazar(null); setMotivoOtro(''); setMotivo(MOTIVOS_RECHAZO[0])
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input className={cn('w-full pl-9 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none',
            'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
            'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')}
            placeholder="Buscar por cliente o número..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        {modo === 'todos' && (
          <div className="w-44"><Select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="Todos" className="bg-[#141414] light:bg-white">Todos los estados</option>
            {['borrador', 'enviado', 'aprobado', 'rechazado', 'convertido'].map(e =>
              <option key={e} value={e} className="bg-[#141414] light:bg-white capitalize">{e}</option>)}
          </Select></div>
        )}
        <div className="flex-1" />
        {modo === 'todos' && <Button size="sm" onClick={() => setModalEdit({ open: true, presupuesto: null })}><Plus size={14} className="mr-1.5" /> Nuevo presupuesto</Button>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && presupuestos.length === 0 ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-input animate-shimmer" />)}</div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><FileText size={20} className="text-[#606060]" /></div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">No hay presupuestos que coincidan</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
              <th className="text-left font-medium px-3 py-2">N°</th>
              <th className="text-left font-medium px-3 py-2">Cliente</th>
              <th className="text-left font-medium px-3 py-2">Estado</th>
              <th className="text-right font-medium px-3 py-2">Total</th>
              <th className="text-left font-medium px-3 py-2">Vigencia</th>
              <th className="text-left font-medium px-3 py-2">Creación</th>
              <th className="text-right font-medium px-3 py-2">Acciones</th>
            </tr></thead>
            <tbody>
              {filtrados.map(p => (
                <tr key={p.id} className={cn('border-t transition-colors', 'border-[#2A2A2A] hover:bg-white/[0.03]', 'light:border-[#E4E4E4] light:hover:bg-black/[0.02]')}>
                  <td className="px-3 py-2.5 font-medium text-white light:text-black">{numFmt(p.numero)}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{p.clienteNombre}</td>
                  <td className="px-3 py-2.5" title={p.estado === 'rechazado' ? (p.motivoRechazo ?? '') : ''}><EstadoBadge estado={p.estado} /></td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black">{money(p.totalFinal)}</td>
                  <td className="px-3 py-2.5 text-[11px]"><VigenciaIndicador fechaVigencia={p.fechaVigencia} estado={p.estado} /></td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(p.creadoEn), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5">
                    {confirmEliminar === p.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] text-[#A0A0A0]">¿Eliminar?</span>
                        <Button size="sm" variant="danger" onClick={() => { eliminarPresupuesto(p.id); setConfirmEliminar(null) }}>Sí</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmEliminar(null)}>No</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Ver" onClick={() => onVer(p)}><Eye size={14} /></IconBtn>
                        {p.estado === 'borrador' && <>
                          <IconBtn title="Editar" onClick={() => setModalEdit({ open: true, presupuesto: p })}><Pencil size={14} /></IconBtn>
                          <IconBtn title="Enviar" onClick={() => cambiarEstado(p.id, 'enviado')}><Send size={14} /></IconBtn>
                          <IconBtn title="Eliminar" danger onClick={() => setConfirmEliminar(p.id)}><Trash2 size={14} /></IconBtn>
                        </>}
                        {p.estado === 'enviado' && <>
                          <IconBtn title="Reenviar" onClick={() => reenviar(p.id)}><RefreshCw size={14} /></IconBtn>
                          <IconBtn title="Aprobar" onClick={() => cambiarEstado(p.id, 'aprobado')}><Check size={14} /></IconBtn>
                          <IconBtn title="Rechazar" danger onClick={() => setRechazar(p)}><X size={14} /></IconBtn>
                        </>}
                        {p.estado === 'aprobado' && <IconBtn title="Convertir a OT" onClick={() => setConvertir(p)}><ArrowRightCircle size={14} /></IconBtn>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalPresupuesto open={modalEdit.open} presupuesto={modalEdit.presupuesto} onClose={() => setModalEdit({ open: false, presupuesto: null })} />

      <Modal open={rechazar !== null} onClose={() => setRechazar(null)} title="Rechazar presupuesto"
        footer={<>
          <Button variant="ghost" onClick={() => setRechazar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmarRechazo}>Rechazar</Button>
        </>}>
        <div className="flex flex-col gap-3 pb-1">
          <Select label="Motivo del rechazo" value={motivo} onChange={e => setMotivo(e.target.value)}>
            {MOTIVOS_RECHAZO.map(m => <option key={m} value={m} className="bg-[#141414] light:bg-white">{m}</option>)}
          </Select>
          {motivo === 'Otro' && <Input label="Especificar" value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} autoFocus />}
        </div>
      </Modal>

      <Modal open={convertir !== null} onClose={() => setConvertir(null)} title="Convertir a Orden de Trabajo"
        footer={<>
          <Button variant="ghost" onClick={() => setConvertir(null)}>Cancelar</Button>
          <Button onClick={() => { if (convertir) convertirAOT(convertir.id); setConvertir(null) }}>Convertir</Button>
        </>}>
        <p className="text-sm text-white light:text-black pb-1">¿Convertir este presupuesto en una Orden de Trabajo?</p>
        <p className="text-[11px] text-[#606060] pb-2">Se creará la OT con los productos del presupuesto.</p>
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
