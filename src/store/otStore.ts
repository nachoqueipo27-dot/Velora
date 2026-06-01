import { create } from 'zustand'
import { getDb } from '../db'
import { useSessionStore } from './sessionStore'
import { registrarActividad } from '../lib/registrarActividad'
import type {
  OrdenTrabajo, EtiquetaOT, PlantillaOT, EstadoOT, ComponenteCancelacion, NotaOT, GarantiaActiva,
} from '../types/ordenesTrabajo'

export interface NuevaOT {
  clienteId: number
  empleadoId: number | null
  productoId: number
  tipoItem: 'simple' | 'conjunto'
  productoNombre: string
  descripcion: string
  precio: number
  descuento: number
  tipoDescuento: 'porcentaje' | 'monto'
  garantiaDias: number
  esRecurrente: boolean
  frecuencia: string | null
  proximaFecha: string | null
  etiquetaIds: number[]
  presupuestoId?: number | null
}

export interface OTFiltros {
  estado?: EstadoOT | null
  empleadoId?: number | null
  etiquetaId?: number | null
}

interface OTStore {
  ots: OrdenTrabajo[]
  otActiva: OrdenTrabajo | null
  etiquetas: EtiquetaOT[]
  plantillas: PlantillaOT[]
  notas: NotaOT[]
  garantias: GarantiaActiva[]
  loading: boolean

  cargarOTs: (filtros?: OTFiltros) => Promise<void>
  cargarEtiquetas: () => Promise<void>
  cargarPlantillas: () => Promise<void>
  crearOT: (data: NuevaOT) => Promise<number>
  crearOTDesdePresupuesto: (presupuestoId: number) => Promise<number | null>
  duplicarOT: (otId: number) => Promise<void>
  crearOTDesdePlantilla: (plantillaId: number, clienteId: number) => Promise<void>
  cambiarEstado: (id: number, estado: EstadoOT) => Promise<void>
  cancelarOT: (id: number, motivo: string, componentes: ComponenteCancelacion[]) => Promise<void>
  asignarEmpleado: (otId: number, empleadoId: number | null) => Promise<void>
  asignarEtiquetas: (otId: number, etiquetaIds: number[]) => Promise<void>
  agregarNota: (otId: number, nota: string) => Promise<void>
  cargarNotas: (otId: number) => Promise<void>
  configurarRecurrencia: (otId: number, frecuencia: string, proximaFecha: string) => Promise<void>
  procesarOTsRecurrentes: () => Promise<number>
  cargarGarantias: () => Promise<void>
  crearPlantilla: (nombre: string, descripcion: string, productoId: number | null, tipoItem: string | null) => Promise<void>
  eliminarPlantilla: (id: number) => Promise<void>
  seleccionar: (ot: OrdenTrabajo | null) => void
  cargaPorEmpleado: () => Promise<Map<number, number>>
  componentesDeConjunto: (productoId: number) => Promise<ComponenteCancelacion[]>
}

const usuarioActual = () => useSessionStore.getState().usuario?.nombre ?? 'Administrador'

const diasDiff = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

const sumarDias = (base: Date, dias: number) => new Date(base.getTime() + dias * 86400000).toISOString()

const proximaPorFrecuencia = (desde: Date, frecuencia: string): string => {
  switch (frecuencia) {
    case 'diaria':    return sumarDias(desde, 1)
    case 'semanal':   return sumarDias(desde, 7)
    case 'quincenal': return sumarDias(desde, 15)
    case 'mensual':   return sumarDias(desde, 30)
    default:          return sumarDias(desde, 7)
  }
}

function calcTotal(precio: number, descuento: number, tipo: 'porcentaje' | 'monto') {
  const t = tipo === 'porcentaje' ? precio * (1 - (descuento || 0) / 100) : precio - (descuento || 0)
  return Math.max(0, Math.round(t * 100) / 100)
}

