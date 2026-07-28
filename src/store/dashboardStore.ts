import { create } from 'zustand'
import { getDb } from '../db'
import { ESTADOS_OT, type EstadoOT, type OrdenTrabajo } from '../types/ordenesTrabajo'
import { MESES } from '../types/caja'
import type { Producto } from '../types/inventario'

const UMBRAL_SIN_MOVIMIENTO = 3   // días
const SATURACION = 6              // OTs activas → saturado
const ESTADOS_ACTIVOS: EstadoOT[] = ['recepcion', 'en_proceso', 'finalizado']

export type NivelCarga = 'libre' | 'moderado' | 'saturado'

export interface CargaEmpleado {
  empleadoId: number
  nombre: string
  otsActivas: number
  nivel: NivelCarga
}

export interface DashboardData {
  otsPorEstado: { estado: EstadoOT; count: number; label: string; color: string }[]
  otsSinMovimiento: OrdenTrabajo[]
  otsActivasPorEstado: Record<EstadoOT, OrdenTrabajo[]>
  totalOTsActivas: number
  itemsStockCritico: Producto[]
  ingresosHoy: number
  cobrosHoy: number
  saldoNetoHoy: number
  cargaPorEmpleado: CargaEmpleado[]
  presupuestosVencidos: number
  garantiasProximasVencer: number
}

export interface PuntoComparativo {
  label: string
  ingresos: number
  gastos: number
  otsCompletadas: number
  ticketPromedio: number
}

export interface EstadoSaludData {
  periodo: { desde: string; hasta: string; label: string }
  ingresos: number
  egresos: number
  margenOperativo: number
  margenPorcentaje: number
  otsCompletadas: number
  otsCanceladas: number
  tasaCancelacion: number
  productoMasVendido: { nombre: string; unidades: number } | null
  clienteMasActivo: { nombre: string; ots: number } | null
  empleadoDestacado: { nombre: string; ots: number } | null
  ticketPromedio: number
}

export type PeriodoSalud = 'mes_actual' | 'mes_anterior' | 'personalizado'

type Db = Awaited<ReturnType<typeof getDb>>

// ─── Helpers de fecha ──────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ultimoDia = (anio: number, mes: number) => new Date(anio, mes, 0).getDate() // mes 1-based

function rangoMes(anio: number, mes: number) {
  const desde = `${anio}-${pad(mes)}-01`
  const hasta = `${anio}-${pad(mes)}-${pad(ultimoDia(anio, mes))}`
  return { desde, hasta, label: `${MESES[mes - 1]} ${anio}` }
}

const diasDiff = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

const mapOT = (r: any): OrdenTrabajo => ({
  id: r.id, numero: r.numero, clienteId: r.cliente_id, clienteNombre: r.cliente_nombre ?? '',
  empleadoId: r.empleado_id ?? null, empleadoNombre: r.empleado_nombre ?? null,
  productoId: r.producto_id, tipoItem: r.tipo_item, productoNombre: r.producto_nombre,
  descripcion: r.descripcion ?? null, estado: r.estado, descuento: r.descuento ?? 0,
  tipoDescuento: (r.tipo_descuento ?? 'porcentaje'), precio: r.precio, totalFinal: r.total_final,
  motivoCancelacion: r.motivo_cancelacion ?? null, notas: r.notas ?? null,
  presupuestoId: r.presupuesto_id ?? null, esRecurrente: r.es_recurrente === 1,
  frecuencia: r.frecuencia ?? null, proximaFecha: r.proxima_fecha ?? null,
  garantiaDias: r.garantia_dias ?? 0, garantiaVence: r.garantia_vence ?? null,
  creadoPor: r.creado_por, creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
  etiquetas: [], diasSinMovimiento: diasDiff(r.actualizado_en),
})

const mapProducto = (r: any): Producto => ({
  id: r.id, nombre: r.nombre, tipo: r.tipo, descripcion: r.descripcion ?? '',
  categoriaId: r.categoria_id ?? null, categoriaNombre: '', precio: r.precio,
  precioCosto: r.precio_costo ?? 0, monedaCosto: r.moneda_costo ?? 'ARS',
  codigoSku: r.codigo_sku ?? '',
  stock: r.stock ?? 0, stockMinimo: r.stock_minimo ?? 0, imagen: r.imagen ?? null,
  trazabilidad: r.trazabilidad ?? 'ninguna', unidadMedida: r.unidad_medida ?? 'unidad', activo: r.activo === 1,
  creadoEn: r.creado_en, actualizadoEn: r.actualizado_en,
})

