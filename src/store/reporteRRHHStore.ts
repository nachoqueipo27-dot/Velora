import { create } from 'zustand'
import { getDb } from '../db'
import { TIPOS_AUSENCIA, type TipoAusencia } from '../types/empleados'

export type TipoHoraExtra = 'comun' | 'nocturna' | 'feriado'

export const TIPOS_HORA_EXTRA: { value: TipoHoraExtra; label: string }[] = [
  { value: 'comun', label: 'Común' },
  { value: 'nocturna', label: 'Nocturna' },
  { value: 'feriado', label: 'Feriado' },
]

export interface FichajeResumen {
  id: number
  fecha: string
  empleadoNombre: string
  entrada: string | null
  salida: string | null
  horasTrabajadas: number | null
}

export interface EmpleadoHoras {
  empleadoId: number
  empleadoNombre: string
  horas: number
}

export interface EmpleadoMinutosExtra {
  empleadoId: number
  empleadoNombre: string
  minutos: number
}

export interface ExtraPorTipo {
  tipo: TipoHoraExtra
  label: string
  minutos: number
}

export interface AusenciaPorTipo {
  tipo: TipoAusencia
  label: string
  cantidad: number
}

export interface AusenciaResumen {
  id: number
  empleadoNombre: string
  tipo: TipoAusencia
  fechaInicio: string
  fechaFin: string
}

const PAGE = 10

interface ReporteRRHHStore {
  cargando: boolean
  totalHorasTrabajadas: number
  rankingHoras: EmpleadoHoras[]
  totalMinutosExtra: number
  extrasPorTipo: ExtraPorTipo[]
  rankingExtras: EmpleadoMinutosExtra[]
  totalAusencias: number
  ausenciasPorTipo: AusenciaPorTipo[]
  ausencias: AusenciaResumen[]
  fichajes: FichajeResumen[]
  totalFichajes: number

  cargarReporte: (desde: string, hasta: string, pagina: number) => Promise<void>
  obtenerTodosLosFichajes: (desde: string, hasta: string) => Promise<FichajeResumen[]>
}

const mapFichaje = (r: any): FichajeResumen => ({
  id: r.id, fecha: r.fecha, empleadoNombre: r.empleado_nombre,
  entrada: r.entrada ?? null, salida: r.salida ?? null, horasTrabajadas: r.horas_trabajadas ?? null,
})

const mapAusencia = (r: any): AusenciaResumen => ({
  id: r.id, empleadoNombre: r.empleado_nombre, tipo: r.tipo,
  fechaInicio: r.fecha_inicio, fechaFin: r.fecha_fin,
})

