import { minutosDelDia, mismoDia } from '../../lib/fecha'
import type { Cita } from '../../types/agenda'

export interface CitaPosicionada {
  cita: Cita
  topPct: number
  heightPct: number
  col: number
  cols: number
}

/**
 * Posiciona las citas de un día dentro de una ventana [minStart, minEnd] (minutos del día),
 * resolviendo solapamientos en columnas lado a lado.
 */
export function posicionarCitas(citas: Cita[], dia: Date, minStart = 0, minEnd = 1440): CitaPosicionada[] {
  const total = minEnd - minStart
  const delDia = citas
    .filter(c => mismoDia(new Date(c.fechaInicio), dia))
    .map(c => {
      const ini = Math.max(minStart, minutosDelDia(c.fechaInicio))
      const finRaw = minutosDelDia(c.fechaFin) || ini + 30
      const fin = Math.min(minEnd, finRaw <= ini ? ini + 30 : finRaw)
      return { cita: c, ini, fin }
    })
    .sort((a, b) => a.ini - b.ini || a.fin - b.fin)

  // Agrupar en clusters de citas que se solapan transitivamente.
  const resultado: CitaPosicionada[] = []
  let cluster: typeof delDia = []
  let clusterFin = -1

  const volcar = () => {
    if (cluster.length === 0) return
    // asignar columnas dentro del cluster
    const colsFin: number[] = []
    const asign = cluster.map(item => {
      let col = colsFin.findIndex(f => f <= item.ini)
      if (col === -1) { col = colsFin.length; colsFin.push(item.fin) }
      else colsFin[col] = item.fin
      return { item, col }
    })
    const cols = colsFin.length
    asign.forEach(({ item, col }) => {
      resultado.push({
        cita: item.cita,
        topPct: ((item.ini - minStart) / total) * 100,
        heightPct: Math.max(2, ((item.fin - item.ini) / total) * 100),
        col, cols,
      })
    })
    cluster = []
    clusterFin = -1
  }

  for (const item of delDia) {
    if (cluster.length > 0 && item.ini >= clusterFin) volcar()
    cluster.push(item)
    clusterFin = Math.max(clusterFin, item.fin)
  }
  volcar()
  return resultado
}
