export interface Cliente {
  id: number
  nombre: string
  telefono: string
  email: string
  direccion: string
  categoria: CategoriaCliente
  notas: string
  creadoEn: string
  actualizadoEn: string
}

export type CategoriaCliente =
  | 'General'
  | 'Frecuente'
  | 'VIP'
  | 'Mayorista'
  | 'Ocasional'

export const CATEGORIAS_CLIENTE: CategoriaCliente[] = [
  'General',
  'Frecuente',
  'VIP',
  'Mayorista',
  'Ocasional',
]

export interface LogComunicacion {
  id: number
  clienteId: number
  fecha: string
  responsable: string
  resumen: string
  creadoEn: string
}

export interface ClienteIndicadores {
  totalGastado: number
  cantidadOTs: number
  ultimaVisita: string | null
  productosMasComprados: string[]
}
