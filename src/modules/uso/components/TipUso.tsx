import type { ReactNode } from 'react'
import { cn } from '../../../lib/utils'
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react'

type Tipo = 'tip' | 'advertencia' | 'importante'

interface TipUsoProps {
  tipo: Tipo
  children: ReactNode
}

const CONFIG: Record<Tipo, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  tip:         { color: '#6FA8D0', bg: 'bg-[#4A7FA5]/[0.08]', border: 'border-[#4A7FA5]/30', label: 'Tip',         icon: <Info size={15} /> },
  advertencia: { color: '#D4921A', bg: 'bg-[#D4921A]/[0.08]', border: 'border-[#D4921A]/30', label: 'Advertencia', icon: <AlertTriangle size={15} /> },
  importante:  { color: '#E0594A', bg: 'bg-[#C0392B]/[0.08]', border: 'border-[#C0392B]/35', label: 'Importante',  icon: <AlertOctagon size={15} /> },
}

export const TipUso = ({ tipo, children }: TipUsoProps) => {
  const c = CONFIG[tipo]
  return (
    <div className={cn('flex gap-2.5 rounded-card border p-3', c.bg, c.border)}>
      <span className="shrink-0 mt-0.5" style={{ color: c.color }}>{c.icon}</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: c.color }}>{c.label}</span>
        <p className="text-[13px] leading-relaxed text-[#C8C8C8] light:text-[#404040]">{children}</p>
      </div>
    </div>
  )
}
