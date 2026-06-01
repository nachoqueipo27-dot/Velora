import { cn } from '../../../lib/utils'
import { ESTADOS_OT, type EstadoOT } from '../../../types/ordenesTrabajo'

export const EstadoBadgeOT = ({ estado }: { estado: EstadoOT }) => {
  const def = ESTADOS_OT.find(e => e.value === estado)
  if (!def) return null
  return (
    <span
      className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium')}
      style={{ backgroundColor: `${def.color}26`, color: def.color }}
    >
      {def.label}
    </span>
  )
}
