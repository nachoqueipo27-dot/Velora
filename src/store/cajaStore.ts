import { create } from 'zustand'
import { getDb } from '../db'
import { useSessionStore } from './sessionStore'
import { registrarActividad } from '../lib/registrarActividad'
import type {
  CobroCaja, GastoOperativo, ResumenCaja, CierreCaja, CierreMes, ResumenMes,
  DatosComparativo, FormaPago,
} from '../types/caja'

const hoyISO = () => new Date().toISOString().split('T')[0] // YYYY-MM-DD (UTC, consistente con POS)
const padMes = (anio: number, mes: number) => `${anio}-${String(mes).padStart(2, '0')}`

const mapCobro = (r: any): CobroCaja => ({
  id: r.id, fecha: r.fecha, monto: r.monto, formaPago: r.forma_pago,
  concepto: r.concepto ?? null, otId: r.ot_id ?? null,
  ventaPosId: r.venta_pos_id ?? null, empleadoId: r.empleado_id ?? null,
})

const mapGasto = (r: any): GastoOperativo => ({
  id: r.id, fecha: r.fecha, monto: r.monto, categoria: r.categoria,
  descripcion: r.descripcion ?? null, comprobante: r.comprobante ?? null,
  empleadoId: r.empleado_id ?? null,
})

const mapCierre = (r: any): CierreCaja => ({
  id: r.id, fecha: r.fecha, totalEfectivo: r.total_efectivo, totalTransferencia: r.total_transferencia,
  totalTarjeta: r.total_tarjeta, totalIngresos: r.total_ingresos, totalGastos: r.total_gastos,
  saldoNeto: r.saldo_neto, cerradoPor: r.cerrado_por, notas: r.notas ?? null,
})

const mapCierreMes = (r: any): CierreMes => ({
  id: r.id, anio: r.anio, mes: r.mes, totalIngresos: r.total_ingresos, totalGastos: r.total_gastos,
  margenOperativo: r.margen_operativo, otsCompletadas: r.ots_completadas, otsCanceladas: r.ots_canceladas,
  productoMasVendido: r.producto_mas_vendido ?? null, empleadoDestacado: r.empleado_destacado ?? null,
  cerradoPor: r.cerrado_por, creadoEn: r.creado_en,
})

interface AgregarCobroData { monto: number; formaPago: FormaPago; concepto: string }
interface GastoData { monto: number; categoria: string; descripcion?: string; fecha?: string; comprobante?: string }

interface CajaStore {
  cobrosHoy: CobroCaja[]
  gastosHoy: GastoOperativo[]
  resumenHoy: ResumenCaja | null
  cierresCaja: CierreCaja[]
  cierresMes: CierreMes[]
  diaYaCerrado: boolean

  calcularResumen: (cobros: CobroCaja[], gastos: GastoOperativo[]) => ResumenCaja
  cargarCajaHoy: () => Promise<void>
  agregarCobro: (data: AgregarCobroData) => Promise<void>
  eliminarCobro: (id: number) => Promise<void>
  agregarGasto: (data: GastoData) => Promise<void>
  editarGasto: (id: number, data: GastoData) => Promise<void>
  eliminarGasto: (id: number) => Promise<void>
  cerrarCaja: (notas?: string) => Promise<boolean>
  cargarHistorialCierres: () => Promise<void>
  calcularResumenMes: (anio: number, mes: number) => Promise<ResumenMes>
  cerrarMes: (anio: number, mes: number) => Promise<CierreMes | null>
  cargarCierresMes: () => Promise<void>
  mesYaCerrado: (anio: number, mes: number) => boolean
  obtenerDatosComparativo: (
    periodo1: { anio: number; mes: number },
    periodo2: { anio: number; mes: number },
  ) => Promise<{ periodo1: DatosComparativo; periodo2: DatosComparativo }>
}

