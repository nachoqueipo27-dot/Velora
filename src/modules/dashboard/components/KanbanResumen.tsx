import { ESTADOS_OT, type EstadoOT, type OrdenTrabajo } from '../../../types/ordenesTrabajo'

const COLUMNAS: EstadoOT[] = ['recepcion', 'en_proceso', 'finalizado', 'entregado']

interface KanbanResumenProps {
  porEstado: Record<EstadoOT, OrdenTrabajo[]>
  onVerOT: (ot: OrdenTrabajo) => void
  onVerTodas: () => void
}

export const KanbanResumen = ({ porEstado, onVerOT, onVerTodas }: KanbanResumenProps) => (
  <div className="grid grid-cols-4 gap-3">
    {COLUMNAS.map(estado => {
      const def = ESTADOS_OT.find(e => e.value === estado)!
      const lista = porEstado[estado] ?? []
      return (
        <div key={estado} className="flex flex-col rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#2A2A2A] light:border-[#E4E4E4]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: def.color }} />
              <span className="text-[12px] font-medium text-white light:text-black">{def.label}</span>
            </div>
            <span className="text-[12px] font-semibold text-[#606060] tabular-nums">{lista.length}</span>
          </div>

          <div className="flex flex-col gap-1.5 p-2 min-h-[64px]">
            {lista.length === 0 ? (
              <span className="text-[11px] text-[#606060] px-1 py-3 text-center">Sin OTs</span>
            ) : lista.slice(0, 3).map(o => (
              <button key={o.id} onClick={() => onVerOT(o)}
                className="text-left rounded-input border border-transparent px-2 py-1.5 hover:border-[#2A2A2A] hover:bg-white/[0.03] light:hover:border-[#E4E4E4] light:hover:bg-black/[0.02] transition-all"
                style={{ borderLeft: `2px solid ${def.color}` }}>
                <div className="text-[12px] font-medium text-white light:text-black truncate">#{String(o.numero).padStart(3, '0')} · {o.productoNombre}</div>
                <div className="text-[10px] text-[#606060] truncate">{o.clienteNombre}</div>
              </button>
            ))}
          </div>

          {lista.length > 0 && (
            <button onClick={onVerTodas}
              className="text-[11px] text-[#606060] hover:text-white light:hover:text-black px-3 py-2 border-t border-[#2A2A2A] light:border-[#E4E4E4] transition-colors text-left">
              Ver todas{lista.length > 3 ? ` (${lista.length})` : ''} →
            </button>
          )}
        </div>
      )
    })}
  </div>
)
