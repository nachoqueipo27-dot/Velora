export interface Cita {
  id: number
  titulo: string
  clienteId: number | null
  clienteNombre: string | null
  empleadoId: number | null
  empleadoNombre: string | null
  otId: number | null
  fechaInicio: string  // ISO string
  fechaFin: string     // ISO string
  descripcion: string | null
  color: string
  creadoPor: string
  duracionMinutos: number  // calculado
}

export interface SlotTiempo {
  hora: string   // '09:00'
  minuto: number
  citas: Cita[]
}

export type VistaAgenda = 'diaria' | 'semanal' | 'mensual'

export const COLORES_CITA = [
  '#4A7FA5', // azul
  '#4CAF7D', // verde
  '#D4921A', // ámbar
  '#C0392B', // rojo
  '#7C5CFC', // violeta
  '#E0598B', // rosa
  '#1ABC9C', // turquesa
  '#606060', // gris
]
