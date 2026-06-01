// Utilidades de tiempo para horarios de empleados (formato 'HH:MM').

/** Convierte 'HH:MM' a minutos desde medianoche. */
export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Diferencia en minutos entre dos horas 'HH:MM' (fin - inicio). Negativo si fin < inicio. */
export function minutosEntre(inicio: string, fin: string): number {
  return horaAMinutos(fin) - horaAMinutos(inicio)
}

/** Formatea una cantidad de minutos como '2h 15m', '45m' o '3h'. */
export function formatMinutos(min: number): string {
  if (min <= 0) return '0m'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/** Formatea minutos como horas decimales (ej. 90 -> '1.5'). */
export function minutosAHoras(min: number): number {
  return Math.round((min / 60) * 100) / 100
}
