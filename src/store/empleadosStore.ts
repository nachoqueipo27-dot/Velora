import { create } from 'zustand'
import { getDb } from '../db'
import { getMasterDb, guardarUsuarioLocal, asignarUsuarioALocal, eliminarUsuarioDeLocal } from '../db/master'
import { useNegocioStore } from './negocioStore'
import { registrarActividad } from '../lib/registrarActividad'
import type {
  Empleado, Rol, Turno, Fichaje, HoraExtra, Ausencia, HorarioFijo,
} from '../types/empleados'

export interface HorarioVigente {
  entrada: string
  salida: string
  descripcion: string
}

export interface NuevoEmpleado {
  nombre: string
  dni: string
  rolId: number
  password: string
  tipoHorario: 'fijo' | 'turno'
  activo: boolean
  horariosFijos?: HorarioFijo[]
  turnoId?: number | null
}

export interface AusenciaFiltros {
  year?: number
  month?: number
  empleadoId?: number | null
  tipo?: string | null
}

interface EmpleadosStore {
  empleados: Empleado[]
  roles: Rol[]
  turnos: Turno[]
  fichajes: Fichaje[]
  horasExtras: HoraExtra[]
  ausencias: Ausencia[]
  loading: boolean
  empleadoSeleccionado: Empleado | null

  cargarEmpleados: () => Promise<void>
  cargarRoles: () => Promise<void>
  cargarTurnos: () => Promise<void>
  crearTurno: (nombre: string, entrada: string, salida: string) => Promise<void>
  crearEmpleado: (data: NuevoEmpleado) => Promise<void>
  actualizarEmpleado: (id: number, data: NuevoEmpleado) => Promise<void>
  eliminarEmpleado: (id: number) => Promise<void>
  toggleActivo: (id: number) => Promise<void>
  seleccionarEmpleado: (e: Empleado | null) => void

  cargarHorarioFijo: (empleadoId: number) => Promise<HorarioFijo[]>
  obtenerHorarioVigente: (empleadoId: number, fechaISO: string) => Promise<HorarioVigente | null>

  cargarFichajes: (empleadoId: number, year: number, month: number) => Promise<void>
  cargarHorasExtras: (year: number, month: number) => Promise<void>
  registrarHoraExtra: (data: Omit<HoraExtra, 'id'>) => Promise<void>
  cargarAusencias: (filtros: AusenciaFiltros) => Promise<void>
  registrarAusencia: (data: Omit<Ausencia, 'id'>) => Promise<void>
}

const mapEmpleado = (r: any): Empleado => ({
  id: r.id,
  nombre: r.nombre,
  dni: r.dni ?? '',
  rolId: r.rol_id,
  rolNombre: r.rol_nombre ?? '',
  avatar: r.avatar ?? null,
  activo: r.activo === 1 || r.activo === true,
  tipoHorario: (r.tipo_horario ?? 'fijo') as 'fijo' | 'turno',
  creadoEn: r.creado_en,
  actualizadoEn: r.actualizado_en,
})

async function guardarHorarios(
  db: Awaited<ReturnType<typeof getDb>>,
  empleadoId: number,
  data: NuevoEmpleado,
) {
  const now = new Date().toISOString()
  if (data.tipoHorario === 'fijo' && data.horariosFijos) {
    await db.execute('DELETE FROM horarios_fijos WHERE empleado_id = ?', [empleadoId])
    for (const h of data.horariosFijos) {
      await db.execute(
        `INSERT INTO horarios_fijos (empleado_id, dia_semana, entrada, salida, laborable)
         VALUES (?, ?, ?, ?, ?)`,
        [empleadoId, h.diaSemana, h.laborable ? h.entrada : null, h.laborable ? h.salida : null, h.laborable ? 1 : 0]
      )
    }
  }
  if (data.tipoHorario === 'turno' && data.turnoId) {
    // Cerrar asignaciones abiertas e insertar la nueva
    await db.execute(
      'UPDATE asignacion_turnos SET hasta = ? WHERE empleado_id = ? AND hasta IS NULL',
      [now, empleadoId]
    )
    await db.execute(
      'INSERT INTO asignacion_turnos (empleado_id, turno_id, desde, hasta) VALUES (?, ?, ?, ?)',
      [empleadoId, data.turnoId, now, null]
    )
  }
}

