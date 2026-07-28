import type { UnidadMedida } from './inventario'

export type FormaPago = 'efectivo' | 'transferencia' | 'tarjeta'

export const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta',       label: 'Tarjeta' },
]

export interface ItemCarrito {
  productoId: number
  tipoItem: 'simple' | 'conjunto'
  nombre: string
  precioUnitario: number
  cantidad: number
  descuentoItem: number
  subtotal: number
  imagen: string | null
  unidadMedida: UnidadMedida
}

export interface ItemVentaPOS {
  id: number
  ventaId: number
  productoId: number
  tipoItem: 'simple' | 'conjunto'
  nombre: string
  cantidad: number
  precioUnitario: number
  descuentoItem: number
  subtotal: number
}

export interface VentaPOS {
  id: number
  numero: number
  empleadoId: number | null
  empleadoNombre: string | null
  subtotal: number
  descuento: number
  totalFinal: number
  formaPago: FormaPago
  fecha: string
  items: ItemVentaPOS[]
}
