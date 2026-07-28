import { create } from 'zustand'
import { getDb } from '../db'
import type { UnidadMedida } from '../types/inventario'

export interface VentaResumen {
  id: number
  numero: number
  fecha: string
  totalFinal: number
  cantidadItems: number
}

export interface ProductoTop {
  productoNombre: string
  cantidad: number
  // Nombres agrupan la SUM(cantidad); si el mismo nombre correspondiera a productos con
  // unidades distintas (caso borde no esperado en la práctica) esto toma una sola.
  unidadMedida: UnidadMedida
  facturacion: number
}

const PAGE = 10

interface ReporteVentasStore {
  cargando: boolean
  totalFacturado: number
  cantidadVentas: number
  ticketPromedio: number
  topPorCantidad: ProductoTop[]
  topPorFacturacion: ProductoTop[]
  ventas: VentaResumen[]
  totalVentas: number

  cargarReporte: (desde: string, hasta: string, pagina: number) => Promise<void>
  obtenerTodasLasVentas: (desde: string, hasta: string) => Promise<VentaResumen[]>
}

const mapVenta = (r: any): VentaResumen => ({
  id: r.id, numero: r.numero, fecha: r.fecha, totalFinal: r.total_final, cantidadItems: r.cantidad_items,
})

export const useReporteVentasStore = create<ReporteVentasStore>((set) => ({
  cargando: false,
  totalFacturado: 0,
  cantidadVentas: 0,
  ticketPromedio: 0,
  topPorCantidad: [],
  topPorFacturacion: [],
  ventas: [],
  totalVentas: 0,

  cargarReporte: async (desde, hasta, pagina) => {
    set({ cargando: true })
    try {
      const db = await getDb()

      const resumenRows = await db.select<{ total: number | null; cantidad: number }[]>(
        `SELECT COALESCE(SUM(total_final), 0) as total, COUNT(*) as cantidad
         FROM ventas_pos WHERE substr(fecha,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const totalFacturado = resumenRows[0]?.total ?? 0
      const cantidadVentas = resumenRows[0]?.cantidad ?? 0

      const ventasRows = await db.select<any[]>(
        `SELECT v.id, v.numero, v.fecha, v.total_final,
           (SELECT COALESCE(SUM(i.cantidad), 0) FROM items_venta_pos i WHERE i.venta_id = v.id) as cantidad_items
         FROM ventas_pos v
         WHERE substr(v.fecha,1,10) BETWEEN ? AND ?
         ORDER BY v.fecha DESC
         LIMIT ${PAGE} OFFSET ${pagina * PAGE}`,
        [desde, hasta]
      )

      // LEFT JOIN productos solo para mostrar la unidad — no afecta el agrupado ni las sumas.
      const topPorCantidadRows = await db.select<any[]>(
        `SELECT i.nombre as producto_nombre, SUM(i.cantidad) as cantidad, SUM(i.subtotal) as facturacion,
                MAX(p.unidad_medida) as unidad_medida
         FROM items_venta_pos i JOIN ventas_pos v ON i.venta_id = v.id LEFT JOIN productos p ON i.producto_id = p.id
         WHERE substr(v.fecha,1,10) BETWEEN ? AND ?
         GROUP BY i.nombre ORDER BY cantidad DESC LIMIT 5`,
        [desde, hasta]
      )
      const topPorFacturacionRows = await db.select<any[]>(
        `SELECT i.nombre as producto_nombre, SUM(i.cantidad) as cantidad, SUM(i.subtotal) as facturacion,
                MAX(p.unidad_medida) as unidad_medida
         FROM items_venta_pos i JOIN ventas_pos v ON i.venta_id = v.id LEFT JOIN productos p ON i.producto_id = p.id
         WHERE substr(v.fecha,1,10) BETWEEN ? AND ?
         GROUP BY i.nombre ORDER BY facturacion DESC LIMIT 5`,
        [desde, hasta]
      )

      const mapTop = (r: any): ProductoTop => ({
        productoNombre: r.producto_nombre, cantidad: r.cantidad,
        unidadMedida: (r.unidad_medida ?? 'unidad') as UnidadMedida, facturacion: r.facturacion,
      })

      set({
        totalFacturado,
        cantidadVentas,
        ticketPromedio: cantidadVentas > 0 ? totalFacturado / cantidadVentas : 0,
        topPorCantidad: topPorCantidadRows.map(mapTop),
        topPorFacturacion: topPorFacturacionRows.map(mapTop),
        ventas: ventasRows.map(mapVenta),
        totalVentas: cantidadVentas,
        cargando: false,
      })
    } catch (e) {
      console.error('cargarReporte', e)
      set({ cargando: false })
    }
  },

  // Detalle completo del período (sin paginar) — usado solo al generar el PDF.
  obtenerTodasLasVentas: async (desde, hasta) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT v.id, v.numero, v.fecha, v.total_final,
         (SELECT COALESCE(SUM(i.cantidad), 0) FROM items_venta_pos i WHERE i.venta_id = v.id) as cantidad_items
       FROM ventas_pos v
       WHERE substr(v.fecha,1,10) BETWEEN ? AND ?
       ORDER BY v.fecha DESC`,
      [desde, hasta]
    )
    return rows.map(mapVenta)
  },
}))
