import { create } from 'zustand'
import { getDb } from '../db'
import { useSessionStore } from './sessionStore'
import { inicioDia, finDia, inicioSemana, finSemana, inicioMes, finMes } from '../lib/fecha'
import type { Cita, VistaAgenda } from '../types/agenda'

export interface NuevaCita {
  titulo: string
  clienteId: number | null
  empleadoId: number | null
  otId: number | null
  fechaInicio: string
  fechaFin: string
  descripcion: string
  color: string
}

interface AgendaStore {
  citas: Cita[]
  vistaActiva: VistaAgenda
  fechaActiva: Date
  citaSeleccionada: Cita | null
  loading: boolean

  cargarCitas: (desde: Date, hasta: Date) => Promise<void>
  recargarRango: () => Promise<void>
  crearCita: (data: NuevaCita) => Promise<void>
  actualizarCita: (id: number, data: NuevaCita) => Promise<void>
  eliminarCita: (id: number) => Promise<void>
  setVista: (vista: VistaAgenda) => void
  navegarAnterior: () => void
  navegarSiguiente: () => void
  irAHoy: () => void
  seleccionar: (c: Cita | null) => void
  detectarSuperposicion: (empleadoId: number | null, fechaInicio: string, fechaFin: string, excludeId?: number) => Cita[]
}

const usuarioActual = () => useSessionStore.getState().usuario?.nombre ?? 'Administrador'

const mapCita = (r: any): Cita => {
  const dur = Math.round((new Date(r.fecha_fin).getTime() - new Date(r.fecha_inicio).getTime()) / 60000)
  return {
    id: r.id,
    titulo: r.titulo,
    clienteId: r.cliente_id ?? null,
    clienteNombre: r.cliente_nombre ?? null,
    empleadoId: r.empleado_id ?? null,
    empleadoNombre: r.empleado_nombre ?? null,
    otId: r.ot_id ?? null,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    descripcion: r.descripcion ?? null,
    color: r.color ?? '#4A7FA5',
    creadoPor: r.creado_por,
    duracionMinutos: dur,
  }
}

function rangoDeVista(vista: VistaAgenda, fecha: Date): [Date, Date] {
  if (vista === 'diaria') return [inicioDia(fecha), finDia(fecha)]
  if (vista === 'semanal') return [inicioSemana(fecha), finSemana(fecha)]
  return [inicioSemana(inicioMes(fecha)), finDia(new Date(finMes(fecha).getTime() + 7 * 86400000))]
}

export const useAgendaStore = create<AgendaStore>((set, get) => ({
  citas: [],
  vistaActiva: 'diaria',
  fechaActiva: new Date(),
  citaSeleccionada: null,
  loading: false,

  cargarCitas: async (desde, hasta) => {
    set({ loading: true })
    try {
      const db = await getDb()
      const rows = await db.select<any[]>(
        `SELECT c.*, cl.nombre as cliente_nombre, e.nombre as empleado_nombre
         FROM citas c
         LEFT JOIN clientes cl ON c.cliente_id = cl.id
         LEFT JOIN empleados e ON c.empleado_id = e.id
         WHERE c.fecha_inicio >= ? AND c.fecha_inicio <= ?
         ORDER BY c.fecha_inicio ASC`,
        [desde.toISOString(), hasta.toISOString()]
      )
      // El filtro usa ISO con Z; las citas se guardan en hora local sin Z.
      // Para robustez comparamos como string local-friendly: recargamos amplio y filtramos en JS.
      set({ citas: rows.map(mapCita), loading: false })
    } catch (e) {
      console.error('cargarCitas', e)
      set({ loading: false })
    }
  },

  recargarRango: async () => {
    const { vistaActiva, fechaActiva } = get()
    const [desde, hasta] = rangoDeVista(vistaActiva, fechaActiva)
    // Ampliamos el rango por seguridad de zona horaria (±1 día).
    await get().cargarCitas(new Date(desde.getTime() - 86400000), new Date(hasta.getTime() + 86400000))
  },

  crearCita: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO citas (titulo, cliente_id, empleado_id, ot_id, fecha_inicio, fecha_fin, descripcion, color, creado_por, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.titulo, data.clienteId, data.empleadoId, data.otId, data.fechaInicio, data.fechaFin, data.descripcion, data.color, usuarioActual(), now, now]
    )
    await get().recargarRango()
  },

  actualizarCita: async (id, data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `UPDATE citas SET titulo=?, cliente_id=?, empleado_id=?, ot_id=?, fecha_inicio=?, fecha_fin=?, descripcion=?, color=?, actualizado_en=? WHERE id=?`,
      [data.titulo, data.clienteId, data.empleadoId, data.otId, data.fechaInicio, data.fechaFin, data.descripcion, data.color, now, id]
    )
    await get().recargarRango()
  },

  eliminarCita: async (id) => {
    const db = await getDb()
    await db.execute('DELETE FROM citas WHERE id = ?', [id])
    await get().recargarRango()
  },

  setVista: (vista) => { set({ vistaActiva: vista }); void get().recargarRango() },

  navegarAnterior: () => {
    const { vistaActiva, fechaActiva } = get()
    const f = new Date(fechaActiva)
    if (vistaActiva === 'diaria') f.setDate(f.getDate() - 1)
    else if (vistaActiva === 'semanal') f.setDate(f.getDate() - 7)
    else f.setMonth(f.getMonth() - 1)
    set({ fechaActiva: f }); void get().recargarRango()
  },

  navegarSiguiente: () => {
    const { vistaActiva, fechaActiva } = get()
    const f = new Date(fechaActiva)
    if (vistaActiva === 'diaria') f.setDate(f.getDate() + 1)
    else if (vistaActiva === 'semanal') f.setDate(f.getDate() + 7)
    else f.setMonth(f.getMonth() + 1)
    set({ fechaActiva: f }); void get().recargarRango()
  },

  irAHoy: () => { set({ fechaActiva: new Date() }); void get().recargarRango() },

  seleccionar: (c) => set({ citaSeleccionada: c }),

  detectarSuperposicion: (empleadoId, fechaInicio, fechaFin, excludeId) => {
    if (!empleadoId) return []
    const ini = new Date(fechaInicio).getTime()
    const fin = new Date(fechaFin).getTime()
    return get().citas.filter(c =>
      c.empleadoId === empleadoId &&
      c.id !== excludeId &&
      new Date(c.fechaInicio).getTime() < fin &&
      new Date(c.fechaFin).getTime() > ini
    )
  },
}))
