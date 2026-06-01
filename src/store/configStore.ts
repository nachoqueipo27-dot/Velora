import { create } from 'zustand'
import { getDb } from '../db'
import { useSessionStore } from './sessionStore'
import { useInventarioStore } from './inventarioStore'
import { registrarActividad } from '../lib/registrarActividad'

export interface BloqueConfig {
  id: string
  tipo: string
  activo: boolean
  negrita?: boolean
  texto?: string
}

export interface TicketConfig {
  bloques: BloqueConfig[]
  anchoPapel: '58mm' | '80mm'
  impresoraNombre: string | null
}

export interface AlertasConfig {
  diasSinMovimiento: number
  stockMinimoDefault: number
  cargaLibreMax: number
  cargaModeradoMax: number
  faltasMes: number
  umbralVariacion: number
}

export interface CodigosBarrasConfig {
  formato: 'EAN-13' | 'EAN-8' | 'Code128' | 'QR'
  tamanio: 'pequena' | 'mediana' | 'grande'
}

export interface BackupConfig {
  frecuencia: 'horas' | 'diario' | 'cierre'
  cadaHoras: number
  horaDiaria: string
  destinos: string[]
  limite: number
  umbralEspacioMB: number
}

export interface MotivoCancelacion { id: number; nombre: string; fijo: boolean }
export interface TipoCambio { id: number; valor: number; fecha: string; creadoPor: string }
export interface RegistroBackup { id: number; ruta: string; tamanio: number; estado: string; tipo: string; creadoEn: string }
export interface RegistroActividad {
  id: number; usuario: string; modulo: string; accion: string; detalle: string | null
  entidadTipo: string | null; entidadId: number | null; campoAnterior: string | null; campoNuevo: string | null; fecha: string
}

export const ALERTAS_DEFAULT: AlertasConfig = {
  diasSinMovimiento: 3, stockMinimoDefault: 5, cargaLibreMax: 2, cargaModeradoMax: 5, faltasMes: 3, umbralVariacion: 20,
}
export const CODIGOS_DEFAULT: CodigosBarrasConfig = { formato: 'EAN-13', tamanio: 'mediana' }
export const BACKUP_DEFAULT: BackupConfig = {
  frecuencia: 'diario', cadaHoras: 6, horaDiaria: '23:00', destinos: [''], limite: 30, umbralEspacioMB: 500,
}

interface ConfigStore {
  ticket: TicketConfig | null
  pdfs: Record<string, BloqueConfig[]>
  motivos: MotivoCancelacion[]
  tipoCambioActual: number
  historialTC: TipoCambio[]
  alertas: AlertasConfig
  codigos: CodigosBarrasConfig
  backupCfg: BackupConfig
  categoriasGastos: string[]
  backups: RegistroBackup[]

  cargarTodo: () => Promise<void>
  guardarTicket: (cfg: TicketConfig) => Promise<void>
  guardarPDF: (tipo: string, bloques: BloqueConfig[]) => Promise<void>
  crearMotivo: (nombre: string) => Promise<void>
  eliminarMotivo: (id: number) => Promise<void>
  actualizarTipoCambio: (valor: number, recalcular: boolean) => Promise<void>
  guardarAlertas: (cfg: AlertasConfig) => Promise<void>
  guardarCodigos: (cfg: CodigosBarrasConfig) => Promise<void>
  guardarBackupCfg: (cfg: BackupConfig) => Promise<void>
  crearCatGasto: (nombre: string) => Promise<void>
  editarCatGasto: (anterior: string, nuevo: string) => Promise<void>
  eliminarCatGasto: (nombre: string) => Promise<void>
  cargarBackups: () => Promise<void>
}

