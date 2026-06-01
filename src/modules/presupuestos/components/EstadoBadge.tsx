import { cn } from '../../../lib/utils'
import { Badge } from '../../../components/ui/Badge'
import type { EstadoPresupuesto } from '../../../types/presupuestos'

const LABEL: Record<EstadoPresupuesto, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  convertido: 'Convertido',
}

export const EstadoBadge = ({ estado }: { estado: EstadoPresupuesto }) => {
  if (estado === 'convertido') {
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium',
        'bg-[#7C5CFC]/15 text-[#9B86FF]')}>
        Convertido
      </span>
    )
  }
  const variant = estado === 'enviado' ? 'info' : estado === 'aprobado' ? 'success' : estado === 'rechazado' ? 'error' : 'default'
  return <Badge label={LABEL[estado]} variant={variant} />
}
