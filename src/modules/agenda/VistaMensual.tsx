import { useMemo } from 'react'
import { cn } from '../../lib/utils'
import { useAgendaStore } from '../../store/agendaStore'
import { gridMensual, esHoy, mismoDia } from '../../lib/fecha'
import { CitaCard } from './components/CitaCard'
import type { Cita } from '../../types/agenda'

interface VistaMensualProps {
  onIrADia: (fecha: Date) => void
  onVerCita: (c: Cita) => void
  onNuevaEn: (fecha: Date) => void
}

export const VistaMensual = ({ onIrADia, onVerCita, onNuevaEn }: VistaMensualProps) => {
  const { citas, fechaActiva } = useAgendaStore()
  const dias = useMemo(() => gridMensual(fechaActiva), [fechaActiva])
  const mesActivo = fechaActiva.getMonth()

  const citasDe = (d: Date) => citas
    .filter(c => mismoDia(new Date(c.fechaInicio), d))
    .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())

  return (
    <div className="flex flex-col h-full">
      <div className="grid grid-cols-7 border-b border-[#2A2A2A] light:border-[#E4E4E4]">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-center py-2 text-[11px] uppercase tracking-wider text-[#606060]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 flex-1">
        {dias.map((d, i) => {
          const delDia = citasDe(d)
          const fueraMes = d.getMonth() !== mesActivo
          return (
            <div key={i}
              className={cn('border-r border-b border-[#2A2A2A] light:border-[#E4E4E4] p-1 flex flex-col gap-0.5 overflow-hidden',
                fueraMes && 'opacity-40', esHoy(d) && 'ring-1 ring-inset ring-[#4A7FA5]')}>
              <button onClick={() => onIrADia(d)}
                className={cn('self-start text-[11px] w-5 h-5 rounded-full flex items-center justify-center transition-colors',
                  esHoy(d) ? 'bg-[#4A7FA5] text-white' : 'text-[#A0A0A0] light:text-[#404040] hover:bg-white/10 light:hover:bg-black/5')}>
                {d.getDate()}
              </button>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {delDia.slice(0, 3).map(c => (
                  <CitaCard key={c.id} cita={c} compacta onClick={e => { e.stopPropagation(); onVerCita(c) }} />
                ))}
                {delDia.length > 3 && (
                  <button onClick={() => onIrADia(d)} className="text-[10px] text-[#606060] hover:text-white light:hover:text-black text-left pl-1">
                    +{delDia.length - 3} más
                  </button>
                )}
                {delDia.length === 0 && !fueraMes && (
                  <button onClick={() => { const f = new Date(d); f.setHours(9, 0, 0, 0); onNuevaEn(f) }}
                    className="text-[10px] text-transparent hover:text-[#606060] text-left pl-1">+ cita</button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
