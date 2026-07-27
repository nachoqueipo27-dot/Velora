export interface Categoria {
  id: number
  nombre: string
}

export interface Producto {
  id: number
  nombre: string
  tipo: 'simple' | 'conjunto'
  descripcion: string
  categoriaId: number | null
  categoriaNombre: string
  precio: number
  precioCosto: number
  monedaCosto: 'ARS' | 'USD'
  codigoSku: string
  stock: number
  stockMinimo: number
  imagen: string | null
  trazabilidad: 'ninguna' | 'serie' | 'lote'
  activo: boolean
  creadoEn: string
  actualizadoEn: string
}

export interface ComponenteConjunto {
  id: number
  conjuntoId: number
  componenteId: number
  componenteNombre: string
  cantidad: number
  stockComponente: number
}

export interface MovimientoStock {
  id: number
  productoId: number
  productoNombre: string
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  motivo: string | null
  lote: string | null
  serie: string | null
  fecha: string
}

export interface InformeRentabilidad {
  productoId: number
  productoNombre: string
  categoria: string
  precioCosto: number
  precioVenta: number
  margenUnitario: number
  margenPorcentaje: number
  unidadesVendidas: number
  margenAcumulado: number
}

export type Trazabilidad = 'ninguna' | 'serie' | 'lote'

export const TRAZABILIDAD_OPCIONES: { value: Trazabilidad; label: string }[] = [
  { value: 'ninguna', label: 'Ninguna' },
  { value: 'serie',   label: 'Por serie' },
  { value: 'lote',    label: 'Por lote' },
]
