import { useEffect, useRef, useState } from 'react'
import { cn } from '../../../lib/utils'

type Color = 'default' | 'success' | 'warning' | 'error'

interface CardMetricaProps {
  titulo: string
  valor: string | number
  subtitulo?: string
  color?: Color
  onClick?: () => void
  icono?: React.ReactNode
  formato?: (n: number) => string
}

const BORDE: Record<Color, string> = {
  default: 'border-l-[#2A2A2A] light:border-l-[#E4E4E4]',
  success: 'border-l-[#4CAF7D]',
  warning: 'border-l-[#D4921A]',
  error:   'border-l-[#C0392B]',
}

const VALOR_COLOR: Record<Color, string> = {
  default: 'text-white light:text-black',
  success: 'text-[#4CAF7D]',
  warning: 'text-[#D4921A]',
  error:   'text-[#C0392B]',
}

function useCountUp(target: number, run: boolean, duration = 800) {
  const [v, setV] = useState(0)
  const raf = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!run) return
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration)
      setV(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, run, duration])
  return v
}

export const CardMetrica = ({ titulo, valor, subtitulo, color = 'default', onClick, icono, formato }: CardMetricaProps) => {
  const esNum = typeof valor === 'number'
  const animado = useCountUp(esNum ? valor : 0, esNum)
  const display = esNum ? (formato ? formato(animado) : Math.round(animado).toLocaleString('es-AR')) : valor

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col gap-1 rounded-card border border-l-[3px] p-4 transition-all duration-200',
        'border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white',
        BORDE[color],
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:border-[#3A3A3A] light:hover:border-[#D0D0D0]',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-[#606060]">{titulo}</span>
        {icono && <span className="text-[#606060]">{icono}</span>}
      </div>
      <span className={cn('text-2xl font-bold tabular-nums leading-tight', VALOR_COLOR[color])}>{display}</span>
      {subtitulo && <span className="text-[11px] text-[#606060]">{subtitulo}</span>}
    </div>
  )
}
