// Utilidades de fecha para el calendario de la Agenda (sin librerías externas).

export const MS_DIA = 86400000

export function inicioDia(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function finDia(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

/** Lunes de la semana que contiene a `d` (semana Lun-Dom). */
export function inicioSemana(d: Date): Date {
  const x = inicioDia(d)
  const dow = x.getDay() // 0=Dom
  const diff = dow === 0 ? -6 : 1 - dow
  x.setDate(x.getDate() + diff)
  return x
}

export function finSemana(d: Date): Date {
  const x = inicioSemana(d)
  x.setDate(x.getDate() + 6)
  return finDia(x)
}

export function inicioMes(d: Date): Date {
  return inicioDia(new Date(d.getFullYear(), d.getMonth(), 1))
}

export function finMes(d: Date): Date {
  return finDia(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/** Grilla mensual: 6 semanas × 7 días empezando el lunes. */
export function gridMensual(d: Date): Date[] {
  const start = inicioSemana(inicioMes(d))
  return Array.from({ length: 42 }, (_, i) => {
    const x = new Date(start)
    x.setDate(start.getDate() + i)
    return x
  })
}

export function diasSemana(d: Date): Date[] {
  const start = inicioSemana(d)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start)
    x.setDate(start.getDate() + i)
    return x
  })
}

export function mismoDia(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function esHoy(d: Date): boolean {
  return mismoDia(d, new Date())
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export const nombreDia = (d: Date) => DIAS[d.getDay()]
export const nombreDiaCorto = (d: Date) => DIAS_CORTOS[d.getDay()]
export const nombreMes = (m: number) => MESES[m]

export function tituloDiaria(d: Date): string {
  return `${nombreDia(d)} ${d.getDate()} de ${nombreMes(d.getMonth())} de ${d.getFullYear()}`
}

export function tituloSemanal(d: Date): string {
  const ini = inicioSemana(d)
  const fin = new Date(ini); fin.setDate(ini.getDate() + 6)
  const mismoMes = ini.getMonth() === fin.getMonth()
  if (mismoMes) return `${ini.getDate()} — ${fin.getDate()} ${nombreMes(ini.getMonth())} ${ini.getFullYear()}`
  return `${ini.getDate()} ${nombreMes(ini.getMonth())} — ${fin.getDate()} ${nombreMes(fin.getMonth())} ${fin.getFullYear()}`
}

export function tituloMensual(d: Date): string {
  return `${nombreMes(d.getMonth()).replace(/^./, c => c.toUpperCase())} ${d.getFullYear()}`
}

/** 'HH:MM' local de un ISO string. */
export function horaDe(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Minutos desde medianoche de un ISO local. */
export function minutosDelDia(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

/** Construye un ISO local (sin Z) a partir de fecha 'YYYY-MM-DD' y hora 'HH:MM'. */
export function isoLocal(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00`
}

/** 'YYYY-MM-DD' local de un Date. */
export function fechaInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
