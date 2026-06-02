export interface OnboardingData {
  // Paso 1
  nombreNegocio: string
  rubro: string
  direccion: string
  telefono: string
  email: string
  logo: string | null
  // Paso 2
  adminNombre: string
  adminDni: string
  adminPassword: string
  // Paso 3
  moneda: 'ARS' | 'USD'
  tema: 'dark' | 'light'
  anchoPapel: '58mm' | '80mm'
  // Paso 4
  funcionesHabilitadas: string[]
}

export interface Usuario {
  id: number
  nombre: string
  rol: string
  avatar: string | null
}

export type EstadoOT =
  | 'recepcion'
  | 'en_proceso'
  | 'finalizado'
  | 'entregado'
  | 'cancelado'
