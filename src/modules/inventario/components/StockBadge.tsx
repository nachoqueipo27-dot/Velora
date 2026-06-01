import { Badge } from '../../../components/ui/Badge'

interface StockBadgeProps {
  stock: number
  stockMinimo: number
}

export const StockBadge = ({ stock, stockMinimo }: StockBadgeProps) => {
  if (stock === 0) return <Badge label="Sin stock" variant="error" />
  if (stock <= stockMinimo) return <Badge label="Bajo" variant="warning" />
  return <Badge label="OK" variant="success" />
}
