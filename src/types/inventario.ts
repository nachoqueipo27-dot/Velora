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
  unidadMedida: UnidadMedida
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

export type UnidadMedida = 'unidad' | 'metro' | 'kilogramo' | 'litro' | 'caja'

export const UNIDADES_MEDIDA: { value: UnidadMedida; label: string }[] = [
  { value: 'unidad',    label: 'Unidad' },
  { value: 'metro',     label: 'Metro' },
  { value: 'kilogramo', label: 'Kilogramo' },
  { value: 'litro',     label: 'Litro' },
  { value: 'caja',      label: 'Caja' },
]

// 'unidad' y 'caja' son cantidades enteras por naturaleza (no se vende "media caja" ni
// "0.5 unidades" de un producto discreto); 'metro', 'kilogramo' y 'litro' son magnitudes
// físicas continuas y sí aceptan fracciones (ej. 2.5 metros de cable). La restricción de
// decimales depende exclusivamente de esta unidad, no de un campo aparte.
export const UNIDADES_ENTERAS: UnidadMedida[] = ['unidad', 'caja']
export const permiteDecimales = (u: UnidadMedida): boolean => !UNIDADES_ENTERAS.includes(u)

// Forma corta para espacios reducidos (ej. carrito del POS). Para texto con más lugar
// (fichas, listados) usar el label completo de UNIDADES_MEDIDA en su lugar.
export const UNIDAD_ABREVIADA: Record<UnidadMedida, string> = {
  unidad: 'u.', metro: 'm', kilogramo: 'kg', litro: 'L', caja: 'caja',
}
