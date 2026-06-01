export type FormaPago = 'efectivo' | 'transferencia' | 'tarjeta'

export interface CobroCaja {
  id: number
  fecha: string
  monto: number
  formaPago: FormaPago
  concepto: string | null
  otId: number | null
  ventaPosId: number | null
  empleadoId: number | null
}

export interface GastoOperativo {
  id: number
  fecha: string
  monto: number
  categoria: string
  descripcion: string | null
  comprobante: string | null
  empleadoId: number | null
}

export interface ResumenCaja {
  totalEfectivo: number
  totalTransferencia: number
  totalTarjeta: number
  totalIngresos: number
  totalGastos: number
  saldoNeto: number
  cobros: CobroCaja[]
  gastos: GastoOperativo[]
}

export interface CierreCaja {
  id: number
  fecha: string
  totalEfectivo: number
  totalTransferencia: number
  totalTarjeta: number
  totalIngresos: number
  totalGastos: number
  saldoNeto: number
  cerradoPor: string
  notas: string | null
}

export interface CierreMes {
  id: number
  anio: number
  mes: number
  totalIngresos: number
  totalGastos: number
  margenOperativo: number
  otsCompletadas: number
  otsCanceladas: number
  productoMasVendido: string | null
  empleadoDestacado: string | null
  cerradoPor: string
  creadoEn: string
}

export interface ResumenMes {
  anio: number
  mes: number
  totalIngresos: number
  totalGastos: number
  margenOperativo: number
  otsCompletadas: number
  otsCanceladas: number
  productoMasVendido: string | null
  empleadoDestacado: string | null
}

export interface DatosComparativo {
  ingresos: number
  gastos: number
  otsCompletadas: number
  ticketPromedio: number
}

export const CATEGORIAS_GASTO = [
  'Servicios',
  'Alquiler',
  'Insumos',
  'Transporte',
  'Personal',
  'Impuestos',
  'Mantenimiento',
  'Marketing',
  'Otro',
] as const

export const FORMAS_PAGO_CAJA: { value: FormaPago; label: string }[] = [
  { value: 'efectivo',      label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta',       label: 'Tarjeta' },
]

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
] as const
