import { useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { useOTStore } from '../../store/otStore'
import { ESTADOS_OT, UMBRAL_DIAS_SIN_MOVIMIENTO, type EstadoOT, type OrdenTrabajo } from '../../types/ordenesTrabajo'
import { EtiquetaChip } from './components/EtiquetaChip'
import { User, Clock } from 'lucide-react'

interface KanbanOTsProps { onVer: (ot: OrdenTrabajo) => void }

const COLUMNAS: EstadoOT[] = ['recepcion', 'en_proceso', 'finalizado', 'entregado']
const TERMINALES: EstadoOT[] = ['entregado', 'cancelado']

export const KanbanOTs = ({ onVer }: KanbanOTsProps) => {
  const { ots, cambiarEstado } = useOTStore()
  const [dragId, setDragId] = useState<number | null>(null)
  const [overCol, setOverCol] = useState<EstadoOT | null>(null)

  const porEstado = useMemo(() => {
    const m = new Map<EstadoOT, OrdenTrabajo[]>()
    COLUMNAS.forEach(c => m.set(c, []))
    ots.forEach(o => { if (m.has(o.estado)) m.get(o.estado)!.push(o) })
    return m
  }, [ots])

  const onDrop = (estado: EstadoOT) => {
    setOverCol(null)
    if (dragId === null) return
    const ot = ots.find(o => o.id === dragId)
    setDragId(null)
    if (!ot || ot.estado === estado) return
    if (TERMINALES.includes(estado) && estado !== 'entregado') return
    cambiarEstado(ot.id, estado)
  }

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-2">
      {COLUMNAS.map(col => {
        const def = ESTADOS_OT.find(e => e.value === col)!
        const items = porEstado.get(col) ?? []
        const dropDisabled = false
        return (
          <div key={col}
            onDragOver={e => { if (!dropDisabled) { e.preventDefault(); setOverCol(col) } }}
            onDragLeave={() => setOverCol(c => c === col ? null : c)}
            onDrop={() => onDrop(col)}
            className={cn('flex flex-col w-64 shrink-0 rounded-card border transition-colors',
              'border-[#2A2A2A] bg-[#141414]/40 light:border-[#E4E4E4] light:bg-[#F4F4F4]/40',
              overCol === col && 'border-white/40 bg-white/[0.04] light:border-black/30')}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <span className="text-[13px] font-medium" style={{ color: def.color }}>{def.label}</span>
              <span className="text-[11px] text-[#606060]">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2 p-2 overflow-y-auto flex-1">
              {items.map(o => {
                const excedido = o.diasSinMovimiento > UMBRAL_DIAS_SIN_MOVIMIENTO
                return (
                  <div key={o.id} draggable
                    onDragStart={() => setDragId(o.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null) }}
                    onClick={() => onVer(o)}
                    className={cn('rounded-card border p-2.5 cursor-grab active:cursor-grabbing transition-all',
                      'border-[#2A2A2A] bg-[#1C1C1C] hover:border-[#3A3A3A] light:border-[#E4E4E4] light:bg-white',
                      excedido && 'border-[#D4921A]/50 bg-[#D4921A]/[0.06]',
                      dragId === o.id && 'opacity-50 rotate-[1.5deg] shadow-2xl')}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-white light:text-black">#{String(o.numero).padStart(3, '0')}</span>
                      {o.etiquetas.length > 0 && <div className="flex gap-1">{o.etiquetas.slice(0, 2).map(e => <EtiquetaChip key={e.id} etiqueta={e} />)}</div>}
                    </div>
                    <div className="text-[13px] text-white light:text-black truncate">{o.clienteNombre}</div>
                    <div className="text-[11px] text-[#A0A0A0] light:text-[#404040] truncate">{o.productoNombre}</div>
                    <div className="flex items-center justify-between mt-2 text-[10px] text-[#606060]">
                      <span className="flex items-center gap-1"><User size={10} /> {o.empleadoNombre ?? 'Sin asignar'}</span>
                      <span className={cn('flex items-center gap-1', excedido && 'text-[#D4921A]')}><Clock size={10} /> {o.diasSinMovimiento}d</span>
                    </div>
                  </div>
                )
              })}
              {items.length === 0 && <p className="text-[11px] text-[#606060] text-center py-4">Sin OTs</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