// Registra/actualiza el usuario en master.db (login global por DNI) y lo asigna al
// local activo. Si hay password la cifra (bcrypt vía guardarUsuarioLocal); si no, solo
// actualiza nombre/rol sin tocar la contraseña. No hace nada si no hay DNI o negocio.
async function syncUsuarioMaster(data: NuevoEmpleado, roles: Rol[]) {
  const dni = data.dni?.trim()
  if (!dni) return
  const negocio = useNegocioStore.getState().negocioActivo
  if (!negocio) return
  const rol = (roles.find(r => r.id === data.rolId)?.nombre ?? 'usuario').toLowerCase()
  const masterDb = await getMasterDb()

  if (data.password && data.password.trim() !== '') {
    await guardarUsuarioLocal({ nombre: data.nombre, dni, rol }, data.password)
  } else {
    const existe = await masterDb.select<{ id: number }[]>(`SELECT id FROM usuarios_master WHERE dni = ?`, [dni])
    if (existe.length > 0) {
      await masterDb.execute(`UPDATE usuarios_master SET nombre = ?, rol = ? WHERE dni = ?`, [data.nombre, rol, dni])
    } else {
      await guardarUsuarioLocal({ nombre: data.nombre, dni, rol }, 'cambiar')
    }
  }

  const rows = await masterDb.select<{ id: number }[]>(`SELECT id FROM usuarios_master WHERE dni = ?`, [dni])
  if (rows.length > 0) await asignarUsuarioALocal(rows[0].id, negocio.empresaId, negocio.localId)
}

