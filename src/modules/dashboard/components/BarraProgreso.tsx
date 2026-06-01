import { cn } from '../../../lib/utils'

interface BarraProgresoProps {
  label: string
  valor: number
  maximo: number
  color?: string
  sufijo?: React.ReactNode
}

export const BarraProgreso = ({ label, valor, maximo, color = '#4A7FA5', sufijo }: BarraProgresoProps) => {
  const pct = maximo > 0 ? Math.min(100, Math.round((valor / maximo) * 100)) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-white light:text-black truncate">{label}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[12px] text-[#606060] tabular-nums">{valor}</span>
          {sufijo}
        </div>
      </div>
      <div className={cn('h-2 rounded-full overflow-hidden bg-[#1C1C1C] light:bg-[#F0F0F0]')}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
