export type TipoDevolucion = 'ot' | 'pos'

export const MOTIVOS_DEVOLUCION = [
  'Producto defectuoso',
  'Producto incorrecto',
  'Cambio de opinión',
  'Exceso de cantidad',
  'Otro',
] as const

export interface ItemDevolucion {
  id: number
  devolucionId: number
  productoId: number
  nombre: string
  cantidadOriginal: number
  cantidadDevuelta: number
  precioUnitario: number
  subtotalDevuelto: number
}

export interface Devolucion {
  id: number
  numero: number
  tipo: TipoDevolucion
  otId: number | null
  ventaPosId: number | null
  clienteId: number | null
  clienteNombre: string | null
  motivo: string
  observacion: string | null
  totalDevuelto: number
  procesadoPor: string
  fecha: string
  items: ItemDevolucion[]
}

// ─── Origen encontrado al buscar (paso 1 del modal) ────────────

export interface OrigenItem {
  productoId: number
  nombre: string
  cantidadOriginal: number
  precioUnitario: number
}

export interface OrigenDevolucion {
  tipo: TipoDevolucion
  otId: number | null
  ventaPosId: number | null
  clienteId: number | null
  clienteNombre: string | null
  numeroOrigen: number
  fecha: string
  totalOriginal: number
  items: OrigenItem[]
}

// ─── Payload para crear una devolución ─────────────────────────

export interface ItemNuevaDevolucion {
  productoId: number
  nombre: string
  cantidadOriginal: number
  cantidadDevuelta: number
  precioUnitario: number
  subtotalDevuelto: number
}

export interface NuevaDevolucion {
  tipo: TipoDevolucion
  otId: number | null
  ventaPosId: number | null
  clienteId: number | null
  clienteNombre: string | null
  motivo: string
  observacion: string | null
  items: ItemNuevaDevolucion[]
}
