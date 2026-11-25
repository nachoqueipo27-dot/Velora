export interface Proveedor {
  id: number
  nombre: string
  rubro: string
  contacto: string
  telefono: string
  email: string
  direccion: string
  notas: string
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

/** 'parcial': llegó una parte; lo pendiente sigue abierto para otra recepción. */
export type EstadoOrdenCompra = 'borrador' | 'enviada' | 'parcial' | 'recibida'

export interface OrdenCompra {
  id: number
  proveedorId: number
  proveedorNombre: string
  estado: EstadoOrdenCompra
  numero: number
  notas: string
  total: number
  fechaEnvio: string | null
  fechaRecepcion: string | null
  creadoEn: string
  actualizadoEn: string
}

export interface ItemOrdenCompra {
  id: number
  ordenId: number
  productoId: number
  productoNombre: string
  cantidad: number
  precioCosto: number
  /** Cantidad recibida acumulada (antes de la 1.5.0 era 0/1). */
  recibido: number
}

export const ESTADO_ORDEN_LABEL: Record<EstadoOrdenCompra, string> = {
  borrador: 'Borrador',
  enviada:  'Enviada',
  parcial:  'Parcial',
  recibida: 'Recibida',
}
