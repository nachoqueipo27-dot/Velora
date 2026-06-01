import { cn } from '../../../lib/utils'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import type { PuntoComparativo } from '../../../store/dashboardStore'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface ComparativoTablaProps {
  periodoActual: PuntoComparativo
  periodoAnterior: PuntoComparativo
}

interface Fila {
  label: string
  actual: number
  anterior: number
  esMoneda: boolean
  // Para egresos, "subir" es malo → invertir el color
  invertirColor?: boolean
}

const Variacion = ({ actual, anterior, invertir }: { actual: number; anterior: number; invertir?: boolean }) => {
  if (anterior === 0 && actual === 0) return <span className="text-[#606060] text-[13px]">—</span>
  const pct = anterior === 0 ? 100 : Math.round(((actual - anterior) / Math.abs(anterior)) * 100)
  const sube = pct > 0
  const neutro = pct === 0
  // Bueno = sube (salvo invertir, donde subir es malo)
  const positivo = neutro ? false : (invertir ? !sube : sube)
  const color = neutro ? 'text-[#606060]' : positivo ? 'text-[#4CAF7D]' : 'text-[#C0392B]'
  const Icon = neutro ? Minus : sube ? ArrowUp : ArrowDown
  return (
    <span className={cn('inline-flex items-center gap-1 text-[13px] font-medium tabular-nums', color)}>
      <Icon size={12} />{pct > 0 ? '+' : ''}{pct}%
    </span>
  )
}

export const ComparativoTabla = ({ periodoActual: a, periodoAnterior: b }: ComparativoTablaProps) => {
  const filas: Fila[] = [
    { label: 'Ingresos',         actual: a.ingresos,         anterior: b.ingresos,         esMoneda: true },
    { label: 'Egresos',          actual: a.gastos,           anterior: b.gastos,           esMoneda: true, invertirColor: true },
    { label: 'Margen',           actual: a.ingresos - a.gastos, anterior: b.ingresos - b.gastos, esMoneda: true },
    { label: 'OTs completadas',  actual: a.otsCompletadas,   anterior: b.otsCompletadas,   esMoneda: false },
    { label: 'Ticket promedio',  actual: a.ticketPromedio,   anterior: b.ticketPromedio,   esMoneda: true },
  ]
  const fmt = (n: number, money_: boolean) => money_ ? money(n) : String(n)

  return (
    <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
            <th className="font-medium px-4 py-2.5"></th>
            <th className="font-medium px-4 py-2.5 text-right">Actual</th>
            <th className="font-medium px-4 py-2.5 text-right">Anterior</th>
            <th className="font-medium px-4 py-2.5 text-right">Variación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map(f => {
            const pct = f.anterior === 0 ? (f.actual === 0 ? 0 : 100) : Math.round(((f.actual - f.anterior) / Math.abs(f.anterior)) * 100)
            const resaltar = Math.abs(pct) > 20
            return (
              <tr key={f.label} className={cn('border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0',
                resaltar && 'bg-white/[0.025] light:bg-black/[0.02]')}>
                <td className="px-4 py-2.5 text-[#A0A0A0] light:text-[#404040]">{f.label}</td>
                <td className="px-4 py-2.5 text-right font-medium text-white light:text-black tabular-nums">{fmt(f.actual, f.esMoneda)}</td>
                <td className="px-4 py-2.5 text-right text-[#606060] tabular-nums">{fmt(f.anterior, f.esMoneda)}</td>
                <td className="px-4 py-2.5 text-right"><Variacion actual={f.actual} anterior={f.anterior} invertir={f.invertirColor} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
