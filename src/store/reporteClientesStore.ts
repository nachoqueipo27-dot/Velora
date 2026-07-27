import { create } from 'zustand'
import { format, subDays } from 'date-fns'
import { getDb } from '../db'

export interface ClienteRanking {
  clienteId: number
  nombre: string
  facturacion: number
  operaciones: number
}

export interface ClienteInactivo {
  id: number
  nombre: string
  telefono: string | null
  email: string | null
  ultimaOperacion: string | null
}

export interface ClienteDetalle {
  id: number
  nombre: string
  categoria: string | null
  creadoEn: string
  facturacion: number
}

const PAGE = 10

// Un cliente se considera inactivo si no registra ninguna operación (OT o presupuesto)
// en los últimos 90 días. Mismo criterio de constante documentada que DIAS_ESTANCADO
// en el reporte de Inventario.
const DIAS_INACTIVO = 90

// Fuentes de facturación vinculables a un cliente.
// - ordenes_trabajo: tiene cliente_id. Se cuentan las facturables (finalizado/entregado),
//   mismo criterio que ya usan dashboardStore, cajaStore y el reporte de OT y Presupuestos.
// - presupuestos convertidos: SOLO los que no generaron OT (ot_id IS NULL). Al convertir un
//   presupuesto, crearOTDesdePresupuesto() copia total_final a la OT nueva, así que sumar ambos
//   contaría el mismo dinero dos veces.
// - ventas_pos NO participa: la tabla no tiene cliente_id, no hay forma de vincular una venta
//   de mostrador a un cliente sin inventar la relación.
const FACTURACION_SUB = `
  SELECT cliente_id, total_final as monto, creado_en FROM ordenes_trabajo
   WHERE estado IN ('finalizado','entregado')
  UNION ALL
  SELECT cliente_id, total_final as monto, creado_en FROM presupuestos
   WHERE estado = 'convertido' AND ot_id IS NULL
`

// Un cliente "del período" es el que se dio de alta en el rango o tuvo al menos una
// operación (OT o presupuesto) dentro del rango.
const FILTRO_CLIENTES_PERIODO = `
  substr(c.creado_en,1,10) BETWEEN ? AND ?
  OR EXISTS (SELECT 1 FROM ordenes_trabajo o WHERE o.cliente_id = c.id AND substr(o.creado_en,1,10) BETWEEN ? AND ?)
  OR EXISTS (SELECT 1 FROM presupuestos p WHERE p.cliente_id = c.id AND substr(p.creado_en,1,10) BETWEEN ? AND ?)
`

interface ReporteClientesStore {
  cargando: boolean
  clientesNuevos: number
  totalFacturado: number
  ranking: ClienteRanking[]
  inactivos: ClienteInactivo[]
  clientes: ClienteDetalle[]
  totalClientes: number

  cargarReporte: (desde: string, hasta: string, pagina: number) => Promise<void>
  obtenerTodosLosClientes: (desde: string, hasta: string) => Promise<ClienteDetalle[]>
}

const mapDetalle = (r: any): ClienteDetalle => ({
  id: r.id, nombre: r.nombre, categoria: r.categoria ?? null, creadoEn: r.creado_en, facturacion: r.facturacion,
})

