import { cn } from '../../../lib/utils'
import { horaDe } from '../../../lib/fecha'
import type { Cita } from '../../../types/agenda'
import { User } from 'lucide-react'

interface CitaCardProps {
  cita: Cita
  onClick?: (e: React.MouseEvent) => void
  compacta?: boolean
  style?: React.CSSProperties
  className?: string
}

export const CitaCard = ({ cita, onClick, compacta, style, className }: CitaCardProps) => {
  if (compacta) {
    return (
      <button onClick={onClick} style={{ ...style }}
        className={cn('w-full flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate transition-all hover:brightness-125', className)}
        title={`${horaDe(cita.fechaInicio)} ${cita.titulo}`}>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cita.color }} />
        <span className="truncate text-[#A0A0A0] light:text-[#404040]">{horaDe(cita.fechaInicio)} {cita.titulo}</span>
      </button>
    )
  }

  return (
    <button onClick={onClick}
      style={{ backgroundColor: `${cita.color}20`, borderLeftColor: cita.color, ...style }}
      className={cn('text-left rounded-input border-l-[3px] px-2 py-1 overflow-hidden transition-all hover:shadow-md hover:brightness-110', className)}>
      <div className="text-[11px] font-medium text-white light:text-black truncate">{cita.titulo}</div>
      <div className="text-[10px] text-[#A0A0A0] light:text-[#404040]">{horaDe(cita.fechaInicio)}–{horaDe(cita.fechaFin)}</div>
      {cita.clienteNombre && <div className="text-[10px] text-[#606060] truncate">{cita.clienteNombre}</div>}
      {cita.empleadoNombre && <div className="flex items-center gap-0.5 text-[10px] text-[#606060] truncate"><User size={9} /> {cita.empleadoNombre}</div>}
    </button>
  )
}
