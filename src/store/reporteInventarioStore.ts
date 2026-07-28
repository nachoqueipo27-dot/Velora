import { create } from 'zustand'
import { format, subDays } from 'date-fns'
import { getDb } from '../db'
import type { UnidadMedida } from '../types/inventario'

export interface MovimientoStockResumen {
  id: number
  fecha: string
  productoNombre: string
  tipo: string
  cantidad: number
  unidadMedida: UnidadMedida
  motivo: string | null
}

const PAGE = 10
const DIAS_ESTANCADO = 90

interface ReporteInventarioStore {
  cargando: boolean
  productosStockCritico: number
  valorizacionInventario: number
  productosStockEstancado: number
  movimientosEntrada: number
  movimientosSalida: number
  movimientos: MovimientoStockResumen[]
  totalMovimientos: number

  cargarReporte: (desde: string, hasta: string, pagina: number) => Promise<void>
  obtenerTodosLosMovimientos: (desde: string, hasta: string) => Promise<MovimientoStockResumen[]>
}

const mapMovimiento = (r: any): MovimientoStockResumen => ({
  id: r.id, fecha: r.fecha, productoNombre: r.producto_nombre, tipo: r.tipo, cantidad: r.cantidad,
  unidadMedida: (r.unidad_medida ?? 'unidad') as UnidadMedida, motivo: r.motivo ?? null,
})

export const useReporteInventarioStore = create<ReporteInventarioStore>((set) => ({
  cargando: false,
  productosStockCritico: 0,
  valorizacionInventario: 0,
  productosStockEstancado: 0,
  movimientosEntrada: 0,
  movimientosSalida: 0,
  movimientos: [],
  totalMovimientos: 0,

  cargarReporte: async (desde, hasta, pagina) => {
    set({ cargando: true })
    try {
      const db = await getDb()

      // Estado actual — foto de ahora mismo, no depende del rango de fechas.
      // Mismo criterio que useDashboardStore (tipo='simple' + activo=1 + stock <= stock_minimo):
      // los conjuntos no llevan stock propio y los productos inactivos no cuentan.
      const stockCriticoRows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM productos WHERE tipo = 'simple' AND activo = 1 AND stock <= stock_minimo`
      )
      const productosStockCritico = stockCriticoRows[0]?.n ?? 0

      // Valorización a precio de costo (precio_costo) — no al precio de venta, que incluye margen.
      const valorizacionRows = await db.select<{ total: number | null }[]>(
        `SELECT COALESCE(SUM(stock * precio_costo), 0) as total FROM productos WHERE tipo = 'simple' AND activo = 1`
      )
      const valorizacionInventario = valorizacionRows[0]?.total ?? 0

      const haceNDias = format(subDays(new Date(), DIAS_ESTANCADO), 'yyyy-MM-dd')
      const estancadoRows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM productos p
         WHERE p.tipo = 'simple' AND p.activo = 1
         AND NOT EXISTS (
           SELECT 1 FROM movimientos_stock m WHERE m.producto_id = p.id AND substr(m.fecha,1,10) >= ?
         )`,
        [haceNDias]
      )
      const productosStockEstancado = estancadoRows[0]?.n ?? 0

      // Movimientos del período (sí depende del rango de fechas).
      const tipoCountRows = await db.select<{ tipo: string; n: number }[]>(
        `SELECT tipo, COUNT(*) as n FROM movimientos_stock WHERE substr(fecha,1,10) BETWEEN ? AND ? GROUP BY tipo`,
        [desde, hasta]
      )
      const movimientosEntrada = tipoCountRows.find(r => r.tipo === 'entrada')?.n ?? 0
      const movimientosSalida = tipoCountRows.find(r => r.tipo === 'salida')?.n ?? 0

      const totalRows = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM movimientos_stock WHERE substr(fecha,1,10) BETWEEN ? AND ?`,
        [desde, hasta]
      )
      const totalMovimientos = totalRows[0]?.n ?? 0

      const movimientosRows = await db.select<any[]>(
        `SELECT m.id, m.fecha, p.nombre as producto_nombre, p.unidad_medida, m.tipo, m.cantidad, m.motivo
         FROM movimientos_stock m JOIN productos p ON m.producto_id = p.id
         WHERE substr(m.fecha,1,10) BETWEEN ? AND ?
         ORDER BY m.fecha DESC LIMIT ${PAGE} OFFSET ${pagina * PAGE}`,
        [desde, hasta]
      )

      set({
        productosStockCritico,
        valorizacionInventario,
        productosStockEstancado,
        movimientosEntrada,
        movimientosSalida,
        movimientos: movimientosRows.map(mapMovimiento),
        totalMovimientos,
        cargando: false,
      })
    } catch (e) {
      console.error('cargarReporte', e)
      set({ cargando: false })
    }
  },

  // Detalle completo del período (sin paginar) — usado solo al generar el PDF.
  obtenerTodosLosMovimientos: async (desde, hasta) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT m.id, m.fecha, p.nombre as producto_nombre, p.unidad_medida, m.tipo, m.cantidad, m.motivo
       FROM movimientos_stock m JOIN productos p ON m.producto_id = p.id
       WHERE substr(m.fecha,1,10) BETWEEN ? AND ? ORDER BY m.fecha DESC`,
      [desde, hasta]
    )
    return rows.map(mapMovimiento)
  },
}))
