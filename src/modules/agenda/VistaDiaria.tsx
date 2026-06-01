import { useEffect, useRef, useState } from 'react'
import { useAgendaStore } from '../../store/agendaStore'
import { esHoy } from '../../lib/fecha'
import { posicionarCitas } from './layout'
import { CitaCard } from './components/CitaCard'
import type { Cita } from '../../types/agenda'

interface VistaDiariaProps {
  onNuevaEn: (fecha: Date) => void
  onVerCita: (c: Cita) => void
}

const HORAS = Array.from({ length: 24 }, (_, i) => i)
const ALTO_HORA = 56 // px

export const VistaDiaria = ({ onNuevaEn, onVerCita }: VistaDiariaProps) => {
  const { citas, fechaActiva } = useAgendaStore()
  const [ahora, setAhora] = useState(new Date())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  // Scroll inicial cerca de las 8:00
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 8 * ALTO_HORA }, [])

  const posiciones = posicionarCitas(citas, fechaActiva, 0, 1440)
  const hoy = esHoy(fechaActiva)
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes()

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="relative" style={{ height: 24 * ALTO_HORA }}>
        {/* Grilla de horas */}
        {HORAS.map(h => (
          <div key={h} className="absolute left-0 right-0 flex" style={{ top: h * ALTO_HORA, height: ALTO_HORA }}>
            <div className="w-16 shrink-0 pr-2 text-right text-[11px] text-[#606060] -translate-y-2">{String(h).padStart(2, '0')}:00</div>
            <div onClick={() => { const f = new Date(fechaActiva); f.setHours(h, 0, 0, 0); onNuevaEn(f) }}
              className="flex-1 border-t border-[#2A2A2A] light:border-[#E4E4E4] cursor-pointer hover:bg-white/[0.02] light:hover:bg-black/[0.02]" />
          </div>
        ))}

        {/* Línea ahora */}
        {hoy && (
          <div className="absolute left-16 right-0 z-20 pointer-events-none" style={{ top: (minAhora / 1440) * 24 * ALTO_HORA }}>
            <div className="relative">
              <div className="absolute -left-1.5 -top-1 w-2.5 h-2.5 rounded-full bg-[#C0392B]" />
              <div className="border-t border-[#C0392B]" />
            </div>
          </div>
        )}

        {/* Citas */}
        <div className="absolute left-16 right-2 top-0 bottom-0">
          {posiciones.map(p => (
            <CitaCard key={p.cita.id} cita={p.cita} onClick={() => onVerCita(p.cita)}
              className="absolute z-10"
              style={{
                top: `${p.topPct}%`, height: `${p.heightPct}%`,
                left: `${(p.col / p.cols) * 100}%`, width: `calc(${100 / p.cols}% - 4px)`,
              }} />
          ))}
        </div>
      </div>
    </div>
  )
}
