import type { UnidadMedida } from './inventario'

export type FormaPago = 'efectivo' | 'transferencia' | 'tarjeta'

export const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta',       label: 'Tarjeta' },
]

export interface ItemCarrito {
  /** En 'libre' (Producto X) es negativo y único dentro del carrito; se guarda como 0. */
  productoId: number
  tipoItem: 'simple' | 'conjunto' | 'libre'
  /** Código escaneado (solo 'libre': un producto que no está en el inventario). */
  codigo?: string
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
  /** 0 en 'libre' (Producto X). */
  productoId: number
  tipoItem: 'simple' | 'conjunto' | 'libre'
  codigo?: string | null
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
