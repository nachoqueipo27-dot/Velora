import type { UnidadMedida } from './inventario'

export type EstadoPresupuesto =
  | 'borrador'
  | 'enviado'
  | 'aprobado'
  | 'rechazado'
  | 'convertido'

export interface Presupuesto {
  id: number
  numero: number
  clienteId: number
  clienteNombre: string
  estado: EstadoPresupuesto
  descripcion: string
  descuento: number
  tipoDescuento: 'porcentaje' | 'monto'
  subtotal: number
  totalFinal: number
  motivoRechazo: string | null
  vigenciaDias: number
  fechaVigencia: string | null
  otId: number | null
  creadoPor: string
  creadoEn: string
  actualizadoEn: string
  vencido: boolean
}

export interface ItemPresupuesto {
  id: number
  presupuestoId: number
  productoId: number
  tipoItem: 'simple' | 'conjunto'
  nombre: string
  cantidad: number
  unidadMedida: UnidadMedida
  precioUnitario: number
  descuentoItem: number
  subtotal: number
}

export const ESTADOS_TERMINALES: EstadoPresupuesto[] = ['aprobado', 'rechazado', 'convertido']

export const MOTIVOS_RECHAZO = ['Precio muy alto', 'Cliente desistió', 'Sin stock', 'Otro']
