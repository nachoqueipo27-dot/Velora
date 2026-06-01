import { cn } from '../../../lib/utils'
import { useAgendaStore } from '../../../store/agendaStore'
import { tituloDiaria, tituloSemanal, tituloMensual } from '../../../lib/fecha'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export const NavegadorFecha = () => {
  const { vistaActiva, fechaActiva, navegarAnterior, navegarSiguiente, irAHoy } = useAgendaStore()

  const titulo = vistaActiva === 'diaria' ? tituloDiaria(fechaActiva)
    : vistaActiva === 'semanal' ? tituloSemanal(fechaActiva)
    : tituloMensual(fechaActiva)

  return (
    <div className="flex items-center gap-2">
      <button onClick={navegarAnterior}
        className={cn('p-1.5 rounded-input transition-all duration-150', 'text-[#606060] hover:text-white hover:bg-white/10', 'light:text-[#888888] light:hover:text-black light:hover:bg-black/5')}>
        <ChevronLeft size={16} />
      </button>
      <button onClick={irAHoy}
        className={cn('px-3 py-1.5 rounded-input text-[13px] font-medium transition-all duration-150 border',
          'border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:border-[#3A3A3A]',
          'light:border-[#E4E4E4] light:text-[#404040] light:hover:text-black')}>
        Hoy
      </button>
      <button onClick={navegarSiguiente}
        className={cn('p-1.5 rounded-input transition-all duration-150', 'text-[#606060] hover:text-white hover:bg-white/10', 'light:text-[#888888] light:hover:text-black light:hover:bg-black/5')}>
        <ChevronRight size={16} />
      </button>
      <span key={titulo} className="ml-2 text-sm font-medium text-white light:text-black capitalize animate-slide-in">{titulo}</span>
    </div>
  )
}
