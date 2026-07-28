import { create } from 'zustand'
import { getDb } from '../db'
import type { Proveedor, OrdenCompra, ItemOrdenCompra, EstadoOrdenCompra } from '../types/proveedores'

export interface ItemOrdenInput {
  productoId: number
  cantidad: number
  precioCosto: number
}

export interface NuevoProveedor {
  nombre: string
  rubro: string
  contacto: string
  telefono: string
  email: string
  direccion: string
  notas: string
}

interface ProveedoresStore {
  proveedores: Proveedor[]
  ordenes: OrdenCompra[]
  items: ItemOrdenCompra[]
  loading: boolean
  ordenSeleccionada: OrdenCompra | null

  cargarProveedores: () => Promise<void>
  crearProveedor: (data: NuevoProveedor) => Promise<void>
  actualizarProveedor: (id: number, data: NuevoProveedor) => Promise<void>
  eliminarProveedor: (id: number) => Promise<boolean>
  toggleActivoProveedor: (id: number) => Promise<void>

  cargarOrdenes: () => Promise<void>
  crearOrden: (proveedorId: number, items: ItemOrdenInput[], notas: string) => Promise<void>
  actualizarEstadoOrden: (id: number, estado: EstadoOrdenCompra) => Promise<void>
  recepcionarMercaderia: (ordenId: number) => Promise<void>
  cargarItemsOrden: (ordenId: number) => Promise<void>
  agregarItemOrden: (ordenId: number, productoId: number, cantidad: number, precioCosto: number) => Promise<void>
  actualizarCantidadItem: (itemId: number, cantidad: number) => Promise<void>
  eliminarItemOrden: (itemId: number) => Promise<void>
  eliminarOrden: (ordenId: number) => Promise<void>
  seleccionarOrden: (o: OrdenCompra | null) => void
}

const mapProveedor = (r: any): Proveedor => ({
  id: r.id,
  nombre: r.nombre,
  rubro: r.rubro ?? '',
  contacto: r.contacto ?? '',
  telefono: r.telefono ?? '',
  email: r.email ?? '',
  direccion: r.direccion ?? '',
  notas: r.notas ?? '',
  activo: r.activo === 1 || r.activo === true,
  creadoEn: r.creado_en,
  actualizadoEn: r.actualizado_en,
})

const mapOrden = (r: any): OrdenCompra => ({
  id: r.id,
  proveedorId: r.proveedor_id,
  proveedorNombre: r.proveedor_nombre ?? '',
  estado: r.estado,
  numero: r.numero,
  notas: r.notas ?? '',
  total: r.total ?? 0,
  fechaEnvio: r.fecha_envio ?? null,
  fechaRecepcion: r.fecha_recepcion ?? null,
  creadoEn: r.creado_en,
  actualizadoEn: r.actualizado_en,
})

