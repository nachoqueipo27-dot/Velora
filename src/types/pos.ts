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
  /** Centavos. */
  precioUnitario: number
  cantidad: number
  /** Número tal como lo tipeó el cajero: % o pesos según el tipo global del carrito. */
  descuentoItem: number
  /** Centavos. */
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
  /** Centavos. */
  precioUnitario: number
  /** Centavos si tipoDescuentoItem = 'monto'; % si 'porcentaje'. */
  descuentoItem: number
  tipoDescuentoItem: 'porcentaje' | 'monto'
  /** Centavos. */
  subtotal: number
}

/** Montos en centavos. */
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