export const useReporteRRHHStore = create<ReporteRRHHStore>((set) => ({
  cargando: false,
  totalHorasTrabajadas: 0,
  rankingHoras: [],
  totalMinutosExtra: 0,
  extrasPorTipo: [],
  rankingExtras: [],
  totalAusencias: 0,
  ausenciasPorTipo: [],
  ausencias: [],
  fichajes: [],
  totalFichajes: 0,

  cargarReporte: async (desde, hasta, pagina) => {
    set({ cargando: true })
    try {
      const db = await getDb()

      // ── Horas trabajadas ────────────────────────────────────────
      const totalHorasRows = await db.select<{ total: number | null }[]>(
        `SELECT COALESCE(SUM(horas_trabajadas), 0) as total FROM fichajes
         WHERE substr(fecha,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const totalHorasTrabajadas = totalHorasRows[0]?.total ?? 0

      // El nombre del empleado se resuelve siempre por JOIN con empleados (empleado_id → empleados.nombre).
      const rankingHorasRows = await db.select<any[]>(
        `SELECT f.empleado_id, e.nombre as empleado_nombre, COALESCE(SUM(f.horas_trabajadas), 0) as horas
         FROM fichajes f JOIN empleados e ON f.empleado_id = e.id
         WHERE substr(f.fecha,1,10) BETWEEN ? AND ?
         GROUP BY f.empleado_id, e.nombre ORDER BY horas DESC`,
        [desde, hasta]
      )
      const rankingHoras: EmpleadoHoras[] = rankingHorasRows.map(r => ({
        empleadoId: r.empleado_id, empleadoNombre: r.empleado_nombre, horas: r.horas,
      }))

      // ── Horas extra ─────────────────────────────────────────────
      const extraTipoRows = await db.select<{ tipo: TipoHoraExtra; minutos: number }[]>(
        `SELECT tipo, COALESCE(SUM(minutos_extra), 0) as minutos FROM horas_extras
         WHERE substr(fecha,1,10) BETWEEN ? AND ? GROUP BY tipo`,
        [desde, hasta]
      )
      const extrasPorTipo: ExtraPorTipo[] = TIPOS_HORA_EXTRA.map(t => ({
        tipo: t.value, label: t.label,
        minutos: extraTipoRows.find(r => r.tipo === t.value)?.minutos ?? 0,
      }))
      const totalMinutosExtra = extrasPorTipo.reduce((acc, t) => acc + t.minutos, 0)

      const rankingExtrasRows = await db.select<any[]>(
        `SELECT h.empleado_id, e.nombre as empleado_nombre, COALESCE(SUM(h.minutos_extra), 0) as minutos
         FROM horas_extras h JOIN empleados e ON h.empleado_id = e.id
         WHERE substr(h.fecha,1,10) BETWEEN ? AND ?
         GROUP BY h.empleado_id, e.nombre ORDER BY minutos DESC`,
        [desde, hasta]
      )
      const rankingExtras: EmpleadoMinutosExtra[] = rankingExtrasRows.map(r => ({
        empleadoId: r.empleado_id, empleadoNombre: r.empleado_nombre, minutos: r.minutos,
      }))

      // ── Ausencias ───────────────────────────────────────────────
      // Criterio de solapamiento: una ausencia cuenta para el período si su rango se superpone
      // con el rango del reporte, aunque empiece antes o termine después:
      //   fecha_inicio <= hasta AND fecha_fin >= desde
      const ausenciaTipoRows = await db.select<{ tipo: TipoAusencia; n: number }[]>(
        `SELECT tipo, COUNT(*) as n FROM ausencias
         WHERE substr(fecha_inicio,1,10) <= ? AND substr(fecha_fin,1,10) >= ? GROUP BY tipo`,
        [hasta, desde]
      )
      const ausenciasPorTipo: AusenciaPorTipo[] = TIPOS_AUSENCIA.map(t => ({
        tipo: t.value, label: t.label,
        cantidad: ausenciaTipoRows.find(r => r.tipo === t.value)?.n ?? 0,
      }))
      const totalAusencias = ausenciasPorTipo.reduce((acc, t) => acc + t.cantidad, 0)

      const ausenciasRows = await db.select<any[]>(
        `SELECT a.id, e.nombre as empleado_nombre, a.tipo, a.fecha_inicio, a.fecha_fin
         FROM ausencias a JOIN empleados e ON a.empleado_id = e.id
         WHERE substr(a.fecha_inicio,1,10) <= ? AND substr(a.fecha_fin,1,10) >= ?
         ORDER BY a.fecha_inicio DESC`,
        [hasta, desde]
      )

      // ── Detalle de fichajes (paginado) ──────────────────────────
      const totalRows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM fichajes WHERE substr(fecha,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const totalFichajes = totalRows[0]?.n ?? 0

      const fichajesRows = await db.select<any[]>(
        `SELECT f.id, f.fecha, e.nombre as empleado_nombre, f.entrada, f.salida, f.horas_trabajadas
         FROM fichajes f JOIN empleados e ON f.empleado_id = e.id
         WHERE substr(f.fecha,1,10) BETWEEN ? AND ?
         ORDER BY f.fecha DESC LIMIT ${PAGE} OFFSET ${pagina * PAGE}`,
        [desde, hasta]
      )

      set({
        totalHorasTrabajadas, rankingHoras,
        totalMinutosExtra, extrasPorTipo, rankingExtras,
        totalAusencias, ausenciasPorTipo, ausencias: ausenciasRows.map(mapAusencia),
        fichajes: fichajesRows.map(mapFichaje), totalFichajes,
        cargando: false,
      })
    } catch (e) {
      console.error('cargarReporte', e)
      set({ cargando: false })
    }
  },

  // Detalle completo del período (sin paginar) — usado solo al generar el PDF.
  obtenerTodosLosFichajes: async (desde, hasta) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT f.id, f.fecha, e.nombre as empleado_nombre, f.entrada, f.salida, f.horas_trabajadas
       FROM fichajes f JOIN empleados e ON f.empleado_id = e.id
       WHERE substr(f.fecha,1,10) BETWEEN ? AND ? ORDER BY f.fecha DESC`,
      [desde, hasta]
    )
    return rows.map(mapFichaje)
  },
}))
