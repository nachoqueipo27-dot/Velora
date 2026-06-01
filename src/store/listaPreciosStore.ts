import { create } from 'zustand'
import { getDb } from '../db'
import { useSessionStore } from './sessionStore'
import type { ItemListaPrecios, HistorialPrecio, SnapshotLista, ItemSnapshotPrecio } from '../types/listaPrecios'

interface ListaPreciosStore {
  items: ItemListaPrecios[]
  historial: HistorialPrecio[]
  snapshots: SnapshotLista[]
  previsualizacion: ItemListaPrecios[] | null
  loading: boolean

  cargarItems: () => Promise<void>
  previsualizarAumento: (porcentaje: number, categoriaId?: number | null) => void
  cancelarPrevisualizacion: () => void
  aplicarAumento: (porcentaje: number, categoriaId?: number | null, motivo?: string) => Promise<void>
  editarPrecioIndividual: (productoId: number, precioNuevo: number, motivo?: string) => Promise<void>
  cargarHistorial: (productoId?: number) => Promise<void>
  cargarSnapshots: () => Promise<void>
  guardarSnapshot: (nombre: string, descripcion: string) => Promise<void>
  restaurarSnapshot: (snapshotId: number) => Promise<void>
}

const usuarioActual = () => useSessionStore.getState().usuario?.nombre ?? 'Administrador'

const mapItem = (r: any): ItemListaPrecios => ({
  productoId: r.id,
  nombre: r.nombre,
  categoria: r.categoria_nombre ?? '',
  categoriaId: r.categoria_id ?? null,
  tipo: r.tipo,
  precioCosto: r.precio_costo ?? 0,
  precioActual: r.precio ?? 0,
})