async function descontarStock(db: Awaited<ReturnType<typeof getDb>>, productoId: number, tipoItem: string, otNumero: number, now: string) {
  const motivo = `OT #${String(otNumero).padStart(3, '0')}`
  if (tipoItem === 'conjunto') {
    const comps = await db.select<any[]>('SELECT componente_id, cantidad FROM conjunto_componentes WHERE conjunto_id = ?', [productoId])
    for (const c of comps) {
      await db.execute('UPDATE productos SET stock = MAX(0, stock - ?), actualizado_en = ? WHERE id = ?', [c.cantidad, now, c.componente_id])
      await db.execute(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia_id, fecha, creado_en) VALUES (?, 'salida', ?, ?, ?, ?, ?)`,
        [c.componente_id, c.cantidad, motivo, productoId, now, now]
      )
    }
  } else {
    await db.execute('UPDATE productos SET stock = MAX(0, stock - 1), actualizado_en = ? WHERE id = ?', [now, productoId])
    await db.execute(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, fecha, creado_en) VALUES (?, 'salida', 1, ?, ?, ?)`,
      [productoId, motivo, now, now]
    )
  }
}

const mapOT = (r: any, etiquetas: EtiquetaOT[]): OrdenTrabajo => ({
  id: r.id,
  numero: r.numero,
  clienteId: r.cliente_id,
  clienteNombre: r.cliente_nombre ?? '',
  empleadoId: r.empleado_id ?? null,
  empleadoNombre: r.empleado_nombre ?? null,
  productoId: r.producto_id,
  tipoItem: r.tipo_item,
  productoNombre: r.producto_nombre,
  descripcion: r.descripcion ?? null,
  estado: r.estado,
  descuento: r.descuento ?? 0,
  tipoDescuento: (r.tipo_descuento ?? 'porcentaje') as 'porcentaje' | 'monto',
  precio: r.precio,
  totalFinal: r.total_final,
  motivoCancelacion: r.motivo_cancelacion ?? null,
  notas: r.notas ?? null,
  presupuestoId: r.presupuesto_id ?? null,
  esRecurrente: r.es_recurrente === 1,
  frecuencia: r.frecuencia ?? null,
  proximaFecha: r.proxima_fecha ?? null,
  garantiaDias: r.garantia_dias ?? 0,
  garantiaVence: r.garantia_vence ?? null,
  creadoPor: r.creado_por,
  creadoEn: r.creado_en,
  actualizadoEn: r.actualizado_en,
  etiquetas,
  diasSinMovimiento: diasDiff(r.actualizado_en),
})

