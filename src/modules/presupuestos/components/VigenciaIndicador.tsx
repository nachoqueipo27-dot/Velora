import { cn } from '../../../lib/utils'
import { ESTADOS_TERMINALES, type EstadoPresupuesto } from '../../../types/presupuestos'

interface VigenciaIndicadorProps {
  fechaVigencia: string | null
  estado: EstadoPresupuesto
  className?: string
}

export const VigenciaIndicador = ({ fechaVigencia, estado, className }: VigenciaIndicadorProps) => {
  if (ESTADOS_TERMINALES.includes(estado) || !fechaVigencia) {
    return <span className={cn('text-[#606060]', className)}>—</span>
  }

  const ms = new Date(fechaVigencia).getTime() - Date.now()
  const dias = Math.ceil(ms / 86400000)

  let texto: string
  let color: string
  if (dias < 0) {
    texto = `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'}`
    color = 'text-[#C0392B]'
  } else if (dias <= 3) {
    texto = dias === 0 ? 'Vence hoy' : `Vence en ${dias} día${dias === 1 ? '' : 's'}`
    color = 'text-[#D4921A]'
  } else {
    texto = `Válido ${dias} días más`
    color = 'text-[#4CAF7D]'
  }

  return <span className={cn(color, className)}>{texto}</span>
}