export const useListaPreciosStore = create<ListaPreciosStore>((set, get) => ({
  items: [],
  historial: [],
  snapshots: [],
  previsualizacion: null,
  loading: false,

  cargarItems: async () => {
    set({ loading: true })
    try {
      const db = await getDb()
      const rows = await db.select<any[]>(
        `SELECT p.id, p.nombre, p.tipo, p.precio, p.precio_costo, p.categoria_id, c.nombre as categoria_nombre
         FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
         WHERE p.activo = 1 ORDER BY p.nombre ASC`
      )
      set({ items: rows.map(mapItem), loading: false })
    } catch (e) {
      console.error('cargarItems', e)
      set({ loading: false })
    }
  },

  previsualizarAumento: (porcentaje, categoriaId) => {
    const factor = 1 + porcentaje / 100
    const afectados = get().items
      .filter(i => categoriaId == null || i.categoriaId === categoriaId)
      .map(i => {
        const precioNuevo = Math.round(i.precioActual * factor * 100) / 100
        return { ...i, precioNuevo, variacion: porcentaje }
      })
    set({ previsualizacion: afectados })
  },

  cancelarPrevisualizacion: () => set({ previsualizacion: null }),

  aplicarAumento: async (porcentaje, categoriaId, motivo) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const factor = 1 + porcentaje / 100
    const afectados = get().items.filter(i => categoriaId == null || i.categoriaId === categoriaId)
    const por = usuarioActual()

    for (const i of afectados) {
      const precioNuevo = Math.round(i.precioActual * factor * 100) / 100
      if (precioNuevo === i.precioActual) continue
      await db.execute('UPDATE productos SET precio = ?, actualizado_en = ? WHERE id = ?', [precioNuevo, now, i.productoId])
      await db.execute(
        `INSERT INTO historial_precios (producto_id, precio_anterior, precio_nuevo, porcentaje, motivo, aplicado_por, fecha, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.productoId, i.precioActual, precioNuevo, porcentaje, motivo ?? null, por, now, now]
      )
    }

    // Snapshot automático
    await guardarSnapshotInterno(db, `Actualización ${formatFecha(now)}`, `Aumento del ${porcentaje}%`, por, now)

    set({ previsualizacion: null })
    await get().cargarItems()
    await get().cargarSnapshots()
    await get().cargarHistorial()
  },

  editarPrecioIndividual: async (productoId, precioNuevo, motivo) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const item = get().items.find(i => i.productoId === productoId)
    if (!item || precioNuevo === item.precioActual) { await get().cargarItems(); return }
    const por = usuarioActual()
    await db.execute('UPDATE productos SET precio = ?, actualizado_en = ? WHERE id = ?', [precioNuevo, now, productoId])
    await db.execute(
      `INSERT INTO historial_precios (producto_id, precio_anterior, precio_nuevo, porcentaje, motivo, aplicado_por, fecha, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [productoId, item.precioActual, precioNuevo, null, motivo ?? 'Edición manual', por, now, now]
    )
    await get().cargarItems()
  },

  cargarHistorial: async (productoId) => {
    const db = await getDb()
    const rows = productoId
      ? await db.select<any[]>(
          `SELECT h.*, p.nombre as producto_nombre FROM historial_precios h
           JOIN productos p ON h.producto_id = p.id WHERE h.producto_id = ? ORDER BY h.fecha DESC`, [productoId])
      : await db.select<any[]>(
          `SELECT h.*, p.nombre as producto_nombre FROM historial_precios h
           JOIN productos p ON h.producto_id = p.id ORDER BY h.fecha DESC`)
    set({
      historial: rows.map(r => ({
        id: r.id,
        productoId: r.producto_id,
        productoNombre: r.producto_nombre,
        precioAnterior: r.precio_anterior,
        precioNuevo: r.precio_nuevo,
        porcentaje: r.porcentaje ?? null,
        motivo: r.motivo ?? null,
        aplicadoPor: r.aplicado_por,
        fecha: r.fecha,
      })),
    })
  },

  cargarSnapshots: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM listas_precios_snapshot ORDER BY creado_en DESC')
    set({
      snapshots: rows.map(r => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion ?? '',
        snapshot: parseSnapshot(r.snapshot),
        creadoPor: r.creado_por,
        vigenciaDesde: r.vigencia_desde,
        creadoEn: r.creado_en,
      })),
    })
  },

  guardarSnapshot: async (nombre, descripcion) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await guardarSnapshotInterno(db, nombre, descripcion, usuarioActual(), now)
    await get().cargarSnapshots()
  },

  restaurarSnapshot: async (snapshotId) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const snap = get().snapshots.find(s => s.id === snapshotId)
    if (!snap) return
    const por = usuarioActual()
    for (const item of snap.snapshot) {
      const rows = await db.select<any[]>('SELECT precio FROM productos WHERE id = ?', [item.productoId])
      if (rows.length === 0) continue
      const precioAnterior = rows[0].precio
      if (precioAnterior === item.precio) continue
      await db.execute('UPDATE productos SET precio = ?, actualizado_en = ? WHERE id = ?', [item.precio, now, item.productoId])
      await db.execute(
        `INSERT INTO historial_precios (producto_id, precio_anterior, precio_nuevo, porcentaje, motivo, aplicado_por, fecha, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.productoId, precioAnterior, item.precio, null, `Restauración de lista: ${snap.nombre}`, por, now, now]
      )
    }
    await get().cargarItems()
    await get().cargarHistorial()
  },
}))

function formatFecha(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function parseSnapshot(raw: string): ItemSnapshotPrecio[] {
  try { return JSON.parse(raw) } catch { return [] }
}

async function guardarSnapshotInterno(
  db: Awaited<ReturnType<typeof getDb>>, nombre: string, descripcion: string, por: string, now: string,
) {
  const productos = await db.select<any[]>('SELECT id, nombre, precio FROM productos WHERE activo = 1')
  const snapshot = JSON.stringify(productos.map(p => ({ productoId: p.id, nombre: p.nombre, precio: p.precio })))
  await db.execute(
    `INSERT INTO listas_precios_snapshot (nombre, descripcion, snapshot, creado_por, vigencia_desde, creado_en)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [nombre, descripcion, snapshot, por, now, now]
  )
}