const nivelDe = (n: number): NivelCarga => (n >= SATURACION ? 'saturado' : n >= 3 ? 'moderado' : 'libre')

// Datos agregados de un rango (para el comparativo)
async function datosRango(db: Db, desde: string, hasta: string, label: string): Promise<PuntoComparativo> {
  const cob = await db.select<{ total: number | null; n: number }[]>(
    `SELECT COALESCE(SUM(monto),0) as total, COUNT(*) as n FROM cobros_caja WHERE substr(fecha,1,10) BETWEEN ? AND ?`, [desde, hasta])
  const gas = await db.select<{ total: number | null }[]>(
    `SELECT COALESCE(SUM(monto),0) as total FROM gastos_operativos WHERE substr(fecha,1,10) BETWEEN ? AND ?`, [desde, hasta])
  const ots = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) as n FROM ordenes_trabajo WHERE substr(creado_en,1,10) BETWEEN ? AND ? AND estado IN ('finalizado','entregado')`, [desde, hasta])
  const ingresos = cob[0]?.total ?? 0
  const n = cob[0]?.n ?? 0
  return {
    label,
    ingresos,
    gastos: gas[0]?.total ?? 0,
    otsCompletadas: ots[0]?.n ?? 0,
    ticketPromedio: n > 0 ? Math.round(ingresos / n) : 0,
  }
}

interface DashboardStore {
  data: DashboardData | null
  salud: EstadoSaludData | null
  comparativo: { actual: PuntoComparativo; anterior: PuntoComparativo } | null
  loading: boolean
  loadingSalud: boolean
  lastLoaded: number | null

  esReciente: () => boolean
  cargarDashboard: (force?: boolean) => Promise<void>
  cargarEstadoSalud: (periodo: PeriodoSalud, desde?: string, hasta?: string) => Promise<void>
}

export const useDashboardStore = create<DashboardStore>((set, get) => ({
  data: null,
  salud: null,
  comparativo: null,
  loading: false,
  loadingSalud: false,
  lastLoaded: null,

  esReciente: () => {
    const ll = get().lastLoaded
    return ll != null && Date.now() - ll < 5 * 60 * 1000
  },

  cargarDashboard: async (force = false) => {
    if (!force && get().data && get().esReciente()) return
    set({ loading: true })
    try {
      const db = await getDb()
      const hoy = ymd(new Date())

      // OTs por estado
      const estadoRows = await db.select<{ estado: EstadoOT; c: number }[]>(
        `SELECT estado, COUNT(*) as c FROM ordenes_trabajo GROUP BY estado`)
      const countPorEstado = new Map<string, number>()
      estadoRows.forEach(r => countPorEstado.set(r.estado, r.c))
      const otsPorEstado = ESTADOS_OT.map(e => ({
        estado: e.value, label: e.label, color: e.color, count: countPorEstado.get(e.value) ?? 0,
      }))

      // OTs activas (con datos) por estado
      const activasRows = await db.select<any[]>(
        `SELECT o.*, c.nombre as cliente_nombre, e.nombre as empleado_nombre
         FROM ordenes_trabajo o
         LEFT JOIN clientes c ON o.cliente_id = c.id
         LEFT JOIN empleados e ON o.empleado_id = e.id
         WHERE o.estado IN ('recepcion','en_proceso','finalizado','entregado')
         ORDER BY o.actualizado_en ASC`)
      const activas = activasRows.map(mapOT)
      const otsActivasPorEstado = {
        recepcion: [], en_proceso: [], finalizado: [], entregado: [], cancelado: [],
      } as Record<EstadoOT, OrdenTrabajo[]>
      activas.forEach(o => { otsActivasPorEstado[o.estado]?.push(o) })

      const totalOTsActivas = activas.filter(o => ESTADOS_ACTIVOS.includes(o.estado)).length
      const otsSinMovimiento = activas
        .filter(o => ESTADOS_ACTIVOS.includes(o.estado) && o.diasSinMovimiento > UMBRAL_SIN_MOVIMIENTO)
        .sort((a, b) => b.diasSinMovimiento - a.diasSinMovimiento)

      // Stock crítico
      const stockRows = await db.select<any[]>(
        `SELECT * FROM productos WHERE tipo = 'simple' AND activo = 1 AND stock <= stock_minimo ORDER BY stock ASC`)
      const itemsStockCritico = stockRows.map(mapProducto)

      // Caja hoy
      const cob = await db.select<{ total: number | null; n: number }[]>(
        `SELECT COALESCE(SUM(monto),0) as total, COUNT(*) as n FROM cobros_caja WHERE substr(fecha,1,10) = ?`, [hoy])
      const gas = await db.select<{ total: number | null }[]>(
        `SELECT COALESCE(SUM(monto),0) as total FROM gastos_operativos WHERE substr(fecha,1,10) = ?`, [hoy])
      const ingresosHoy = cob[0]?.total ?? 0
      const cobrosHoy = cob[0]?.n ?? 0
      const saldoNetoHoy = ingresosHoy - (gas[0]?.total ?? 0)

      // Carga por empleado
      const empRows = await db.select<any[]>(`SELECT id, nombre FROM empleados WHERE activo = 1 ORDER BY nombre ASC`)
      const cargaRows = await db.select<{ empleado_id: number; c: number }[]>(
        `SELECT empleado_id, COUNT(*) as c FROM ordenes_trabajo
         WHERE empleado_id IS NOT NULL AND estado IN ('recepcion','en_proceso','finalizado') GROUP BY empleado_id`)
      const cargaMap = new Map<number, number>()
      cargaRows.forEach(r => cargaMap.set(r.empleado_id, r.c))
      const cargaPorEmpleado: CargaEmpleado[] = empRows.map(e => {
        const otsActivas = cargaMap.get(e.id) ?? 0
        return { empleadoId: e.id, nombre: e.nombre, otsActivas, nivel: nivelDe(otsActivas) }
      }).sort((a, b) => b.otsActivas - a.otsActivas)

      // Presupuestos vencidos
      const pv = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM presupuestos WHERE estado = 'enviado' AND fecha_vigencia IS NOT NULL AND fecha_vigencia < ?`,
        [new Date().toISOString()])
      const presupuestosVencidos = pv[0]?.n ?? 0

      // Garantías próximas a vencer (≤7 días)
      const limite = new Date(Date.now() + 7 * 86400000).toISOString()
      const ahora = new Date().toISOString()
      const gar = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM garantias WHERE activa = 1 AND fecha_vence >= ? AND fecha_vence <= ?`, [ahora, limite])
      const garantiasProximasVencer = gar[0]?.n ?? 0

      set({
        data: {
          otsPorEstado, otsSinMovimiento, otsActivasPorEstado, totalOTsActivas,
          itemsStockCritico, ingresosHoy, cobrosHoy, saldoNetoHoy,
          cargaPorEmpleado, presupuestosVencidos, garantiasProximasVencer,
        },
        loading: false,
        lastLoaded: Date.now(),
      })
    } catch (e) {
      console.error('cargarDashboard', e)
      set({ loading: false })
    }
  },

  cargarEstadoSalud: async (periodo, desdeArg, hastaArg) => {
    set({ loadingSalud: true })
    try {
      const db = await getDb()
      const now = new Date()

      let rango: { desde: string; hasta: string; label: string }
      let rangoAnterior: { desde: string; hasta: string; label: string }

      if (periodo === 'mes_actual') {
        rango = rangoMes(now.getFullYear(), now.getMonth() + 1)
        const ant = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        rangoAnterior = rangoMes(ant.getFullYear(), ant.getMonth() + 1)
      } else if (periodo === 'mes_anterior') {
        const ant = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        rango = rangoMes(ant.getFullYear(), ant.getMonth() + 1)
        const ant2 = new Date(now.getFullYear(), now.getMonth() - 2, 1)
        rangoAnterior = rangoMes(ant2.getFullYear(), ant2.getMonth() + 1)
      } else {
        const desde = desdeArg || ymd(new Date(now.getFullYear(), now.getMonth(), 1))
        const hasta = hastaArg || ymd(now)
        rango = { desde, hasta, label: `${desde} a ${hasta}` }
        // Período anterior equivalente (mismo largo, justo antes)
        const dDesde = new Date(desde + 'T00:00:00')
        const dHasta = new Date(hasta + 'T00:00:00')
        const largoMs = dHasta.getTime() - dDesde.getTime()
        const antHasta = new Date(dDesde.getTime() - 86400000)
        const antDesde = new Date(antHasta.getTime() - largoMs)
        rangoAnterior = { desde: ymd(antDesde), hasta: ymd(antHasta), label: `${ymd(antDesde)} a ${ymd(antHasta)}` }
      }

      const { desde, hasta } = rango

      const cob = await db.select<{ total: number | null; n: number }[]>(
        `SELECT COALESCE(SUM(monto),0) as total, COUNT(*) as n FROM cobros_caja WHERE substr(fecha,1,10) BETWEEN ? AND ?`, [desde, hasta])
      const gas = await db.select<{ total: number | null }[]>(
        `SELECT COALESCE(SUM(monto),0) as total FROM gastos_operativos WHERE substr(fecha,1,10) BETWEEN ? AND ?`, [desde, hasta])
      const ingresos = cob[0]?.total ?? 0
      const egresos = gas[0]?.total ?? 0
      const margenOperativo = ingresos - egresos
      const margenPorcentaje = ingresos > 0 ? Math.round((margenOperativo / ingresos) * 100) : 0
      const nCobros = cob[0]?.n ?? 0
      const ticketPromedio = nCobros > 0 ? Math.round(ingresos / nCobros) : 0

      const comp = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM ordenes_trabajo WHERE substr(creado_en,1,10) BETWEEN ? AND ? AND estado IN ('finalizado','entregado')`, [desde, hasta])
      const canc = await db.select<{ n: number }[]>(
        `SELECT COUNT(*) as n FROM ordenes_trabajo WHERE substr(creado_en,1,10) BETWEEN ? AND ? AND estado = 'cancelado'`, [desde, hasta])
      const otsCompletadas = comp[0]?.n ?? 0
      const otsCanceladas = canc[0]?.n ?? 0
      const totalOTs = otsCompletadas + otsCanceladas
      const tasaCancelacion = totalOTs > 0 ? Math.round((otsCanceladas / totalOTs) * 100) : 0

      const prod = await db.select<{ nombre: string; u: number }[]>(
        `SELECT p.nombre as nombre, SUM(m.cantidad) as u FROM movimientos_stock m
         JOIN productos p ON p.id = m.producto_id
         WHERE m.tipo = 'salida' AND substr(m.fecha,1,10) BETWEEN ? AND ?
         GROUP BY m.producto_id ORDER BY u DESC LIMIT 1`, [desde, hasta])
      const cli = await db.select<{ nombre: string; n: number }[]>(
        `SELECT c.nombre as nombre, COUNT(*) as n FROM ordenes_trabajo o
         JOIN clientes c ON c.id = o.cliente_id
         WHERE substr(o.creado_en,1,10) BETWEEN ? AND ? GROUP BY o.cliente_id ORDER BY n DESC LIMIT 1`, [desde, hasta])
      const emp = await db.select<{ nombre: string; n: number }[]>(
        `SELECT e.nombre as nombre, COUNT(*) as n FROM ordenes_trabajo o
         JOIN empleados e ON e.id = o.empleado_id
         WHERE substr(o.creado_en,1,10) BETWEEN ? AND ? AND o.estado IN ('finalizado','entregado')
         GROUP BY o.empleado_id ORDER BY n DESC LIMIT 1`, [desde, hasta])

      const salud: EstadoSaludData = {
        periodo: rango,
        ingresos, egresos, margenOperativo, margenPorcentaje,
        otsCompletadas, otsCanceladas, tasaCancelacion,
        productoMasVendido: prod[0] ? { nombre: prod[0].nombre, unidades: prod[0].u } : null,
        clienteMasActivo: cli[0] ? { nombre: cli[0].nombre, ots: cli[0].n } : null,
        empleadoDestacado: emp[0] ? { nombre: emp[0].nombre, ots: emp[0].n } : null,
        ticketPromedio,
      }

      const actual = await datosRango(db, desde, hasta, rango.label)
      const anterior = await datosRango(db, rangoAnterior.desde, rangoAnterior.hasta, rangoAnterior.label)

      set({ salud, comparativo: { actual, anterior }, loadingSalud: false })
    } catch (e) {
      console.error('cargarEstadoSalud', e)
      set({ loadingSalud: false })
    }
  },
}))
