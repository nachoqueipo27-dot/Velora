export interface Rol {
  id: number
  nombre: string
  esAdmin: boolean
}

export interface Permiso {
  id: number
  rolId: number
  modulo: string
  nivel: NivelPermiso
}

export type NivelPermiso = 'sin_acceso' | 'solo_ver' | 'editar'

export interface Empleado {
  id: number
  nombre: string
  dni: string
  rolId: number
  rolNombre: string
  avatar: string | null
  activo: boolean
  tipoHorario: 'fijo' | 'turno'
  creadoEn: string
  actualizadoEn: string
}

export interface HorarioFijo {
  diaSemana: number
  entrada: string | null
  salida: string | null
  laborable: boolean
}

export interface Turno {
  id: number
  nombre: string
  entrada: string
  salida: string
}

export interface Fichaje {
  id: number
  empleadoId: number
  fecha: string
  entrada: string | null
  salida: string | null
  horasTrabajadas: number | null
  editadoPor: string | null
}

export interface HoraExtra {
  id: number
  empleadoId: number
  fecha: string
  horarioVigente: string
  horaSalidaReal: string
  minutosExtra: number
  tipo: 'comun' | 'nocturna' | 'feriado'
  observacion: string | null
  registradoPor: string
}

export interface Ausencia {
  id: number
  empleadoId: number
  tipo: TipoAusencia
  fechaInicio: string
  fechaFin: string
  horarioAfectado: string
  observacion: string
  comprobante: string | null
}

export type TipoAusencia =
  | 'injustificada'
  | 'justificada'
  | 'vacaciones'
  | 'licencia_medica'
  | 'licencia_personal'
  | 'otro'

export const TIPOS_AUSENCIA: { value: TipoAusencia; label: string }[] = [
  { value: 'injustificada',    label: 'Falta injustificada' },
  { value: 'justificada',      label: 'Falta justificada' },
  { value: 'vacaciones',       label: 'Vacaciones' },
  { value: 'licencia_medica',  label: 'Licencia médica' },
  { value: 'licencia_personal',label: 'Licencia personal' },
  { value: 'otro',             label: 'Otro' },
]

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
