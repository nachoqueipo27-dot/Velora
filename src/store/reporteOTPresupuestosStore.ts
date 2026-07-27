import { create } from 'zustand'
import { getDb } from '../db'
import { ESTADOS_OT, type EstadoOT } from '../types/ordenesTrabajo'

export interface OTDetalleResumen {
  id: number
  numero: number
  fecha: string
  clienteNombre: string
  estado: EstadoOT
  totalFinal: number
}

export interface OTPorEstado {
  estado: EstadoOT
  label: string
  color: string
  cantidad: number
}

const PAGE = 10

interface ReporteOTPresupuestosStore {
  cargando: boolean
  otsPorEstado: OTPorEstado[]
  otsCompletadas: number
  facturacionOTs: number
  presupuestosCreados: number
  presupuestosAprobados: number
  tasaAprobacion: number
  montoPresupuestado: number
  montoAprobado: number
  otsDetalle: OTDetalleResumen[]
  totalOTs: number

  cargarReporte: (desde: string, hasta: string, pagina: number) => Promise<void>
  obtenerTodasLasOTs: (desde: string, hasta: string) => Promise<OTDetalleResumen[]>
}

const mapOTDetalle = (r: any): OTDetalleResumen => ({
  id: r.id, numero: r.numero, fecha: r.creado_en, clienteNombre: r.cliente_nombre, estado: r.estado, totalFinal: r.total_final,
})

export const useReporteOTPresupuestosStore = create<ReporteOTPresupuestosStore>((set) => ({
  cargando: false,
  otsPorEstado: [],
  otsCompletadas: 0,
  facturacionOTs: 0,
  presupuestosCreados: 0,
  presupuestosAprobados: 0,
  tasaAprobacion: 0,
  montoPresupuestado: 0,
  montoAprobado: 0,
  otsDetalle: [],
  totalOTs: 0,

  cargarReporte: async (desde, hasta, pagina) => {
    set({ cargando: true })
    try {
      const db = await getDb()

      // OTs por estado, filtradas por fecha de creación — mismo campo (creado_en) que usa dashboardStore/cajaStore
      const estadoRows = await db.select<{ estado: EstadoOT; n: number }[]>(
        `SELECT estado, COUNT(*) as n FROM ordenes_trabajo WHERE substr(creado_en,1,10) BETWEEN ? AND ? GROUP BY estado`,
        [desde, hasta]
      )
      const otsPorEstado: OTPorEstado[] = ESTADOS_OT.map(e => ({
        estado: e.value, label: e.label, color: e.color,
        cantidad: estadoRows.find(r => r.estado === e.value)?.n ?? 0,
      }))

      // Completadas y facturación — mismo criterio que dashboardStore/cajaStore: estado IN ('finalizado','entregado')
      // No existe un campo de fecha de cierre en el schema, por lo que "tiempo promedio de cierre" no se puede calcular
      // sin inventar un campo (ver reporte final).
      const completadasRows = await db.select<{ n: number; total: number | null }[]>(
        `SELECT COUNT(*) as n, COALESCE(SUM(total_final),0) as total FROM ordenes_trabajo
         WHERE substr(creado_en,1,10) BETWEEN ? AND ? AND estado IN ('finalizado','entregado')`,
        [desde, hasta]
      )
      const otsCompletadas = completadasRows[0]?.n ?? 0
      const facturacionOTs = completadasRows[0]?.total ?? 0

      // Presupuestos del período — "aprobado" incluye 'convertido' porque solo se llega a 'convertido' desde 'aprobado'
      const presupuestosRows = await db.select<{ n: number; aprobados: number; montoTotal: number | null; montoAprobado: number | null }[]>(
        `SELECT
           COUNT(*) as n,
           SUM(CASE WHEN estado IN ('aprobado','convertido') THEN 1 ELSE 0 END) as aprobados,
           COALESCE(SUM(total_final),0) as montoTotal,
           COALESCE(SUM(CASE WHEN estado IN ('aprobado','convertido') THEN total_final ELSE 0 END),0) as montoAprobado
         FROM presupuestos WHERE substr(creado_en,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const presupuestosCreados = presupuestosRows[0]?.n ?? 0
      const presupuestosAprobados = presupuestosRows[0]?.aprobados ?? 0
      const montoPresupuestado = presupuestosRows[0]?.montoTotal ?? 0
      const montoAprobado = presupuestosRows[0]?.montoAprobado ?? 0
      const tasaAprobacion = presupuestosCreados > 0 ? Math.round((presupuestosAprobados / presupuestosCreados) * 100) : 0

      const totalRows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM ordenes_trabajo WHERE substr(creado_en,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const totalOTs = totalRows[0]?.n ?? 0

      const detalleRows = await db.select<any[]>(
        `SELECT o.id, o.numero, o.creado_en, c.nombre as cliente_nombre, o.estado, o.total_final
         FROM ordenes_trabajo o JOIN clientes c ON o.cliente_id = c.id
         WHERE substr(o.creado_en,1,10) BETWEEN ? AND ?
         ORDER BY o.creado_en DESC LIMIT ${PAGE} OFFSET ${pagina * PAGE}`,
        [desde, hasta]
      )

      set({
        otsPorEstado, otsCompletadas, facturacionOTs,
        presupuestosCreados, presupuestosAprobados, tasaAprobacion, montoPresupuestado, montoAprobado,
        otsDetalle: detalleRows.map(mapOTDetalle), totalOTs,
        cargando: false,
      })
    } catch (e) {
      console.error('cargarReporte', e)
      set({ cargando: false })
    }
  },

  // Detalle completo del período (sin paginar) — usado solo al generar el PDF.
  obtenerTodasLasOTs: async (desde, hasta) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT o.id, o.numero, o.creado_en, c.nombre as cliente_nombre, o.estado, o.total_final
       FROM ordenes_trabajo o JOIN clientes c ON o.cliente_id = c.id
       WHERE substr(o.creado_en,1,10) BETWEEN ? AND ? ORDER BY o.creado_en DESC`,
      [desde, hasta]
    )
    return rows.map(mapOTDetalle)
  },
}))