export const useProveedoresStore = create<ProveedoresStore>((set, get) => ({
  proveedores: [],
  ordenes: [],
  items: [],
  loading: false,
  ordenSeleccionada: null,

  cargarProveedores: async () => {
    set({ loading: true })
    try {
      const db = await getDb()
      const rows = await db.select<any[]>('SELECT * FROM proveedores ORDER BY nombre ASC')
      set({ proveedores: rows.map(mapProveedor), loading: false })
    } catch (e) {
      console.error('cargarProveedores', e)
      set({ loading: false })
    }
  },

  crearProveedor: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO proveedores (nombre, rubro, contacto, telefono, email, direccion, notas, activo, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [data.nombre, data.rubro, data.contacto, data.telefono, data.email, data.direccion, data.notas, now, now]
    )
    await get().cargarProveedores()
  },

  actualizarProveedor: async (id, data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `UPDATE proveedores SET nombre=?, rubro=?, contacto=?, telefono=?, email=?, direccion=?, notas=?, actualizado_en=? WHERE id=?`,
      [data.nombre, data.rubro, data.contacto, data.telefono, data.email, data.direccion, data.notas, now, id]
    )
    await get().cargarProveedores()
  },

  eliminarProveedor: async (id) => {
    const db = await getDb()
    const rows = await db.select<{ count: number }[]>(
      'SELECT COUNT(*) as count FROM ordenes_compra WHERE proveedor_id = ?', [id]
    )
    if (rows[0].count > 0) return false
    await db.execute('DELETE FROM proveedores WHERE id = ?', [id])
    await get().cargarProveedores()
    return true
  },

  toggleActivoProveedor: async (id) => {
    const db = await getDb()
    const p = get().proveedores.find(x => x.id === id)
    if (!p) return
    await db.execute('UPDATE proveedores SET activo=?, actualizado_en=? WHERE id=?',
      [p.activo ? 0 : 1, new Date().toISOString(), id])
    await get().cargarProveedores()
  },

  cargarOrdenes: async () => {
    set({ loading: true })
    try {
      const db = await getDb()
      const rows = await db.select<any[]>(
        `SELECT o.*, p.nombre as proveedor_nombre FROM ordenes_compra o
         JOIN proveedores p ON o.proveedor_id = p.id
         ORDER BY o.numero DESC`
      )
      set({ ordenes: rows.map(mapOrden), loading: false })
    } catch (e) {
      console.error('cargarOrdenes', e)
      set({ loading: false })
    }
  },

  crearOrden: async (proveedorId, items, notas) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const maxRows = await db.select<{ max: number | null }[]>('SELECT MAX(numero) as max FROM ordenes_compra')
    const numero = (maxRows[0].max ?? 0) + 1
    const total = items.reduce((s, i) => s + i.cantidad * i.precioCosto, 0)
    const res = await db.execute(
      `INSERT INTO ordenes_compra (proveedor_id, estado, numero, notas, total, creado_en, actualizado_en)
       VALUES (?, 'borrador', ?, ?, ?, ?, ?)`,
      [proveedorId, numero, notas, total, now, now]
    )
    const ordenId = Number(res.lastInsertId)
    for (const it of items) {
      await db.execute(
        `INSERT INTO items_orden_compra (orden_id, producto_id, cantidad, precio_costo) VALUES (?, ?, ?, ?)`,
        [ordenId, it.productoId, it.cantidad, it.precioCosto]
      )
    }
    await get().cargarOrdenes()
  },

  actualizarEstadoOrden: async (id, estado) => {
    const db = await getDb()
    const now = new Date().toISOString()
    if (estado === 'enviada') {
      await db.execute('UPDATE ordenes_compra SET estado=?, fecha_envio=?, actualizado_en=? WHERE id=?', [estado, now, now, id])
    } else if (estado === 'recibida') {
      await db.execute('UPDATE ordenes_compra SET estado=?, fecha_recepcion=?, actualizado_en=? WHERE id=?', [estado, now, now, id])
      await get().recepcionarMercaderia(id)
    } else {
      await db.execute('UPDATE ordenes_compra SET estado=?, actualizado_en=? WHERE id=?', [estado, now, id])
    }
    await get().cargarOrdenes()
    const sel = get().ordenSeleccionada
    if (sel && sel.id === id) set({ ordenSeleccionada: get().ordenes.find(o => o.id === id) ?? null })
  },

  recepcionarMercaderia: async (ordenId) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const orden = get().ordenes.find(o => o.id === ordenId)
    const items = await db.select<any[]>('SELECT * FROM items_orden_compra WHERE orden_id = ?', [ordenId])
    for (const it of items) {
      await db.execute('UPDATE productos SET stock = stock + ?, actualizado_en = ? WHERE id = ?', [it.cantidad, now, it.producto_id])
      await db.execute(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia_id, fecha, creado_en)
         VALUES (?, 'entrada', ?, ?, ?, ?, ?)`,
        [it.producto_id, it.cantidad, `Recepción OC #${String(orden?.numero ?? ordenId).padStart(3, '0')}`, ordenId, now, now]
      )
      await db.execute('UPDATE items_orden_compra SET recibido = 1 WHERE id = ?', [it.id])
    }
  },

  cargarItemsOrden: async (ordenId) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT i.*, p.nombre as producto_nombre FROM items_orden_compra i
       JOIN productos p ON i.producto_id = p.id WHERE i.orden_id = ?`,
      [ordenId]
    )
    set({
      items: rows.map(r => ({
        id: r.id,
        ordenId: r.orden_id,
        productoId: r.producto_id,
        productoNombre: r.producto_nombre,
        cantidad: r.cantidad,
        precioCosto: r.precio_costo ?? 0,
        recibido: r.recibido ?? 0,
      })),
    })
  },

  agregarItemOrden: async (ordenId, productoId, cantidad, precioCosto) => {
    const db = await getDb()
    await db.execute(
      `INSERT INTO items_orden_compra (orden_id, producto_id, cantidad, precio_costo) VALUES (?, ?, ?, ?)`,
      [ordenId, productoId, cantidad, precioCosto]
    )
    await recalcularTotal(db, ordenId)
    await get().cargarItemsOrden(ordenId)
    await get().cargarOrdenes()
  },

  // Actualiza la cantidad de un item ya persistido de la orden. Se usa desde
  // RecepcionMercaderia para que la cantidad efectivamente recibida (que puede diferir
  // de la pedida originalmente) quede escrita en items_orden_compra ANTES de confirmar
  // la recepción — recepcionarMercaderia() suma a stock justamente ese valor.
  actualizarCantidadItem: async (itemId, cantidad) => {
    const db = await getDb()
    await db.execute('UPDATE items_orden_compra SET cantidad = ? WHERE id = ?', [cantidad, itemId])
    const rows = await db.select<any[]>('SELECT orden_id FROM items_orden_compra WHERE id = ?', [itemId])
    const ordenId = rows[0]?.orden_id
    if (ordenId) {
      await recalcularTotal(db, ordenId)
      await get().cargarItemsOrden(ordenId)
      await get().cargarOrdenes()
    }
  },

  eliminarItemOrden: async (itemId) => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT orden_id FROM items_orden_compra WHERE id = ?', [itemId])
    const ordenId = rows[0]?.orden_id
    await db.execute('DELETE FROM items_orden_compra WHERE id = ?', [itemId])
    if (ordenId) {
      await recalcularTotal(db, ordenId)
      await get().cargarItemsOrden(ordenId)
      await get().cargarOrdenes()
    }
  },

  eliminarOrden: async (ordenId) => {
    const db = await getDb()
    await db.execute('DELETE FROM items_orden_compra WHERE orden_id = ?', [ordenId])
    await db.execute('DELETE FROM ordenes_compra WHERE id = ?', [ordenId])
    await get().cargarOrdenes()
  },

  seleccionarOrden: (o) => set({ ordenSeleccionada: o }),
}))

async function recalcularTotal(db: Awaited<ReturnType<typeof getDb>>, ordenId: number) {
  const rows = await db.select<{ total: number | null }[]>(
    'SELECT SUM(cantidad * precio_costo) as total FROM items_orden_compra WHERE orden_id = ?', [ordenId]
  )
  await db.execute('UPDATE ordenes_compra SET total = ?, actualizado_en = ? WHERE id = ?',
    [rows[0].total ?? 0, new Date().toISOString(), ordenId])
}
