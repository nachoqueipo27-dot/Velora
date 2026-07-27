import { create } from 'zustand'
import { getDb } from '../db'
import { useSessionStore } from './sessionStore'
import { registrarActividad } from '../lib/registrarActividad'
import { ESTADOS_TERMINALES, type Presupuesto, type ItemPresupuesto, type EstadoPresupuesto } from '../types/presupuestos'

export interface ItemPresupuestoInput {
  productoId: number
  tipoItem: 'simple' | 'conjunto'
  nombre: string
  cantidad: number
  precioUnitario: number
  descuentoItem: number
}

export interface DatosPresupuesto {
  clienteId: number
  descripcion: string
  vigenciaDias: number
  descuento: number
  tipoDescuento: 'porcentaje' | 'monto'
  items: ItemPresupuestoInput[]
}

interface PresupuestosStore {
  presupuestos: Presupuesto[]
  presupuestoActivo: Presupuesto | null
  items: ItemPresupuesto[]
  loading: boolean

  cargarPresupuestos: () => Promise<void>
  cargarItems: (presupuestoId: number) => Promise<void>
  crearPresupuesto: (data: DatosPresupuesto) => Promise<void>
  actualizarPresupuesto: (id: number, data: DatosPresupuesto) => Promise<void>
  cambiarEstado: (id: number, estado: EstadoPresupuesto, motivo?: string) => Promise<void>
  reenviar: (id: number) => Promise<void>
  convertirAOT: (presupuestoId: number) => Promise<number | null>
  eliminarPresupuesto: (id: number) => Promise<void>
  seleccionar: (p: Presupuesto | null) => void
  presupuestosVencidos: () => Presupuesto[]
}

const usuarioActual = () => useSessionStore.getState().usuario?.nombre ?? 'Administrador'

export function subtotalItem(it: { cantidad: number; precioUnitario: number; descuentoItem: number }) {
  return Math.max(0, it.cantidad * it.precioUnitario - it.descuentoItem)
}

export function calcularTotales(
  items: { cantidad: number; precioUnitario: number; descuentoItem: number }[],
  descuento: number,
  tipoDescuento: 'porcentaje' | 'monto',
) {
  const subtotal = items.reduce((s, i) => s + subtotalItem(i), 0)
  const totalFinal = tipoDescuento === 'porcentaje'
    ? subtotal * (1 - (descuento || 0) / 100)
    : subtotal - (descuento || 0)
  return { subtotal, totalFinal: Math.max(0, Math.round(totalFinal * 100) / 100) }
}

const mapPresupuesto = (r: any): Presupuesto => {
  const estado: EstadoPresupuesto = r.estado
  const vencido = !!r.fecha_vigencia && new Date(r.fecha_vigencia) < new Date() && !ESTADOS_TERMINALES.includes(estado)
  return {
    id: r.id,
    numero: r.numero,
    clienteId: r.cliente_id,
    clienteNombre: r.cliente_nombre ?? '',
    estado,
    descripcion: r.descripcion ?? '',
    descuento: r.descuento ?? 0,
    tipoDescuento: (r.tipo_descuento ?? 'porcentaje') as 'porcentaje' | 'monto',
    subtotal: r.subtotal ?? 0,
    totalFinal: r.total_final ?? 0,
    motivoRechazo: r.motivo_rechazo ?? null,
    vigenciaDias: r.vigencia_dias ?? 7,
    fechaVigencia: r.fecha_vigencia ?? null,
    otId: r.ot_id ?? null,
    creadoPor: r.creado_por,
    creadoEn: r.creado_en,
    actualizadoEn: r.actualizado_en,
    vencido,
  }
}

