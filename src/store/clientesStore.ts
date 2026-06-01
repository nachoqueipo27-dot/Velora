import { create } from 'zustand'
import { getDb } from '../db'
import { registrarActividad } from '../lib/registrarActividad'
import type { Cliente, LogComunicacion, ClienteIndicadores } from '../types/clientes'

interface ClientesStore {
  clientes: Cliente[]
  loading: boolean
  error: string | null
  clienteSeleccionado: Cliente | null
  logs: LogComunicacion[]

  cargarClientes: () => Promise<void>
  crearCliente: (data: Omit<Cliente, 'id' | 'creadoEn' | 'actualizadoEn'>) => Promise<void>
  actualizarCliente: (id: number, data: Partial<Cliente>) => Promise<void>
  eliminarCliente: (id: number) => Promise<void>
  seleccionarCliente: (cliente: Cliente | null) => void
  cargarLogs: (clienteId: number) => Promise<void>
  agregarLog: (clienteId: number, responsable: string, resumen: string) => Promise<void>
  obtenerIndicadores: (clienteId: number) => Promise<ClienteIndicadores>
}

export const useClientesStore = create<ClientesStore>((set) => ({
  clientes: [],
  loading: false,
  error: null,
  clienteSeleccionado: null,
  logs: [],

  cargarClientes: async () => {
    set({ loading: true, error: null })
    try {
      const db = await getDb()
      const rows = await db.select<any[]>('SELECT * FROM clientes ORDER BY nombre ASC')
      const clientes: Cliente[] = rows.map(r => ({
        id: r.id,
        nombre: r.nombre,
        telefono: r.telefono ?? '',
        email: r.email ?? '',
        direccion: r.direccion ?? '',
        categoria: r.categoria ?? 'General',
        notas: r.notas ?? '',
        creadoEn: r.creado_en,
        actualizadoEn: r.actualizado_en,
      }))
      set({ clientes, loading: false })
    } catch (e) {
      set({ error: String(e), loading: false })
    }
  },

  crearCliente: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO clientes (nombre, telefono, email, direccion, categoria, notas, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.nombre, data.telefono, data.email, data.direccion, data.categoria, data.notas, now, now]
    )
    await registrarActividad({ modulo: 'Clientes', accion: 'Creó un cliente', detalle: data.nombre, entidadTipo: 'cliente', campoNuevo: data })
    const store = useClientesStore.getState()
    await store.cargarClientes()
  },

  actualizarCliente: async (id, data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const fields = Object.keys(data)
      .map(k => {
        const col = k.replace(/([A-Z])/g, '_$1').toLowerCase()
        return `${col} = ?`
      })
      .join(', ')
    const values = [...Object.values(data), now, id]
    await db.execute(
      `UPDATE clientes SET ${fields}, actualizado_en = ?, sync_status = 'pendiente' WHERE id = ?`,
      values
    )
    await registrarActividad({ modulo: 'Clientes', accion: 'Editó un cliente', entidadTipo: 'cliente', entidadId: id, campoNuevo: data })
    const store = useClientesStore.getState()
    await store.cargarClientes()
  },

  eliminarCliente: async (id) => {
    const db = await getDb()
    const previo = useClientesStore.getState().clientes.find(c => c.id === id)
    await db.execute('DELETE FROM clientes WHERE id = ?', [id])
    await db.execute('DELETE FROM log_comunicaciones WHERE cliente_id = ?', [id])
    await registrarActividad({ modulo: 'Clientes', accion: 'Eliminó un cliente', detalle: previo?.nombre, entidadTipo: 'cliente', entidadId: id })
    const store = useClientesStore.getState()
    await store.cargarClientes()
  },

  seleccionarCliente: (cliente) => set({ clienteSeleccionado: cliente }),

  cargarLogs: async (clienteId) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      'SELECT * FROM log_comunicaciones WHERE cliente_id = ? ORDER BY fecha DESC',
      [clienteId]
    )
    const logs: LogComunicacion[] = rows.map(r => ({
      id: r.id,
      clienteId: r.cliente_id,
      fecha: r.fecha,
      responsable: r.responsable,
      resumen: r.resumen,
      creadoEn: r.creado_en,
    }))
    set({ logs })
  },

  agregarLog: async (clienteId, responsable, resumen) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO log_comunicaciones (cliente_id, fecha, responsable, resumen, creado_en)
       VALUES (?, ?, ?, ?, ?)`,
      [clienteId, now, responsable, resumen, now]
    )
    const store = useClientesStore.getState()
    await store.cargarLogs(clienteId)
  },

  obtenerIndicadores: async (clienteId) => {
    const db = await getDb()
    const vacio: ClienteIndicadores = { totalGastado: 0, cantidadOTs: 0, ultimaVisita: null, productosMasComprados: [] }
    try {
      const existe = await db.select<any[]>("SELECT name FROM sqlite_master WHERE type='table' AND name='ordenes_trabajo'")
      if (existe.length === 0) return vacio
      const tot = await db.select<any[]>(
        `SELECT COALESCE(SUM(total_final), 0) as total FROM ordenes_trabajo WHERE cliente_id = ? AND estado = 'entregado'`, [clienteId])
      const cnt = await db.select<any[]>(`SELECT COUNT(*) as c, MAX(creado_en) as ult FROM ordenes_trabajo WHERE cliente_id = ?`, [clienteId])
      const top = await db.select<any[]>(
        `SELECT producto_nombre, COUNT(*) as freq FROM ordenes_trabajo WHERE cliente_id = ?
         GROUP BY producto_nombre ORDER BY freq DESC LIMIT 3`, [clienteId])

      // Restar las devoluciones del total gastado (si la tabla ya existe)
      let totalDevuelto = 0
      const existeDev = await db.select<any[]>("SELECT name FROM sqlite_master WHERE type='table' AND name='devoluciones'")
      if (existeDev.length > 0) {
        const dev = await db.select<any[]>(
          `SELECT COALESCE(SUM(total_devuelto), 0) as total FROM devoluciones WHERE cliente_id = ?`, [clienteId])
        totalDevuelto = dev[0]?.total ?? 0
      }

      return {
        totalGastado: Math.max(0, (tot[0]?.total ?? 0) - totalDevuelto),
        cantidadOTs: cnt[0]?.c ?? 0,
        ultimaVisita: cnt[0]?.ult ?? null,
        productosMasComprados: top.map(t => t.producto_nombre),
      }
    } catch (e) {
      console.error('obtenerIndicadores', e)
      return vacio
    }
  },
}))