export const useOTStore = create<OTStore>((set, get) => ({
  ots: [],
  otActiva: null,
  etiquetas: [],
  plantillas: [],
  notas: [],
  garantias: [],
  loading: false,

  cargarOTs: async (filtros) => {
    set({ loading: true })
    try {
      const db = await getDb()
      const where: string[] = []
      const params: any[] = []
      if (filtros?.estado) { where.push('o.estado = ?'); params.push(filtros.estado) }
      if (filtros?.empleadoId) { where.push('o.empleado_id = ?'); params.push(filtros.empleadoId) }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
      const rows = await db.select<any[]>(
        `SELECT o.*, c.nombre as cliente_nombre, e.nombre as empleado_nombre
         FROM ordenes_trabajo o
         JOIN clientes c ON o.cliente_id = c.id
         LEFT JOIN empleados e ON o.empleado_id = e.id
         ${clause} ORDER BY o.numero DESC`, params
      )
      const etiquetaRows = await db.select<any[]>(
        `SELECT oe.ot_id, et.id, et.nombre, et.color FROM ot_etiquetas oe JOIN etiquetas_ot et ON oe.etiqueta_id = et.id`
      )
      const porOT = new Map<number, EtiquetaOT[]>()
      etiquetaRows.forEach(r => {
        const arr = porOT.get(r.ot_id) ?? []
        arr.push({ id: r.id, nombre: r.nombre, color: r.color })
        porOT.set(r.ot_id, arr)
      })
      let ots = rows.map(r => mapOT(r, porOT.get(r.id) ?? []))
      if (filtros?.etiquetaId) ots = ots.filter(o => o.etiquetas.some(e => e.id === filtros.etiquetaId))
      set({ ots, loading: false })
    } catch (e) {
      console.error('cargarOTs', e)
      set({ loading: false })
    }
  },

  cargarEtiquetas: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM etiquetas_ot ORDER BY nombre ASC')
    set({ etiquetas: rows.map(r => ({ id: r.id, nombre: r.nombre, color: r.color })) })
  },

  cargarPlantillas: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM plantillas_ot ORDER BY nombre ASC')
    set({ plantillas: rows.map(r => ({ id: r.id, nombre: r.nombre, descripcion: r.descripcion ?? null, productoId: r.producto_id ?? null, tipoItem: r.tipo_item ?? null })) })
  },

  crearOT: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const maxRows = await db.select<{ max: number | null }[]>('SELECT MAX(numero) as max FROM ordenes_trabajo')
    const numero = (maxRows[0].max ?? 0) + 1
    const totalFinal = calcTotal(data.precio, data.descuento, data.tipoDescuento)
    const res = await db.execute(
      `INSERT INTO ordenes_trabajo
       (numero, cliente_id, empleado_id, producto_id, tipo_item, producto_nombre, descripcion, estado,
        descuento, tipo_descuento, precio, total_final, presupuesto_id, es_recurrente, frecuencia, proxima_fecha,
        garantia_dias, creado_por, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'recepcion', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, data.clienteId, data.empleadoId, data.productoId, data.tipoItem, data.productoNombre, data.descripcion,
       data.descuento, data.tipoDescuento, data.precio, totalFinal, data.presupuestoId ?? null,
       data.esRecurrente ? 1 : 0, data.frecuencia, data.proximaFecha, data.garantiaDias, usuarioActual(), now, now]
    )
    const otId = Number(res.lastInsertId)
    await descontarStock(db, data.productoId, data.tipoItem, numero, now)
    await registrarActividad({ modulo: 'Órdenes de Trabajo', accion: 'Creó una OT', detalle: `OT #${String(numero).padStart(3, '0')} · ${data.productoNombre}`, entidadTipo: 'ot', entidadId: otId })
    if (data.etiquetaIds.length) {
      for (const eid of data.etiquetaIds) {
        await db.execute('INSERT INTO ot_etiquetas (ot_id, etiqueta_id) VALUES (?, ?)', [otId, eid])
      }
    }
    await get().cargarOTs()
    return otId
  },

  crearOTDesdePresupuesto: async (presupuestoId) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const presRows = await db.select<any[]>('SELECT * FROM presupuestos WHERE id = ?', [presupuestoId])
    if (presRows.length === 0) return null
    const pres = presRows[0]
    const itemRows = await db.select<any[]>('SELECT * FROM items_presupuesto WHERE presupuesto_id = ? LIMIT 1', [presupuestoId])
    if (itemRows.length === 0) return null
    const item = itemRows[0]
    const maxRows = await db.select<{ max: number | null }[]>('SELECT MAX(numero) as max FROM ordenes_trabajo')
    const numero = (maxRows[0].max ?? 0) + 1
    const res = await db.execute(
      `INSERT INTO ordenes_trabajo
       (numero, cliente_id, producto_id, tipo_item, producto_nombre, descripcion, estado, precio, total_final, presupuesto_id, creado_por, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, 'recepcion', ?, ?, ?, ?, ?, ?)`,
      [numero, pres.cliente_id, item.producto_id, item.tipo_item, item.nombre, pres.descripcion ?? null, pres.total_final, pres.total_final, presupuestoId, usuarioActual(), now, now]
    )
    const otId = Number(res.lastInsertId)
    await descontarStock(db, item.producto_id, item.tipo_item, numero, now)
    await get().cargarOTs()
    return otId
  },

  duplicarOT: async (otId) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const o = get().ots.find(x => x.id === otId)
    if (!o) return
    const maxRows = await db.select<{ max: number | null }[]>('SELECT MAX(numero) as max FROM ordenes_trabajo')
    const numero = (maxRows[0].max ?? 0) + 1
    const res = await db.execute(
      `INSERT INTO ordenes_trabajo
       (numero, cliente_id, producto_id, tipo_item, producto_nombre, descripcion, estado, descuento, tipo_descuento, precio, total_final, garantia_dias, creado_por, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, 'recepcion', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, o.clienteId, o.productoId, o.tipoItem, o.productoNombre, o.descripcion, o.descuento, o.tipoDescuento, o.precio, o.totalFinal, o.garantiaDias, usuarioActual(), now, now]
    )
    await descontarStock(db, o.productoId, o.tipoItem, numero, now)
    void res
    await get().cargarOTs()
  },

  crearOTDesdePlantilla: async (plantillaId, clienteId) => {
    const db = await getDb()
    const pl = get().plantillas.find(p => p.id === plantillaId)
    if (!pl || !pl.productoId) return
    const prodRows = await db.select<any[]>('SELECT nombre, precio FROM productos WHERE id = ?', [pl.productoId])
    const prod = prodRows[0]
    await get().crearOT({
      clienteId, empleadoId: null, productoId: pl.productoId, tipoItem: (pl.tipoItem as 'simple' | 'conjunto') ?? 'simple',
      productoNombre: prod?.nombre ?? pl.nombre, descripcion: pl.descripcion ?? '', precio: prod?.precio ?? 0,
      descuento: 0, tipoDescuento: 'porcentaje', garantiaDias: 0, esRecurrente: false, frecuencia: null, proximaFecha: null, etiquetaIds: [],
    })
  },

  cambiarEstado: async (id, estado) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const o = get().ots.find(x => x.id === id)
    await db.execute('UPDATE ordenes_trabajo SET estado = ?, actualizado_en = ? WHERE id = ?', [estado, now, id])
    await registrarActividad({ modulo: 'Órdenes de Trabajo', accion: 'Cambió estado de OT', detalle: `OT #${String(o?.numero ?? id).padStart(3, '0')} → ${estado}`, entidadTipo: 'ot', entidadId: id, campoAnterior: { estado: o?.estado }, campoNuevo: { estado } })
    if (estado === 'entregado' && o && o.garantiaDias > 0) {
      const vence = sumarDias(new Date(), o.garantiaDias)
      await db.execute('UPDATE ordenes_trabajo SET garantia_vence = ? WHERE id = ?', [vence, id])
      await db.execute(
        `INSERT INTO garantias (ot_id, cliente_id, producto_id, dias_garantia, fecha_inicio, fecha_vence, activa)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [id, o.clienteId, o.productoId, o.garantiaDias, now, vence]
      )
    }
    await get().cargarOTs()
    const sel = get().otActiva
    if (sel && sel.id === id) set({ otActiva: get().ots.find(x => x.id === id) ?? null })
  },

  cancelarOT: async (id, motivo, componentes) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const o = get().ots.find(x => x.id === id)
    for (const c of componentes) {
      if (c.recuperar) {
        await db.execute('UPDATE productos SET stock = stock + ?, actualizado_en = ? WHERE id = ?', [c.cantidad, now, c.productoId])
        await db.execute(
          `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia_id, fecha, creado_en) VALUES (?, 'entrada', ?, ?, ?, ?, ?)`,
          [c.productoId, c.cantidad, `Recuperación cancelación OT #${String(o?.numero ?? id).padStart(3, '0')}`, id, now, now]
        )
      } else {
        await db.execute(
          `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia_id, fecha, creado_en) VALUES (?, 'salida', ?, ?, ?, ?, ?)`,
          [c.productoId, c.cantidad, `Pérdida por cancelación OT #${String(o?.numero ?? id).padStart(3, '0')}`, id, now, now]
        )
      }
    }
    await db.execute('UPDATE ordenes_trabajo SET estado = ?, motivo_cancelacion = ?, actualizado_en = ? WHERE id = ?', ['cancelado', motivo, now, id])
    await registrarActividad({ modulo: 'Órdenes de Trabajo', accion: 'Canceló una OT', detalle: `OT #${String(o?.numero ?? id).padStart(3, '0')} · ${motivo}`, entidadTipo: 'ot', entidadId: id })
    await get().cargarOTs()
    const sel = get().otActiva
    if (sel && sel.id === id) set({ otActiva: get().ots.find(x => x.id === id) ?? null })
  },

  asignarEmpleado: async (otId, empleadoId) => {
    const db = await getDb()
    await db.execute('UPDATE ordenes_trabajo SET empleado_id = ?, actualizado_en = ? WHERE id = ?', [empleadoId, new Date().toISOString(), otId])
    await get().cargarOTs()
    const sel = get().otActiva
    if (sel && sel.id === otId) set({ otActiva: get().ots.find(x => x.id === otId) ?? null })
  },

  asignarEtiquetas: async (otId, etiquetaIds) => {
    const db = await getDb()
    await db.execute('DELETE FROM ot_etiquetas WHERE ot_id = ?', [otId])
    for (const eid of etiquetaIds) await db.execute('INSERT INTO ot_etiquetas (ot_id, etiqueta_id) VALUES (?, ?)', [otId, eid])
    await get().cargarOTs()
  },

  agregarNota: async (otId, nota) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute('INSERT INTO ot_notas (ot_id, nota, creado_por, creado_en) VALUES (?, ?, ?, ?)', [otId, nota, usuarioActual(), now])
    await get().cargarNotas(otId)
  },

  cargarNotas: async (otId) => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM ot_notas WHERE ot_id = ? ORDER BY creado_en DESC', [otId])
    set({ notas: rows.map(r => ({ id: r.id, otId: r.ot_id, nota: r.nota, creadoPor: r.creado_por, creadoEn: r.creado_en })) })
  },

  configurarRecurrencia: async (otId, frecuencia, proximaFecha) => {
    const db = await getDb()
    await db.execute('UPDATE ordenes_trabajo SET es_recurrente = 1, frecuencia = ?, proxima_fecha = ?, actualizado_en = ? WHERE id = ?',
      [frecuencia, proximaFecha, new Date().toISOString(), otId])
    await get().cargarOTs()
  },

  procesarOTsRecurrentes: async () => {
    const db = await getDb()
    const now = new Date()
    const rows = await db.select<any[]>(
      `SELECT * FROM ordenes_trabajo WHERE es_recurrente = 1 AND proxima_fecha IS NOT NULL AND proxima_fecha <= ?`,
      [now.toISOString()]
    )
    let creadas = 0
    for (const r of rows) {
      const o = mapOT(r, [])
      const nuevoId = await get().crearOT({
        clienteId: o.clienteId, empleadoId: o.empleadoId, productoId: o.productoId, tipoItem: o.tipoItem,
        productoNombre: o.productoNombre, descripcion: o.descripcion ?? '', precio: o.precio,
        descuento: o.descuento, tipoDescuento: o.tipoDescuento, garantiaDias: o.garantiaDias,
        esRecurrente: false, frecuencia: null, proximaFecha: null, etiquetaIds: [],
      })
      void nuevoId
      const prox = proximaPorFrecuencia(now, o.frecuencia ?? 'semanal')
      await db.execute('UPDATE ordenes_trabajo SET proxima_fecha = ?, actualizado_en = ? WHERE id = ?', [prox, now.toISOString(), o.id])
      creadas++
    }
    if (creadas) await get().cargarOTs()
    return creadas
  },

  cargarGarantias: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT g.*, c.nombre as cliente_nombre, p.nombre as producto_nombre
       FROM garantias g
       JOIN clientes c ON g.cliente_id = c.id
       JOIN productos p ON g.producto_id = p.id
       WHERE g.activa = 1 ORDER BY g.fecha_vence ASC`
    )
    set({
      garantias: rows.map(r => ({
        id: r.id, otId: r.ot_id, clienteId: r.cliente_id, clienteNombre: r.cliente_nombre,
        productoId: r.producto_id, productoNombre: r.producto_nombre, diasGarantia: r.dias_garantia,
        fechaInicio: r.fecha_inicio, fechaVence: r.fecha_vence, activa: r.activa === 1,
      })),
    })
  },

  crearPlantilla: async (nombre, descripcion, productoId, tipoItem) => {
    const db = await getDb()
    await db.execute('INSERT INTO plantillas_ot (nombre, descripcion, producto_id, tipo_item, creado_en) VALUES (?, ?, ?, ?, ?)',
      [nombre, descripcion, productoId, tipoItem, new Date().toISOString()])
    await get().cargarPlantillas()
  },

  eliminarPlantilla: async (id) => {
    const db = await getDb()
    await db.execute('DELETE FROM plantillas_ot WHERE id = ?', [id])
    await get().cargarPlantillas()
  },

  seleccionar: (ot) => set({ otActiva: ot }),

  cargaPorEmpleado: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT empleado_id, COUNT(*) as total FROM ordenes_trabajo
       WHERE empleado_id IS NOT NULL AND estado IN ('recepcion','en_proceso') GROUP BY empleado_id`
    )
    const map = new Map<number, number>()
    rows.forEach(r => map.set(r.empleado_id, Number(r.total)))
    return map
  },

  componentesDeConjunto: async (productoId) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT cc.componente_id, cc.cantidad, p.nombre FROM conjunto_componentes cc
       JOIN productos p ON cc.componente_id = p.id WHERE cc.conjunto_id = ?`, [productoId]
    )
    return rows.map(r => ({ productoId: r.componente_id, nombre: r.nombre, cantidad: r.cantidad, recuperar: true }))
  },
}))
