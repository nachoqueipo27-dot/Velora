import { create } from 'zustand'
import { getDb } from '../db'

export interface CierreCajaResumen {
  id: number
  fecha: string
  totalIngresos: number
  totalGastos: number
  saldoNeto: number
  cerradoPor: string
}

export interface GastoOperativoResumen {
  id: number
  fecha: string
  categoria: string
  monto: number
  descripcion: string | null
}

export interface GastoPorCategoria {
  categoria: string
  monto: number
}

export interface CierreMesResumen {
  anio: number
  mes: number
  totalIngresos: number
  totalGastos: number
  margenOperativo: number
  cerradoPor: string
}

export interface AvanceMesResumen {
  anio: number
  mes: number
  totalIngresos: number
  totalGastos: number
  margenOperativo: number
}

const PAGE = 10

// Detecta si [desde, hasta] (strings 'yyyy-MM-dd') coincide EXACTAMENTE con un mes
// calendario completo (desde = día 1, hasta = último día de ese mismo mes). Si no
// coincide (ej. "esta semana" o un rango custom), devuelve null — no arma un cierre
// parcial. Comparación por partes numéricas para evitar corrimientos de huso horario.
function mesCalendarioCompleto(desde: string, hasta: string): { anio: number; mes: number } | null {
  const [dAnio, dMes, dDia] = desde.split('-').map(Number)
  const [hAnio, hMes, hDia] = hasta.split('-').map(Number)
  if (dAnio !== hAnio || dMes !== hMes) return null
  if (dDia !== 1) return null
  const ultimoDia = new Date(dAnio, dMes, 0).getDate()
  if (hDia !== ultimoDia) return null
  return { anio: dAnio, mes: dMes }
}

