export interface ItemListaPrecios {
  productoId: number
  nombre: string
  categoria: string
  categoriaId: number | null
  tipo: 'simple' | 'conjunto'
  precioCosto: number
  precioActual: number
  precioNuevo?: number   // calculado al previsualizar
  variacion?: number     // porcentaje de variación
}

export interface HistorialPrecio {
  id: number
  productoId: number
  productoNombre: string
  precioAnterior: number
  precioNuevo: number
  porcentaje: number | null
  motivo: string | null
  aplicadoPor: string
  fecha: string
}

export interface ItemSnapshotPrecio {
  productoId: number
  nombre: string
  precio: number
}

export interface SnapshotLista {
  id: number
  nombre: string
  descripcion: string
  snapshot: ItemSnapshotPrecio[]
  creadoPor: string
  vigenciaDesde: string
  creadoEn: string
}
