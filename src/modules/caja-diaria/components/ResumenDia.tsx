import { useEffect, useRef, useState } from 'react'
import { cn } from '../../../lib/utils'
import type { ResumenCaja } from '../../../types/caja'
import { ArrowDownRight, ArrowUpRight, Wallet, Receipt } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    const start = performance.now()
    const from = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(from + (target - from) * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, duration])
  return value
}

interface CardProps {
  label: string
  sublabel: string
  value: number
  esMoneda?: boolean
  tono?: 'neutro' | 'verde' | 'rojo' | 'auto'
  icon: React.ReactNode
}

const CardTotal = ({ label, sublabel, value, esMoneda = true, tono = 'neutro', icon }: CardProps) => {
  const animado = useCountUp(value)
  const color =
    tono === 'verde' ? 'text-[#4CAF7D]'
    : tono === 'rojo' ? 'text-[#C0392B]'
    : tono === 'auto' ? (value >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')
    : 'text-white light:text-black'

  return (
    <div className={cn(
      'flex-1 rounded-card border p-4 flex flex-col gap-1',
      'border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white',
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#606060]">{label}</span>
        <span className="text-[#606060]">{icon}</span>
      </div>
      <span className={cn('text-2xl font-bold tabular-nums', color)}>
        {esMoneda ? money(animado) : Math.round(animado).toLocaleString('es-AR')}
      </span>
      <span className="text-[11px] text-[#606060]">{sublabel}</span>
    </div>
  )
}

export const ResumenDia = ({ resumen }: { resumen: ResumenCaja }) => {
  const nTransacc = resumen.cobros.length + resumen.gastos.length
  return (
    <div className="flex gap-3">
      <CardTotal label="Ingresos" sublabel="del día" value={resumen.totalIngresos}
        tono={resumen.totalIngresos > 0 ? 'verde' : 'neutro'} icon={<ArrowUpRight size={15} />} />
      <CardTotal label="Gastos" sublabel="del día" value={resumen.totalGastos}
        tono={resumen.totalGastos > 0 ? 'rojo' : 'neutro'} icon={<ArrowDownRight size={15} />} />
      <CardTotal label="Saldo neto" sublabel="del día" value={resumen.saldoNeto}
        tono="auto" icon={<Wallet size={15} />} />
      <CardTotal label="Movimientos" sublabel="transacc." value={nTransacc}
        esMoneda={false} icon={<Receipt size={15} />} />
    </div>
  )
}