// Detecta si [desde, hasta] es "el mes calendario ACTUAL, desde el día 1 hasta hoy"
// (el mes en curso, todavía sin cerrar) — distinto de mesCalendarioCompleto, que exige
// llegar hasta el último día del mes. No alcanza con que desde sea día 1: desde y hasta
// deben caer en el año/mes real de hoy, y hasta debe ser exactamente la fecha de hoy.
function mesEnCursoHastaHoy(desde: string, hasta: string): { anio: number; mes: number } | null {
  const hoy = new Date()
  const anioActual = hoy.getFullYear()
  const mesActual = hoy.getMonth() + 1
  const hoyStr = `${anioActual}-${String(mesActual).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  const [dAnio, dMes, dDia] = desde.split('-').map(Number)
  if (dAnio !== anioActual || dMes !== mesActual || dDia !== 1) return null
  if (hasta !== hoyStr) return null
  return { anio: anioActual, mes: mesActual }
}

interface ReporteCajaFinanzasStore {
  cargando: boolean
  totalCobrado: number
  totalGastos: number
  balanceNeto: number
  cantidadCierres: number
  gastosPorCategoria: GastoPorCategoria[]
  cierres: CierreCajaResumen[]
  totalCierres: number
  gastos: GastoOperativoResumen[]
  totalGastosDetalle: number
  cierreMes: CierreMesResumen | null
  avanceMes: AvanceMesResumen | null

  cargarReporte: (desde: string, hasta: string, paginaCierres: number, paginaGastos: number) => Promise<void>
  obtenerTodosLosCierres: (desde: string, hasta: string) => Promise<CierreCajaResumen[]>
  obtenerTodosLosGastos: (desde: string, hasta: string) => Promise<GastoOperativoResumen[]>
}

const mapCierre = (r: any): CierreCajaResumen => ({
  id: r.id, fecha: r.fecha, totalIngresos: r.total_ingresos ?? 0, totalGastos: r.total_gastos ?? 0,
  saldoNeto: r.saldo_neto ?? 0, cerradoPor: r.cerrado_por,
})

const mapGasto = (r: any): GastoOperativoResumen => ({
  id: r.id, fecha: r.fecha, categoria: r.categoria, monto: r.monto, descripcion: r.descripcion ?? null,
})

const mapCierreMes = (r: any): CierreMesResumen => ({
  anio: r.anio, mes: r.mes, totalIngresos: r.total_ingresos ?? 0, totalGastos: r.total_gastos ?? 0,
  margenOperativo: r.margen_operativo ?? 0, cerradoPor: r.cerrado_por,
})

export const useReporteCajaFinanzasStore = create<ReporteCajaFinanzasStore>((set) => ({
  cargando: false,
  totalCobrado: 0,
  totalGastos: 0,
  balanceNeto: 0,
  cantidadCierres: 0,
  gastosPorCategoria: [],
  cierres: [],
  totalCierres: 0,
  gastos: [],
  totalGastosDetalle: 0,
  cierreMes: null,
  avanceMes: null,

  cargarReporte: async (desde, hasta, paginaCierres, paginaGastos) => {
    set({ cargando: true })
    try {
      const db = await getDb()

      const cobrosRows = await db.select<{ total: number | null }[]>(
        `SELECT COALESCE(SUM(monto), 0) as total FROM cobros_caja WHERE substr(fecha,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const totalCobrado = cobrosRows[0]?.total ?? 0

      const gastosTotalRows = await db.select<{ total: number | null; cantidad: number }[]>(
        `SELECT COALESCE(SUM(monto), 0) as total, COUNT(*) as cantidad
         FROM gastos_operativos WHERE substr(fecha,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const totalGastos = gastosTotalRows[0]?.total ?? 0
      const totalGastosDetalle = gastosTotalRows[0]?.cantidad ?? 0

      const cierresCountRows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM cierres_caja WHERE substr(fecha,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const cantidadCierres = cierresCountRows[0]?.n ?? 0

      const gastosPorCategoriaRows = await db.select<any[]>(
        `SELECT categoria, COALESCE(SUM(monto), 0) as monto
         FROM gastos_operativos WHERE substr(fecha,1,10) BETWEEN ? AND ?
         GROUP BY categoria ORDER BY monto DESC`,
        [desde, hasta]
      )

      const cierresRows = await db.select<any[]>(
        `SELECT id, fecha, total_ingresos, total_gastos, saldo_neto, cerrado_por
         FROM cierres_caja WHERE substr(fecha,1,10) BETWEEN ? AND ?
         ORDER BY fecha DESC LIMIT ${PAGE} OFFSET ${paginaCierres * PAGE}`,
        [desde, hasta]
      )

      const gastosRows = await db.select<any[]>(
        `SELECT id, fecha, categoria, monto, descripcion
         FROM gastos_operativos WHERE substr(fecha,1,10) BETWEEN ? AND ?
         ORDER BY fecha DESC LIMIT ${PAGE} OFFSET ${paginaGastos * PAGE}`,
        [desde, hasta]
      )

      // Cierre de mes (oficial) vs. mes en curso (avance parcial) — mutuamente excluyentes.
      const rangoMesCompleto = mesCalendarioCompleto(desde, hasta)
      let cierreMes: CierreMesResumen | null = null
      let avanceMes: AvanceMesResumen | null = null

      if (rangoMesCompleto) {
        const cierreMesRows = await db.select<any[]>(
          `SELECT anio, mes, total_ingresos, total_gastos, margen_operativo, cerrado_por
           FROM cierres_mes WHERE anio = ? AND mes = ? LIMIT 1`,
          [rangoMesCompleto.anio, rangoMesCompleto.mes]
        )
        cierreMes = cierreMesRows.length ? mapCierreMes(cierreMesRows[0]) : null
      } else {
        const rangoEnCurso = mesEnCursoHastaHoy(desde, hasta)
        if (rangoEnCurso) {
          const yaCerradoRows = await db.select<{ n: number }[]>(
            `SELECT COUNT(*) as n FROM cierres_mes WHERE anio = ? AND mes = ?`,
            [rangoEnCurso.anio, rangoEnCurso.mes]
          )
          if ((yaCerradoRows[0]?.n ?? 0) === 0) {
            // Reutiliza los mismos totales ya calculados para el resto del reporte —
            // no se arma un cierre parcial en cierresMes, solo se muestra en pantalla/PDF.
            avanceMes = {
              anio: rangoEnCurso.anio, mes: rangoEnCurso.mes,
              totalIngresos: totalCobrado, totalGastos: totalGastos, margenOperativo: totalCobrado - totalGastos,
            }
          }
        }
      }

      set({
        totalCobrado,
        totalGastos,
        balanceNeto: totalCobrado - totalGastos,
        cantidadCierres,
        gastosPorCategoria: gastosPorCategoriaRows.map(r => ({ categoria: r.categoria, monto: r.monto })),
        cierres: cierresRows.map(mapCierre),
        totalCierres: cantidadCierres,
        gastos: gastosRows.map(mapGasto),
        totalGastosDetalle,
        cierreMes,
        avanceMes,
        cargando: false,
      })
    } catch (e) {
      console.error('cargarReporte', e)
      set({ cargando: false })
    }
  },

  // Detalle completo del período (sin paginar) — usado solo al generar el PDF.
  obtenerTodosLosCierres: async (desde, hasta) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT id, fecha, total_ingresos, total_gastos, saldo_neto, cerrado_por
       FROM cierres_caja WHERE substr(fecha,1,10) BETWEEN ? AND ? ORDER BY fecha DESC`,
      [desde, hasta]
    )
    return rows.map(mapCierre)
  },

  obtenerTodosLosGastos: async (desde, hasta) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT id, fecha, categoria, monto, descripcion
       FROM gastos_operativos WHERE substr(fecha,1,10) BETWEEN ? AND ? ORDER BY fecha DESC`,
      [desde, hasta]
    )
    return rows.map(mapGasto)
  },
}))
