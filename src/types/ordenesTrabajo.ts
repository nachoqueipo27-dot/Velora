export type EstadoOT =
  | 'recepcion'
  | 'en_proceso'
  | 'finalizado'
  | 'entregado'
  | 'cancelado'

export const ESTADOS_OT: { value: EstadoOT; label: string; color: string }[] = [
  { value: 'recepcion',  label: 'Recepción',   color: '#4A7FA5' },
  { value: 'en_proceso', label: 'En proceso',  color: '#D4921A' },
  { value: 'finalizado', label: 'Finalizado',  color: '#4CAF7D' },
  { value: 'entregado',  label: 'Entregado',   color: '#606060' },
  { value: 'cancelado',  label: 'Cancelado',   color: '#C0392B' },
]

export interface EtiquetaOT {
  id: number
  nombre: string
  color: string
}

export interface OrdenTrabajo {
  id: number
  numero: number
  clienteId: number
  clienteNombre: string
  empleadoId: number | null
  empleadoNombre: string | null
  productoId: number
  tipoItem: 'simple' | 'conjunto'
  productoNombre: string
  descripcion: string | null
  estado: EstadoOT
  descuento: number
  tipoDescuento: 'porcentaje' | 'monto'
  precio: number
  totalFinal: number
  motivoCancelacion: string | null
  notas: string | null
  presupuestoId: number | null
  esRecurrente: boolean
  frecuencia: string | null
  proximaFecha: string | null
  garantiaDias: number
  garantiaVence: string | null
  creadoPor: string
  creadoEn: string
  actualizadoEn: string
  etiquetas: EtiquetaOT[]
  diasSinMovimiento: number
}

export interface PlantillaOT {
  id: number
  nombre: string
  descripcion: string | null
  productoId: number | null
  tipoItem: string | null
}

export interface ComponenteCancelacion {
  productoId: number
  nombre: string
  cantidad: number
  recuperar: boolean
}

export interface NotaOT {
  id: number
  otId: number
  nota: string
  creadoPor: string
  creadoEn: string
}

export interface GarantiaActiva {
  id: number
  otId: number
  clienteId: number
  clienteNombre: string
  productoId: number
  productoNombre: string
  diasGarantia: number
  fechaInicio: string
  fechaVence: string
  activa: boolean
}

export const FRECUENCIAS: { value: string; label: string }[] = [
  { value: 'diaria',        label: 'Diaria' },
  { value: 'semanal',       label: 'Semanal' },
  { value: 'quincenal',     label: 'Quincenal' },
  { value: 'mensual',       label: 'Mensual' },
  { value: 'personalizada', label: 'Personalizada' },
]

export const MOTIVOS_CANCELACION_OT = [
  'Precio muy alto',
  'Cliente desistió',
  'Producto sin stock',
  'Demora excesiva',
  'Error de carga',
  'Otro',
]

export const UMBRAL_DIAS_SIN_MOVIMIENTO = 3