export const useReporteClientesStore = create<ReporteClientesStore>((set) => ({
  cargando: false,
  clientesNuevos: 0,
  totalFacturado: 0,
  ranking: [],
  inactivos: [],
  clientes: [],
  totalClientes: 0,

  cargarReporte: async (desde, hasta, pagina) => {
    set({ cargando: true })
    try {
      const db = await getDb()

      // ── Clientes nuevos (por fecha de alta) ─────────────────────
      const nuevosRows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM clientes WHERE substr(creado_en,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const clientesNuevos = nuevosRows[0]?.n ?? 0

      // ── Facturación del período ─────────────────────────────────
      const totalRows = await db.select<{ total: number | null }[]>(
        `SELECT COALESCE(SUM(monto), 0) as total FROM (${FACTURACION_SUB})
         WHERE substr(creado_en,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const totalFacturado = totalRows[0]?.total ?? 0

      const rankingRows = await db.select<any[]>(
        `SELECT f.cliente_id, c.nombre, SUM(f.monto) as facturacion, COUNT(*) as operaciones
         FROM (${FACTURACION_SUB}) f JOIN clientes c ON c.id = f.cliente_id
         WHERE substr(f.creado_en,1,10) BETWEEN ? AND ?
         GROUP BY f.cliente_id, c.nombre
         ORDER BY facturacion DESC LIMIT 10`,
        [desde, hasta]
      )
      const ranking: ClienteRanking[] = rankingRows.map(r => ({
        clienteId: r.cliente_id, nombre: r.nombre, facturacion: r.facturacion, operaciones: r.operaciones,
      }))

      // ── Clientes inactivos ──────────────────────────────────────
      // No depende del rango del reporte: es una foto de "hoy hacia atrás 90 días".
      const desdeInactivo = format(subDays(new Date(), DIAS_INACTIVO), 'yyyy-MM-dd')
      const inactivosRows = await db.select<any[]>(
        `SELECT c.id, c.nombre, c.telefono, c.email,
                MAX(
                  COALESCE((SELECT MAX(creado_en) FROM ordenes_trabajo WHERE cliente_id = c.id), ''),
                  COALESCE((SELECT MAX(creado_en) FROM presupuestos  WHERE cliente_id = c.id), '')
                ) as ultima_operacion
         FROM clientes c
         WHERE NOT EXISTS (SELECT 1 FROM ordenes_trabajo o WHERE o.cliente_id = c.id AND substr(o.creado_en,1,10) >= ?)
           AND NOT EXISTS (SELECT 1 FROM presupuestos  p WHERE p.cliente_id = c.id AND substr(p.creado_en,1,10) >= ?)
         ORDER BY c.nombre ASC`,
        [desdeInactivo, desdeInactivo]
      )
      const inactivos: ClienteInactivo[] = inactivosRows.map(r => ({
        id: r.id, nombre: r.nombre, telefono: r.telefono ?? null, email: r.email ?? null,
        ultimaOperacion: r.ultima_operacion ? r.ultima_operacion : null,
      }))

      // ── Detalle de clientes del período (paginado) ──────────────
      const totalClientesRows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM clientes c WHERE ${FILTRO_CLIENTES_PERIODO}`,
        [desde, hasta, desde, hasta, desde, hasta]
      )
      const totalClientes = totalClientesRows[0]?.n ?? 0

      const clientesRows = await db.select<any[]>(
        `SELECT c.id, c.nombre, c.categoria, c.creado_en, COALESCE(f.total, 0) as facturacion
         FROM clientes c
         LEFT JOIN (
           SELECT cliente_id, SUM(monto) as total FROM (${FACTURACION_SUB})
           WHERE substr(creado_en,1,10) BETWEEN ? AND ? GROUP BY cliente_id
         ) f ON f.cliente_id = c.id
         WHERE ${FILTRO_CLIENTES_PERIODO}
         ORDER BY facturacion DESC, c.nombre ASC
         LIMIT ${PAGE} OFFSET ${pagina * PAGE}`,
        [desde, hasta, desde, hasta, desde, hasta, desde, hasta]
      )

      set({
        clientesNuevos, totalFacturado, ranking, inactivos,
        clientes: clientesRows.map(mapDetalle), totalClientes,
        cargando: false,
      })
    } catch (e) {
      console.error('cargarReporte', e)
      set({ cargando: false })
    }
  },

  // Detalle completo del período (sin paginar) — usado solo al generar el PDF.
  obtenerTodosLosClientes: async (desde, hasta) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT c.id, c.nombre, c.categoria, c.creado_en, COALESCE(f.total, 0) as facturacion
       FROM clientes c
       LEFT JOIN (
         SELECT cliente_id, SUM(monto) as total FROM (${FACTURACION_SUB})
         WHERE substr(creado_en,1,10) BETWEEN ? AND ? GROUP BY cliente_id
       ) f ON f.cliente_id = c.id
       WHERE ${FILTRO_CLIENTES_PERIODO}
       ORDER BY facturacion DESC, c.nombre ASC`,
      [desde, hasta, desde, hasta, desde, hasta, desde, hasta]
    )
    return rows.map(mapDetalle)
  },
}))