async function guardarItems(db: Awaited<ReturnType<typeof getDb>>, presupuestoId: number, items: ItemPresupuestoInput[]) {
  await db.execute('DELETE FROM items_presupuesto WHERE presupuesto_id = ?', [presupuestoId])
  for (const it of items) {
    await db.execute(
      `INSERT INTO items_presupuesto (presupuesto_id, producto_id, tipo_item, nombre, cantidad, precio_unitario, descuento_item, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [presupuestoId, it.productoId, it.tipoItem, it.nombre, it.cantidad, it.precioUnitario, it.descuentoItem, subtotalItem(it)]
    )
  }
}

export const usePresupuestosStore = create<PresupuestosStore>((set, get) => ({
  presupuestos: [],
  presupuestoActivo: null,
  items: [],
  loading: false,

  cargarPresupuestos: async () => {
    set({ loading: true })
    try {
      const db = await getDb()
      const rows = await db.select<any[]>(
        `SELECT pr.*, c.nombre as cliente_nombre FROM presupuestos pr
         JOIN clientes c ON pr.cliente_id = c.id
         ORDER BY pr.numero DESC`
      )
      set({ presupuestos: rows.map(mapPresupuesto), loading: false })
    } catch (e) {
      console.error('cargarPresupuestos', e)
      set({ loading: false })
    }
  },

  cargarItems: async (presupuestoId) => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM items_presupuesto WHERE presupuesto_id = ?', [presupuestoId])
    set({
      items: rows.map(r => ({
        id: r.id,
        presupuestoId: r.presupuesto_id,
        productoId: r.producto_id,
        tipoItem: r.tipo_item,
        nombre: r.nombre,
        cantidad: r.cantidad,
        precioUnitario: r.precio_unitario,
        descuentoItem: r.descuento_item ?? 0,
        subtotal: r.subtotal,
      })),
    })
  },

  crearPresupuesto: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const fechaVigencia = new Date(Date.now() + data.vigenciaDias * 86400000).toISOString()
    const maxRows = await db.select<{ max: number | null }[]>('SELECT MAX(numero) as max FROM presupuestos')
    const numero = (maxRows[0].max ?? 0) + 1
    const { subtotal, totalFinal } = calcularTotales(data.items, data.descuento, data.tipoDescuento)
    const res = await db.execute(
      `INSERT INTO presupuestos
       (numero, cliente_id, estado, descripcion, descuento, tipo_descuento, subtotal, total_final, vigencia_dias, fecha_vigencia, creado_por, creado_en, actualizado_en)
       VALUES (?, ?, 'borrador', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [numero, data.clienteId, data.descripcion, data.descuento, data.tipoDescuento, subtotal, totalFinal, data.vigenciaDias, fechaVigencia, usuarioActual(), now, now]
    )
    await guardarItems(db, Number(res.lastInsertId), data.items)
    await get().cargarPresupuestos()
  },

  actualizarPresupuesto: async (id, data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const { subtotal, totalFinal } = calcularTotales(data.items, data.descuento, data.tipoDescuento)
    await db.execute(
      `UPDATE presupuestos SET cliente_id=?, descripcion=?, descuento=?, tipo_descuento=?, subtotal=?, total_final=?, vigencia_dias=?, actualizado_en=? WHERE id=?`,
      [data.clienteId, data.descripcion, data.descuento, data.tipoDescuento, subtotal, totalFinal, data.vigenciaDias, now, id]
    )
    await guardarItems(db, id, data.items)
    await get().cargarPresupuestos()
  },

  cambiarEstado: async (id, estado, motivo) => {
    const db = await getDb()
    const now = new Date().toISOString()
    if (estado === 'rechazado') {
      await db.execute("UPDATE presupuestos SET estado=?, motivo_rechazo=?, actualizado_en=? WHERE id=?", [estado, motivo ?? 'Sin especificar', now, id])
    } else {
      await db.execute("UPDATE presupuestos SET estado=?, actualizado_en=? WHERE id=?", [estado, now, id])
    }
    await registrarActividad({ modulo: 'Presupuestos', accion: 'Cambió estado de presupuesto', detalle: `→ ${estado}`, entidadTipo: 'presupuesto', entidadId: id, campoNuevo: { estado, motivo } })
    await get().cargarPresupuestos()
    const sel = get().presupuestoActivo
    if (sel && sel.id === id) set({ presupuestoActivo: get().presupuestos.find(p => p.id === id) ?? null })
  },

  reenviar: async (id) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const p = get().presupuestos.find(x => x.id === id)
    const dias = p?.vigenciaDias ?? 7
    const fechaVigencia = new Date(Date.now() + dias * 86400000).toISOString()
    await db.execute('UPDATE presupuestos SET estado=?, fecha_vigencia=?, actualizado_en=? WHERE id=?', ['enviado', fechaVigencia, now, id])
    await get().cargarPresupuestos()
    const sel = get().presupuestoActivo
    if (sel && sel.id === id) set({ presupuestoActivo: get().presupuestos.find(x => x.id === id) ?? null })
  },

  convertirAOT: async (presupuestoId) => {
    const db = await getDb()
    const now = new Date().toISOString()
    let otId: number | null = null
    try {
      // Crea la OT real con los items del presupuesto vía otStore.
      const { useOTStore } = await import('./otStore')
      otId = await useOTStore.getState().crearOTDesdePresupuesto(presupuestoId)
    } catch (e) {
      console.warn('[convertirAOT] no se pudo crear la OT, se marca convertido igualmente:', e)
    }
    await db.execute('UPDATE presupuestos SET estado=?, ot_id=?, actualizado_en=? WHERE id=?', ['convertido', otId, now, presupuestoId])
    await registrarActividad({ modulo: 'Presupuestos', accion: 'Convirtió presupuesto a OT', detalle: otId ? `OT #${otId}` : undefined, entidadTipo: 'presupuesto', entidadId: presupuestoId })
    await get().cargarPresupuestos()
    const sel = get().presupuestoActivo
    if (sel && sel.id === presupuestoId) set({ presupuestoActivo: get().presupuestos.find(p => p.id === presupuestoId) ?? null })
    return otId
  },

  eliminarPresupuesto: async (id) => {
    const db = await getDb()
    const p = get().presupuestos.find(x => x.id === id)
    if (!p || p.estado !== 'borrador') return
    await db.execute('DELETE FROM items_presupuesto WHERE presupuesto_id = ?', [id])
    await db.execute('DELETE FROM presupuestos WHERE id = ?', [id])
    await get().cargarPresupuestos()
  },

  seleccionar: (p) => set({ presupuestoActivo: p }),

  presupuestosVencidos: () => {
    const ahora = new Date()
    return get().presupuestos.filter(p => p.estado === 'enviado' && p.fechaVigencia && new Date(p.fechaVigencia) < ahora)
  },
}))