async function getKV<T>(db: Awaited<ReturnType<typeof getDb>>, clave: string, def: T): Promise<T> {
  const rows = await db.select<{ valor: string }[]>('SELECT valor FROM configuracion WHERE clave = ?', [clave])
  if (rows.length === 0) return def
  try { return { ...def, ...JSON.parse(rows[0].valor) } } catch { return def }
}
async function setKV(db: Awaited<ReturnType<typeof getDb>>, clave: string, valor: unknown) {
  await db.execute(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [clave, JSON.stringify(valor)]
  )
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  ticket: null,
  pdfs: {},
  motivos: [],
  tipoCambioActual: 0,
  historialTC: [],
  alertas: ALERTAS_DEFAULT,
  codigos: CODIGOS_DEFAULT,
  backupCfg: BACKUP_DEFAULT,
  categoriasGastos: [],
  backups: [],

  cargarTodo: async () => {
    const db = await getDb()
    const tRows = await db.select<any[]>('SELECT * FROM configuracion_ticket WHERE id = 1')
    const ticket: TicketConfig = tRows[0]
      ? { bloques: JSON.parse(tRows[0].bloques), anchoPapel: tRows[0].ancho_papel ?? '80mm', impresoraNombre: tRows[0].impresora_nombre ?? null }
      : { bloques: [], anchoPapel: '80mm', impresoraNombre: null }

    const pRows = await db.select<any[]>('SELECT * FROM configuracion_pdf')
    const pdfs: Record<string, BloqueConfig[]> = {}
    pRows.forEach(r => { pdfs[r.tipo] = JSON.parse(r.bloques) })

    const mRows = await db.select<any[]>('SELECT * FROM motivos_cancelacion ORDER BY fijo DESC, nombre ASC')
    const motivos = mRows.map(r => ({ id: r.id, nombre: r.nombre, fijo: r.fijo === 1 }))

    const tcRows = await db.select<any[]>('SELECT * FROM tipos_cambio ORDER BY creado_en DESC')
    const historialTC = tcRows.map(r => ({ id: r.id, valor: r.valor, fecha: r.fecha, creadoPor: r.creado_por }))

    const alertas = await getKV(db, 'alertas', ALERTAS_DEFAULT)
    const codigos = await getKV(db, 'codigos_barras', CODIGOS_DEFAULT)
    const backupCfg = await getKV(db, 'backup', BACKUP_DEFAULT)
    const catRows = await db.select<{ valor: string }[]>('SELECT valor FROM configuracion WHERE clave = ?', ['categorias_gastos'])
    const categoriasGastos = catRows.length ? JSON.parse(catRows[0].valor) : []

    set({ ticket, pdfs, motivos, historialTC, tipoCambioActual: historialTC[0]?.valor ?? 0, alertas, codigos, backupCfg, categoriasGastos })
    await get().cargarBackups()
  },

  guardarTicket: async (cfg) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO configuracion_ticket (id, bloques, ancho_papel, impresora_nombre, actualizado_en)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET bloques=excluded.bloques, ancho_papel=excluded.ancho_papel, impresora_nombre=excluded.impresora_nombre, actualizado_en=excluded.actualizado_en`,
      [JSON.stringify(cfg.bloques), cfg.anchoPapel, cfg.impresoraNombre, now]
    )
    set({ ticket: cfg })
    await registrarActividad({ modulo: 'Configuración', accion: 'Editó el ticket' })
  },

  guardarPDF: async (tipo, bloques) => {
    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO configuracion_pdf (tipo, bloques, actualizado_en) VALUES (?, ?, ?)
       ON CONFLICT(tipo) DO UPDATE SET bloques=excluded.bloques, actualizado_en=excluded.actualizado_en`,
      [tipo, JSON.stringify(bloques), now]
    )
    set({ pdfs: { ...get().pdfs, [tipo]: bloques } })
    await registrarActividad({ modulo: 'Configuración', accion: `Editó el PDF de ${tipo}` })
  },

  crearMotivo: async (nombre) => {
    const db = await getDb()
    await db.execute('INSERT INTO motivos_cancelacion (nombre, fijo, creado_en) VALUES (?, 0, ?)', [nombre, new Date().toISOString()])
    const mRows = await db.select<any[]>('SELECT * FROM motivos_cancelacion ORDER BY fijo DESC, nombre ASC')
    set({ motivos: mRows.map(r => ({ id: r.id, nombre: r.nombre, fijo: r.fijo === 1 })) })
  },

  eliminarMotivo: async (id) => {
    const db = await getDb()
    await db.execute('DELETE FROM motivos_cancelacion WHERE id = ? AND fijo = 0', [id])
    set({ motivos: get().motivos.filter(m => m.id !== id) })
  },

  actualizarTipoCambio: async (valor, recalcular) => {
    const db = await getDb()
    const now = new Date().toISOString()
    const usuario = useSessionStore.getState().usuario?.nombre ?? 'Administrador'
    await db.execute(
      `INSERT INTO tipos_cambio (valor, fecha, creado_por, creado_en) VALUES (?, ?, ?, ?)`,
      [valor, now, usuario, now]
    )
    if (recalcular) {
      const prods = await db.select<any[]>(`SELECT id, precio, precio_costo FROM productos WHERE moneda_costo = 'USD'`)
      for (const p of prods) {
        const nuevo = Math.round(p.precio_costo * valor)
        await db.execute('UPDATE productos SET precio = ?, actualizado_en = ? WHERE id = ?', [nuevo, now, p.id])
        await db.execute(
          `INSERT INTO historial_precios (producto_id, precio_anterior, precio_nuevo, motivo, aplicado_por, fecha, creado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [p.id, p.precio, nuevo, `Recálculo por TC $${valor}`, usuario, now, now]
        )
      }
      await useInventarioStore.getState().cargarProductos()
    }
    await registrarActividad({ modulo: 'Configuración', accion: 'Actualizó el tipo de cambio', detalle: `$${valor}${recalcular ? ' (recalculó precios USD)' : ''}` })
    const tcRows = await db.select<any[]>('SELECT * FROM tipos_cambio ORDER BY creado_en DESC')
    const historialTC = tcRows.map(r => ({ id: r.id, valor: r.valor, fecha: r.fecha, creadoPor: r.creado_por }))
    set({ historialTC, tipoCambioActual: historialTC[0]?.valor ?? valor })
  },

  guardarAlertas: async (cfg) => {
    const db = await getDb()
    await setKV(db, 'alertas', cfg)
    set({ alertas: cfg })
    await registrarActividad({ modulo: 'Configuración', accion: 'Editó alertas globales' })
  },

  guardarCodigos: async (cfg) => {
    const db = await getDb()
    await setKV(db, 'codigos_barras', cfg)
    set({ codigos: cfg })
  },

  guardarBackupCfg: async (cfg) => {
    const db = await getDb()
    await setKV(db, 'backup', cfg)
    set({ backupCfg: cfg })
  },

  crearCatGasto: async (nombre) => {
    const db = await getDb()
    const lista = Array.from(new Set([...get().categoriasGastos, nombre]))
    await setKV(db, 'categorias_gastos', lista)
    set({ categoriasGastos: lista })
  },

  editarCatGasto: async (anterior, nuevo) => {
    const db = await getDb()
    const lista = get().categoriasGastos.map(c => c === anterior ? nuevo : c)
    await setKV(db, 'categorias_gastos', lista)
    set({ categoriasGastos: lista })
  },

  eliminarCatGasto: async (nombre) => {
    const db = await getDb()
    const lista = get().categoriasGastos.filter(c => c !== nombre)
    await setKV(db, 'categorias_gastos', lista)
    set({ categoriasGastos: lista })
  },

  cargarBackups: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM backups ORDER BY creado_en DESC')
    set({ backups: rows.map(r => ({ id: r.id, ruta: r.ruta, tamanio: r.tamanio ?? 0, estado: r.estado, tipo: r.tipo, creadoEn: r.creado_en })) })
  },
}))
