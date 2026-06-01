import { Badge } from '../../../components/ui/Badge'
import type { CategoriaCliente } from '../../../types/clientes'

const VARIANTE: Record<CategoriaCliente, 'success' | 'info' | 'warning' | 'default'> = {
  VIP:       'success',
  Frecuente: 'info',
  Mayorista: 'warning',
  Ocasional: 'default',
  General:   'default',
}

export const CategoriaBadge = ({ categoria }: { categoria: CategoriaCliente }) => {
  return <Badge label={categoria} variant={VARIANTE[categoria]} />
}