export const useEmpleadosStore = create<EmpleadosStore>((set, get) => ({
  empleados: [],
  roles: [],
  turnos: [],
  fichajes: [],
  horasExtras: [],
  ausencias: [],
  loading: false,
  empleadoSeleccionado: null,

  cargarEmpleados: async () => {
    set({ loading: true })
    try {
      const db = await getDb()
      const rows = await db.select<any[]>(
        `SELECT e.*, r.nombre as rol_nombre
         FROM empleados e JOIN roles r ON e.rol_id = r.id
         ORDER BY e.nombre ASC`
      )
      set({ empleados: rows.map(mapEmpleado), loading: false })
    } catch (e) {
      console.error('cargarEmpleados', e)
      set({ loading: false })
    }
  },

  cargarRoles: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM roles ORDER BY id ASC')
    set({ roles: rows.map(r => ({ id: r.id, nombre: r.nombre, esAdmin: r.es_admin === 1 })) })
  },

  cargarTurnos: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM turnos ORDER BY entrada ASC')
    set({ turnos: rows.map(r => ({ id: r.id, nombre: r.nombre, entrada: r.entrada, salida: r.salida })) })
  },

  crearTurno: async (nombre, entrada, salida) => {
    const db = await getDb()
    await db.execute(
      'INSERT INTO turnos (nombre, entrada, salida, creado_en) VALUES (?, ?, ?, ?)',
      [nombre, entrada, salida, new Date().toISOString()]
    )
    await get().cargarTurnos()
  },

  crearEmpleado: async (data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const res = await db.execute(
      `INSERT INTO empleados (nombre, dni, rol_id, password, activo, tipo_horario, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.nombre, data.dni?.trim() || null, data.rolId, btoa(data.password || 'cambiar'), data.activo ? 1 : 0, data.tipoHorario, now, now]
    )
    const empleadoId = Number(res.lastInsertId)
    await guardarHorarios(db, empleadoId, data)
    // Registrar también en master.db para login global por DNI.
    await syncUsuarioMaster(data, get().roles)
    await registrarActividad({ modulo: 'Empleados', accion: 'Creó un empleado', detalle: data.nombre, entidadTipo: 'empleado', entidadId: empleadoId })
    await get().cargarEmpleados()
  },

  actualizarEmpleado: async (id, data) => {
    const db = await getDb()
    const now = new Date().toISOString()
    if (data.password && data.password.trim() !== '') {
      await db.execute(
        `UPDATE empleados SET nombre = ?, dni = ?, rol_id = ?, password = ?, activo = ?, tipo_horario = ?, actualizado_en = ?, sync_status = 'pendiente' WHERE id = ?`,
        [data.nombre, data.dni?.trim() || null, data.rolId, btoa(data.password), data.activo ? 1 : 0, data.tipoHorario, now, id]
      )
    } else {
      await db.execute(
        `UPDATE empleados SET nombre = ?, dni = ?, rol_id = ?, activo = ?, tipo_horario = ?, actualizado_en = ?, sync_status = 'pendiente' WHERE id = ?`,
        [data.nombre, data.dni?.trim() || null, data.rolId, data.activo ? 1 : 0, data.tipoHorario, now, id]
      )
    }
    await guardarHorarios(db, id, data)
    // Reflejar cambios en master.db (login global por DNI).
    await syncUsuarioMaster(data, get().roles)
    await registrarActividad({ modulo: 'Empleados', accion: 'Editó un empleado', detalle: data.nombre, entidadTipo: 'empleado', entidadId: id })
    await get().cargarEmpleados()
    const sel = get().empleadoSeleccionado
    if (sel && sel.id === id) {
      const actualizado = get().empleados.find(e => e.id === id) ?? null
      set({ empleadoSeleccionado: actualizado })
    }
  },

  eliminarEmpleado: async (id) => {
    const db = await getDb()
    const emp = get().empleados.find(e => e.id === id)
    // Limpiar dependencias y el empleado en la DB del local.
    try { await db.execute('DELETE FROM horarios_fijos WHERE empleado_id = ?', [id]) } catch { /* tabla opcional */ }
    try { await db.execute('DELETE FROM asignacion_turnos WHERE empleado_id = ?', [id]) } catch { /* tabla opcional */ }
    await db.execute('DELETE FROM empleados WHERE id = ?', [id])
    // Quitar del cache de login global (master.db) para el local activo.
    if (emp?.dni) {
      const negocio = useNegocioStore.getState().negocioActivo
      if (negocio) await eliminarUsuarioDeLocal(emp.dni, negocio.localId)
    }
    await registrarActividad({ modulo: 'Empleados', accion: 'Eliminó un empleado', detalle: emp?.nombre ?? String(id), entidadTipo: 'empleado', entidadId: id })
    await get().cargarEmpleados()
  },

  toggleActivo: async (id) => {
    const db = await getDb()
    const emp = get().empleados.find(e => e.id === id)
    if (!emp) return
    await db.execute(
      'UPDATE empleados SET activo = ?, actualizado_en = ? WHERE id = ?',
      [emp.activo ? 0 : 1, new Date().toISOString(), id]
    )
    await get().cargarEmpleados()
  },

  seleccionarEmpleado: (e) => set({ empleadoSeleccionado: e }),

  cargarHorarioFijo: async (empleadoId) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      'SELECT * FROM horarios_fijos WHERE empleado_id = ? ORDER BY dia_semana ASC',
      [empleadoId]
    )
    return rows.map(r => ({
      diaSemana: r.dia_semana,
      entrada: r.entrada ?? null,
      salida: r.salida ?? null,
      laborable: r.laborable === 1,
    }))
  },

  obtenerHorarioVigente: async (empleadoId, fechaISO) => {
    const db = await getDb()
    const empRows = await db.select<any[]>('SELECT tipo_horario FROM empleados WHERE id = ?', [empleadoId])
    if (empRows.length === 0) return null
    const tipo = empRows[0].tipo_horario as 'fijo' | 'turno'
    const fecha = new Date(fechaISO)

    if (tipo === 'fijo') {
      const dia = fecha.getDay()
      const rows = await db.select<any[]>(
        'SELECT * FROM horarios_fijos WHERE empleado_id = ? AND dia_semana = ?',
        [empleadoId, dia]
      )
      const h = rows[0]
      if (h && h.laborable === 1 && h.entrada && h.salida) {
        return { entrada: h.entrada, salida: h.salida, descripcion: 'Horario fijo' }
      }
      return null
    }

    // tipo turno
    const fechaStr = fecha.toISOString()
    const rows = await db.select<any[]>(
      `SELECT t.nombre, t.entrada, t.salida FROM asignacion_turnos a
       JOIN turnos t ON a.turno_id = t.id
       WHERE a.empleado_id = ? AND a.desde <= ? AND (a.hasta IS NULL OR a.hasta >= ?)
       ORDER BY a.desde DESC LIMIT 1`,
      [empleadoId, fechaStr, fechaStr]
    )
    const t = rows[0]
    if (t) return { entrada: t.entrada, salida: t.salida, descripcion: `Turno: ${t.nombre}` }
    return null
  },

  cargarFichajes: async (empleadoId, year, month) => {
    const db = await getDb()
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const rows = await db.select<any[]>(
      `SELECT * FROM fichajes WHERE empleado_id = ? AND fecha LIKE ? ORDER BY fecha DESC`,
      [empleadoId, `${prefix}%`]
    )
    set({
      fichajes: rows.map(r => ({
        id: r.id,
        empleadoId: r.empleado_id,
        fecha: r.fecha,
        entrada: r.entrada ?? null,
        salida: r.salida ?? null,
        horasTrabajadas: r.horas_trabajadas ?? null,
        editadoPor: r.editado_por ?? null,
      })),
    })
  },

  cargarHorasExtras: async (year, month) => {
    const db = await getDb()
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const rows = await db.select<any[]>(
      `SELECT * FROM horas_extras WHERE fecha LIKE ? ORDER BY fecha DESC`,
      [`${prefix}%`]
    )
    set({
      horasExtras: rows.map(r => ({
        id: r.id,
        empleadoId: r.empleado_id,
        fecha: r.fecha,
        horarioVigente: r.horario_vigente,
        horaSalidaReal: r.hora_salida_real,
        minutosExtra: r.minutos_extra,
        tipo: r.tipo,
        observacion: r.observacion ?? null,
        registradoPor: r.registrado_por,
      })),
    })
  },

  registrarHoraExtra: async (data) => {
    const db = await getDb()
    await db.execute(
      `INSERT INTO horas_extras (empleado_id, fecha, horario_vigente, hora_salida_real, minutos_extra, tipo, observacion, registrado_por, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.empleadoId, data.fecha, data.horarioVigente, data.horaSalidaReal, data.minutosExtra, data.tipo, data.observacion, data.registradoPor, new Date().toISOString()]
    )
    const d = new Date(data.fecha)
    await get().cargarHorasExtras(d.getFullYear(), d.getMonth() + 1)
  },

  cargarAusencias: async (filtros) => {
    const db = await getDb()
    const where: string[] = []
    const params: any[] = []
    if (filtros.year && filtros.month) {
      where.push('fecha_inicio LIKE ?')
      params.push(`${filtros.year}-${String(filtros.month).padStart(2, '0')}%`)
    }
    if (filtros.empleadoId) {
      where.push('empleado_id = ?')
      params.push(filtros.empleadoId)
    }
    if (filtros.tipo) {
      where.push('tipo = ?')
      params.push(filtros.tipo)
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
    const rows = await db.select<any[]>(
      `SELECT * FROM ausencias ${clause} ORDER BY fecha_inicio DESC`,
      params
    )
    set({
      ausencias: rows.map(r => ({
        id: r.id,
        empleadoId: r.empleado_id,
        tipo: r.tipo,
        fechaInicio: r.fecha_inicio,
        fechaFin: r.fecha_fin,
        horarioAfectado: r.horario_afectado,
        observacion: r.observacion,
        comprobante: r.comprobante ?? null,
      })),
    })
  },

  registrarAusencia: async (data) => {
    const db = await getDb()
    await db.execute(
      `INSERT INTO ausencias (empleado_id, tipo, fecha_inicio, fecha_fin, horario_afectado, observacion, comprobante, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.empleadoId, data.tipo, data.fechaInicio, data.fechaFin, data.horarioAfectado, data.observacion, data.comprobante, new Date().toISOString()]
    )
    const d = new Date(data.fechaInicio)
    await get().cargarAusencias({ year: d.getFullYear(), month: d.getMonth() + 1 })
  },
}))
