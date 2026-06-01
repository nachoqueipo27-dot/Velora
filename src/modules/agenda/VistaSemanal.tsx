import { useEffect, useRef } from 'react'
import { cn } from '../../lib/utils'
import { useAgendaStore } from '../../store/agendaStore'
import { diasSemana, esHoy, nombreDiaCorto } from '../../lib/fecha'
import { posicionarCitas } from './layout'
import { CitaCard } from './components/CitaCard'
import type { Cita } from '../../types/agenda'

interface VistaSemanalProps {
  onNuevaEn: (fecha: Date) => void
  onVerCita: (c: Cita) => void
}

const MIN_INI = 8 * 60   // 08:00
const MIN_FIN = 20 * 60  // 20:00
const HORAS = Array.from({ length: (MIN_FIN - MIN_INI) / 60 + 1 }, (_, i) => 8 + i)
const ALTO_HORA = 52

export const VistaSemanal = ({ onNuevaEn, onVerCita }: VistaSemanalProps) => {
  const { citas, fechaActiva } = useAgendaStore()
  const dias = diasSemana(fechaActiva)
  const scrollRef = useRef<HTMLDivElement>(null)
  const altoTotal = (MIN_FIN - MIN_INI) / 60 * ALTO_HORA

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, [])

  return (
    <div className="flex flex-col h-full">
      {/* Header de días */}
      <div className="flex border-b border-[#2A2A2A] light:border-[#E4E4E4] pl-14">
        {dias.map((d, i) => (
          <div key={i} className={cn('flex-1 text-center py-2', esHoy(d) && 'bg-white/[0.04] light:bg-black/[0.03]')}>
            <div className="text-[11px] uppercase tracking-wider text-[#606060]">{nombreDiaCorto(d)}</div>
            <div className={cn('text-sm font-medium', esHoy(d) ? 'text-[#4A7FA5]' : 'text-white light:text-black')}>{d.getDate()}</div>
          </div>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ height: altoTotal }}>
          {/* Columna horas */}
          <div className="w-14 shrink-0 relative">
            {HORAS.slice(0, -1).map((h, i) => (
              <div key={h} className="absolute right-2 text-[11px] text-[#606060] -translate-y-2" style={{ top: i * ALTO_HORA }}>{String(h).padStart(2, '0')}:00</div>
            ))}
          </div>
          {/* Columnas de días */}
          {dias.map((d, di) => {
            const posiciones = posicionarCitas(citas, d, MIN_INI, MIN_FIN)
            return (
              <div key={di} className={cn('flex-1 relative border-l border-[#2A2A2A] light:border-[#E4E4E4]', esHoy(d) && 'bg-white/[0.02] light:bg-black/[0.015]')}>
                {HORAS.slice(0, -1).map((h, i) => (
                  <div key={h} onClick={() => { const f = new Date(d); f.setHours(h, 0, 0, 0); onNuevaEn(f) }}
                    className="absolute left-0 right-0 border-t border-[#2A2A2A] light:border-[#E4E4E4] cursor-pointer hover:bg-white/[0.02] light:hover:bg-black/[0.02]"
                    style={{ top: i * ALTO_HORA, height: ALTO_HORA }} />
                ))}
                {posiciones.map(p => (
                  <CitaCard key={p.cita.id} cita={p.cita} onClick={() => onVerCita(p.cita)}
                    className="absolute z-10"
                    style={{ top: `${p.topPct}%`, height: `${p.heightPct}%`, left: `${(p.col / p.cols) * 100}%`, width: `calc(${100 / p.cols}% - 2px)` }} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
