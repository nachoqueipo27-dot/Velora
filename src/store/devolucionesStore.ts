import { create } from 'zustand'
import { getDb } from '../db'
import { useSessionStore } from './sessionStore'
import { useInventarioStore } from './inventarioStore'
import type {
  Devolucion, ItemDevolucion, OrigenDevolucion, NuevaDevolucion,
} from '../types/devoluciones'

const usuarioActual = () => useSessionStore.getState().usuario?.nombre ?? 'Administrador'

const mapItem = (r: any): ItemDevolucion => ({
  id: r.id, devolucionId: r.devolucion_id, productoId: r.producto_id, nombre: r.nombre,
  cantidadOriginal: r.cantidad_original, cantidadDevuelta: r.cantidad_devuelta,
  precioUnitario: r.precio_unitario, subtotalDevuelto: r.subtotal_devuelto,
})

const mapDevolucion = (r: any, items: ItemDevolucion[]): Devolucion => ({
  id: r.id, numero: r.numero, tipo: r.tipo, otId: r.ot_id ?? null, ventaPosId: r.venta_pos_id ?? null,
  clienteId: r.cliente_id ?? null, clienteNombre: r.cliente_nombre ?? null, motivo: r.motivo,
  observacion: r.observacion ?? null, totalDevuelto: r.total_devuelto ?? 0, procesadoPor: r.procesado_por,
  fecha: r.fecha, items,
})

interface DevolucionesStore {
  devoluciones: Devolucion[]
  devolucionActiva: Devolucion | null

  cargarDevoluciones: () => Promise<void>
  buscarOT: (numeroOT: number) => Promise<OrigenDevolucion | null>
  buscarVentaPOS: (numeroVenta: number) => Promise<OrigenDevolucion | null>
  crearDevolucion: (data: NuevaDevolucion) => Promise<Devolucion | null>
  cargarItemsDevolucion: (devolucionId: number) => Promise<ItemDevolucion[]>
  seleccionar: (d: Devolucion | null) => void
}

export const useDevolucionesStore = create<DevolucionesStore>((set, get) => ({
  devoluciones: [],
  devolucionActiva: null,

  cargarDevoluciones: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM devoluciones ORDER BY numero DESC')
    const itemRows = await db.select<any[]>('SELECT * FROM items_devolucion')
    const porDev = new Map<number, ItemDevolucion[]>()
    itemRows.forEach(r => {
      const arr = porDev.get(r.devolucion_id) ?? []
      arr.push(mapItem(r))
      porDev.set(r.devolucion_id, arr)
    })
    set({ devoluciones: rows.map(r => mapDevolucion(r, porDev.get(r.id) ?? [])) })
  },

  buscarOT: async (numeroOT) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT o.*, c.nombre as cliente_nombre
       FROM ordenes_trabajo o LEFT JOIN clientes c ON o.cliente_id = c.id
       WHERE o.numero = ?`, [numeroOT]
    )
    if (rows.length === 0) return null
    const o = rows[0]
    return {
      tipo: 'ot',
      otId: o.id,
      ventaPosId: null,
      clienteId: o.cliente_id ?? null,
      clienteNombre: o.cliente_nombre ?? null,
      numeroOrigen: o.numero,
      fecha: o.creado_en,
      totalOriginal: o.total_final,
      items: [{
        productoId: o.producto_id,
        nombre: o.producto_nombre,
        cantidadOriginal: 1,
        precioUnitario: o.precio,
      }],
    }
  },

  buscarVentaPOS: async (numeroVenta) => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM ventas_pos WHERE numero = ?', [numeroVenta])
    if (rows.length === 0) return null
    const v = rows[0]
    const itemRows = await db.select<any[]>('SELECT * FROM items_venta_pos WHERE venta_id = ?', [v.id])
    return {
      tipo: 'pos',
      otId: null,
      ventaPosId: v.id,
      clienteId: null,
      clienteNombre: v.empleado_nombre ? `Venta POS (${v.empleado_nombre})` : null,
      numeroOrigen: v.numero,
      fecha: v.fecha,
      totalOriginal: v.total_final,
      items: itemRows.map(r => ({
        productoId: r.producto_id,
        nombre: r.nombre,
        cantidadOriginal: r.cantidad,
        precioUnitario: r.precio_unitario,
      })),
    }
  },

  crearDevolucion: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    try {
      const maxRows = await db.select<{ max: number | null }[]>('SELECT MAX(numero) as max FROM devoluciones')
      const numero = (maxRows[0].max ?? 0) + 1
      const totalDevuelto = data.items.reduce((s, it) => s + it.subtotalDevuelto, 0)

      const res = await db.execute(
        `INSERT INTO devoluciones
         (numero, tipo, ot_id, venta_pos_id, cliente_id, cliente_nombre, motivo, observacion, total_devuelto, procesado_por, fecha, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [numero, data.tipo, data.otId, data.ventaPosId, data.clienteId, data.clienteNombre,
         data.motivo, data.observacion, totalDevuelto, usuarioActual(), now, now]
      )
      const devolucionId = Number(res.lastInsertId)
      const motivoMov = `Devolución #${String(numero).padStart(3, '0')}`

      const itemsCreados: ItemDevolucion[] = []
      for (const it of data.items) {
        if (it.cantidadDevuelta <= 0) continue
        const itemRes = await db.execute(
          `INSERT INTO items_devolucion
           (devolucion_id, producto_id, nombre, cantidad_original, cantidad_devuelta, precio_unitario, subtotal_devuelto)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [devolucionId, it.productoId, it.nombre, it.cantidadOriginal, it.cantidadDevuelta, it.precioUnitario, it.subtotalDevuelto]
        )
        // Reingreso de stock
        await db.execute(
          'UPDATE productos SET stock = stock + ?, actualizado_en = ? WHERE id = ?',
          [it.cantidadDevuelta, now, it.productoId]
        )
        await db.execute(
          `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia_id, fecha, creado_en)
           VALUES (?, 'entrada', ?, ?, ?, ?, ?)`,
          [it.productoId, it.cantidadDevuelta, motivoMov, devolucionId, now, now]
        )
        itemsCreados.push({
          id: Number(itemRes.lastInsertId), devolucionId, productoId: it.productoId, nombre: it.nombre,
          cantidadOriginal: it.cantidadOriginal, cantidadDevuelta: it.cantidadDevuelta,
          precioUnitario: it.precioUnitario, subtotalDevuelto: it.subtotalDevuelto,
        })
      }

      const devolucion: Devolucion = {
        id: devolucionId, numero, tipo: data.tipo, otId: data.otId, ventaPosId: data.ventaPosId,
        clienteId: data.clienteId, clienteNombre: data.clienteNombre, motivo: data.motivo,
        observacion: data.observacion, totalDevuelto, procesadoPor: usuarioActual(), fecha: now,
        items: itemsCreados,
      }

      await get().cargarDevoluciones()
      // Refrescar inventario para reflejar el stock recuperado
      await useInventarioStore.getState().cargarProductos()
      return devolucion
    } catch (e) {
      console.error('crearDevolucion', e)
      return null
    }
  },

  cargarItemsDevolucion: async (devolucionId) => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM items_devolucion WHERE devolucion_id = ?', [devolucionId])
    return rows.map(mapItem)
  },

  seleccionar: (d) => set({ devolucionActiva: d }),
}))