async function datosDeMes(db: Awaited<ReturnType<typeof getDb>>, anio: number, mes: number): Promise<DatosComparativo> {
  const prefijo = padMes(anio, mes)
  const cobros = await db.select<{ total: number | null; n: number }[]>(
    `SELECT SUM(monto) as total, COUNT(*) as n FROM cobros_caja WHERE substr(fecha,1,7) = ?`, [prefijo]
  )
  const gastos = await db.select<{ total: number | null }[]>(
    `SELECT SUM(monto) as total FROM gastos_operativos WHERE substr(fecha,1,7) = ?`, [prefijo]
  )
  const ots = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) as n FROM ordenes_trabajo WHERE substr(creado_en,1,7) = ? AND estado IN ('finalizado','entregado')`, [prefijo]
  )
  const ingresos = cobros[0]?.total ?? 0
  const nTransacciones = cobros[0]?.n ?? 0
  return {
    ingresos,
    gastos: gastos[0]?.total ?? 0,
    otsCompletadas: ots[0]?.n ?? 0,
    ticketPromedio: nTransacciones > 0 ? Math.round(ingresos / nTransacciones) : 0,
  }
}

export const useCajaStore = create<CajaStore>((set, get) => ({
  cobrosHoy: [],
  gastosHoy: [],
  resumenHoy: null,
  cierresCaja: [],
  cierresMes: [],
  diaYaCerrado: false,

  calcularResumen: (cobros, gastos) => {
    const por = (f: FormaPago) => cobros.filter(c => c.formaPago === f).reduce((s, c) => s + c.monto, 0)
    const totalIngresos = cobros.reduce((s, c) => s + c.monto, 0)
    const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
    return {
      totalEfectivo: por('efectivo'),
      totalTransferencia: por('transferencia'),
      totalTarjeta: por('tarjeta'),
      totalIngresos,
      totalGastos,
      saldoNeto: totalIngresos - totalGastos,
      cobros,
      gastos,
    }
  },

  cargarCajaHoy: async () => {
    const db = await getDb()
    const hoy = hoyISO()
    const cobrosRows = await db.select<any[]>(
      `SELECT * FROM cobros_caja WHERE substr(fecha,1,10) = ? ORDER BY id ASC`, [hoy]
    )
    const gastosRows = await db.select<any[]>(
      `SELECT * FROM gastos_operativos WHERE substr(fecha,1,10) = ? ORDER BY id ASC`, [hoy]
    )
    const cobros = cobrosRows.map(mapCobro)
    const gastos = gastosRows.map(mapGasto)
    const cerrado = await db.select<{ n: number }[]>(
      `SELECT COUNT(*) as n FROM cierres_caja WHERE fecha = ?`, [hoy]
    )
    set({
      cobrosHoy: cobros,
      gastosHoy: gastos,
      resumenHoy: get().calcularResumen(cobros, gastos),
      diaYaCerrado: (cerrado[0]?.n ?? 0) > 0,
    })
  },

  agregarCobro: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const usuario = useSessionStore.getState().usuario
    await db.execute(
      `INSERT INTO cobros_caja (fecha, monto, forma_pago, concepto, empleado_id, creado_en)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [now, data.monto, data.formaPago, data.concepto || null, usuario?.id ?? null, now]
    )
    await get().cargarCajaHoy()
  },

  eliminarCobro: async (id) => {
    const cobro = get().cobrosHoy.find(c => c.id === id)
    if (!cobro || cobro.otId != null || cobro.ventaPosId != null) return // OT/POS no se eliminan
    const db = await getDb()
    await db.execute(`DELETE FROM cobros_caja WHERE id = ?`, [id])
    await get().cargarCajaHoy()
  },

  agregarGasto: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const usuario = useSessionStore.getState().usuario
    const fecha = data.fecha ? `${data.fecha}T00:00:00.000Z` : now
    await db.execute(
      `INSERT INTO gastos_operativos (fecha, monto, categoria, descripcion, comprobante, empleado_id, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fecha, data.monto, data.categoria, data.descripcion || null, data.comprobante || null, usuario?.id ?? null, now]
    )
    await get().cargarCajaHoy()
  },

  editarGasto: async (id, data) => {
    const db = await getDb()
    const fecha = data.fecha ? `${data.fecha}T00:00:00.000Z` : undefined
    if (fecha) {
      await db.execute(
        `UPDATE gastos_operativos SET monto = ?, categoria = ?, descripcion = ?, comprobante = ?, fecha = ? WHERE id = ?`,
        [data.monto, data.categoria, data.descripcion || null, data.comprobante || null, fecha, id]
      )
    } else {
      await db.execute(
        `UPDATE gastos_operativos SET monto = ?, categoria = ?, descripcion = ?, comprobante = ? WHERE id = ?`,
        [data.monto, data.categoria, data.descripcion || null, data.comprobante || null, id]
      )
    }
    await get().cargarCajaHoy()
  },

  eliminarGasto: async (id) => {
    const db = await getDb()
    await db.execute(`DELETE FROM gastos_operativos WHERE id = ?`, [id])
    await get().cargarCajaHoy()
  },

  cerrarCaja: async (notas) => {
    if (get().diaYaCerrado) return false
    const db = await getDb()
    const hoy = hoyISO()
    const now = new Date().toISOString()
    const r = get().calcularResumen(get().cobrosHoy, get().gastosHoy)
    const cerradoPor = useSessionStore.getState().usuario?.nombre ?? 'Sistema'
    try {
      await db.execute(
        `INSERT INTO cierres_caja
         (fecha, total_efectivo, total_transferencia, total_tarjeta, total_ingresos, total_gastos, saldo_neto, cerrado_por, notas, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [hoy, r.totalEfectivo, r.totalTransferencia, r.totalTarjeta, r.totalIngresos, r.totalGastos, r.saldoNeto, cerradoPor, notas || null, now]
      )
      set({ diaYaCerrado: true })
      await registrarActividad({ modulo: 'Caja Diaria', accion: 'Cerró la caja del día', detalle: `${hoy} · neto ${Math.round(r.saldoNeto)}` })
      return true
    } catch (e) {
      console.error('cerrarCaja', e)
      return false
    }
  },

  cargarHistorialCierres: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>(`SELECT * FROM cierres_caja ORDER BY fecha DESC`)
    set({ cierresCaja: rows.map(mapCierre) })
  },

  calcularResumenMes: async (anio, mes) => {
    const db = await getDb()
    const prefijo = padMes(anio, mes)

    const cobros = await db.select<{ total: number | null }[]>(
      `SELECT SUM(monto) as total FROM cobros_caja WHERE substr(fecha,1,7) = ?`, [prefijo]
    )
    const gastos = await db.select<{ total: number | null }[]>(
      `SELECT SUM(monto) as total FROM gastos_operativos WHERE substr(fecha,1,7) = ?`, [prefijo]
    )
    const totalIngresos = cobros[0]?.total ?? 0
    const totalGastos = gastos[0]?.total ?? 0

    const completadas = await db.select<{ n: number }[]>(
      `SELECT COUNT(*) as n FROM ordenes_trabajo WHERE substr(creado_en,1,7) = ? AND estado IN ('finalizado','entregado')`, [prefijo]
    )
    const canceladas = await db.select<{ n: number }[]>(
      `SELECT COUNT(*) as n FROM ordenes_trabajo WHERE substr(creado_en,1,7) = ? AND estado = 'cancelado'`, [prefijo]
    )

    const prodTop = await db.select<{ nombre: string; total: number }[]>(
      `SELECT p.nombre as nombre, SUM(m.cantidad) as total
       FROM movimientos_stock m JOIN productos p ON p.id = m.producto_id
       WHERE m.tipo = 'salida' AND substr(m.fecha,1,7) = ?
       GROUP BY m.producto_id ORDER BY total DESC LIMIT 1`, [prefijo]
    )

    const empTop = await db.select<{ nombre: string; n: number }[]>(
      `SELECT e.nombre as nombre, COUNT(*) as n
       FROM ordenes_trabajo o JOIN empleados e ON e.id = o.empleado_id
       WHERE substr(o.creado_en,1,7) = ? AND o.estado IN ('finalizado','entregado')
       GROUP BY o.empleado_id ORDER BY n DESC LIMIT 1`, [prefijo]
    )

    return {
      anio, mes,
      totalIngresos,
      totalGastos,
      margenOperativo: totalIngresos - totalGastos,
      otsCompletadas: completadas[0]?.n ?? 0,
      otsCanceladas: canceladas[0]?.n ?? 0,
      productoMasVendido: prodTop[0]?.nombre ?? null,
      empleadoDestacado: empTop[0]?.nombre ?? null,
    }
  },

  cerrarMes: async (anio, mes) => {
    if (get().mesYaCerrado(anio, mes)) return null
    const db = await getDb()
    const now = new Date().toISOString()
    const r = await get().calcularResumenMes(anio, mes)
    const cerradoPor = useSessionStore.getState().usuario?.nombre ?? 'Sistema'
    const snapshot = JSON.stringify(r)
    try {
      const res = await db.execute(
        `INSERT INTO cierres_mes
         (anio, mes, total_ingresos, total_gastos, margen_operativo, ots_completadas, ots_canceladas,
          producto_mas_vendido, empleado_destacado, snapshot, cerrado_por, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [anio, mes, r.totalIngresos, r.totalGastos, r.margenOperativo, r.otsCompletadas, r.otsCanceladas,
         r.productoMasVendido, r.empleadoDestacado, snapshot, cerradoPor, now]
      )
      const cierre: CierreMes = {
        id: Number(res.lastInsertId), anio, mes,
        totalIngresos: r.totalIngresos, totalGastos: r.totalGastos, margenOperativo: r.margenOperativo,
        otsCompletadas: r.otsCompletadas, otsCanceladas: r.otsCanceladas,
        productoMasVendido: r.productoMasVendido, empleadoDestacado: r.empleadoDestacado,
        cerradoPor, creadoEn: now,
      }
      await get().cargarCierresMes()
      await registrarActividad({ modulo: 'Caja Diaria', accion: 'Cerró el mes', detalle: `${mes}/${anio} · margen ${Math.round(r.margenOperativo)}` })
      return cierre
    } catch (e) {
      console.error('cerrarMes', e)
      return null
    }
  },

  cargarCierresMes: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>(`SELECT * FROM cierres_mes ORDER BY anio DESC, mes DESC`)
    set({ cierresMes: rows.map(mapCierreMes) })
  },

  mesYaCerrado: (anio, mes) => get().cierresMes.some(c => c.anio === anio && c.mes === mes),

  obtenerDatosComparativo: async (periodo1, periodo2) => {
    const db = await getDb()
    const [d1, d2] = await Promise.all([
      datosDeMes(db, periodo1.anio, periodo1.mes),
      datosDeMes(db, periodo2.anio, periodo2.mes),
    ])
    return { periodo1: d1, periodo2: d2 }
  },
}))
