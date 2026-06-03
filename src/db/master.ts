import Database from '@tauri-apps/plugin-sql'
import { hashPassword, verifyPassword, esBcrypt } from '../lib/crypto'

let masterDb: Awaited<ReturnType<typeof Database.load>> | null = null

export async function getMasterDb() {
  if (!masterDb) {
    masterDb = await Database.load('sqlite:velora_master.db')
    await initMasterSchema()
  }
  return masterDb
}

async function initMasterSchema() {
  const db = masterDb!
  await db.execute(`
    CREATE TABLE IF NOT EXISTS empresas (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre       TEXT NOT NULL,
      logo         TEXT,
      activa       INTEGER DEFAULT 1,
      remote_id    TEXT,
      creado_en    TEXT NOT NULL
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS locales (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id   INTEGER NOT NULL,
      nombre       TEXT NOT NULL,
      logo         TEXT,
      direccion    TEXT,
      activa       INTEGER DEFAULT 1,
      api_key      TEXT,
      remote_id    TEXT,
      ultima_sync  TEXT,
      creado_en    TEXT NOT NULL,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id)
    )
  `)

  // Usuarios locales (cache offline de usuarios_portal de Supabase). El identificador
  // único global es el DNI. El Admin General NO vive acá — solo en Supabase.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios_master (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre     TEXT NOT NULL,
      password   TEXT NOT NULL,
      rol        TEXT NOT NULL DEFAULT 'admin_master',
      creado_en  TEXT NOT NULL
    )
  `)
  // Columna dni (idempotente: ALTER falla si ya existe).
  try {
    await db.execute(`ALTER TABLE usuarios_master ADD COLUMN dni TEXT`)
  } catch { /* la columna ya existe */ }
  // Columna es_local (1: creado localmente · 0: admin master con copia local de Supabase).
  try {
    await db.execute(`ALTER TABLE usuarios_master ADD COLUMN es_local INTEGER DEFAULT 1`)
  } catch { /* la columna ya existe */ }
  // Índice único por DNI (permite ON CONFLICT(dni)).
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS usuarios_master_dni_unique ON usuarios_master(dni)`)

  // Relación usuario ↔ locales asignados.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuario_locales (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id  INTEGER NOT NULL REFERENCES usuarios_master(id),
      empresa_id  INTEGER NOT NULL,
      local_id    INTEGER NOT NULL,
      creado_en   TEXT NOT NULL,
      UNIQUE(usuario_id, local_id)
    )
  `)
  // El Admin General se siembra SOLO en Supabase (ver supabase/add_dni.sql). No se inserta acá.

  // Seed demo si no hay datos
  const count = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM empresas'
  )
  if (count[0].count > 0) return

  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO empresas (nombre, activa, creado_en)
     VALUES ('Mi Negocio', 1, ?)`,
    [now]
  )
  await db.execute(
    `INSERT INTO locales (empresa_id, nombre, direccion, activa, creado_en)
     VALUES (1, 'Local Principal', 'Dirección del local', 1, ?)`,
    [now]
  )
}

export interface EmpresaRow {
  id: number
  nombre: string
  logo: string | null
  activa: number
  remote_id: string | null
}

export interface LocalRow {
  id: number
  empresa_id: number
  nombre: string
  logo: string | null
  direccion: string | null
  activa: number
  api_key: string | null
  remote_id: string | null
  ultima_sync: string | null
}

export async function getEmpresas() {
  const db = await getMasterDb()
  return db.select<EmpresaRow[]>(
    'SELECT * FROM empresas WHERE activa = 1 ORDER BY nombre ASC'
  )
}

export async function getLocalesByEmpresa(empresaId: number) {
  const db = await getMasterDb()
  return db.select<LocalRow[]>(
    'SELECT * FROM locales WHERE empresa_id = ? AND activa = 1 ORDER BY nombre ASC',
    [empresaId]
  )
}

export async function crearEmpresa(nombre: string, logo?: string) {
  const db = await getMasterDb()
  const now = new Date().toISOString()
  await db.execute(
    'INSERT INTO empresas (nombre, logo, activa, creado_en) VALUES (?, ?, 1, ?)',
    [nombre, logo ?? null, now]
  )
}

export async function crearLocal(
  empresaId: number,
  nombre: string,
  direccion?: string,
  logo?: string
) {
  const db = await getMasterDb()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT INTO locales (empresa_id, nombre, direccion, logo, activa, creado_en)
     VALUES (?, ?, ?, ?, 1, ?)`,
    [empresaId, nombre, direccion ?? null, logo ?? null, now]
  )
}

export async function actualizarUltimaSync(localId: number) {
  const db = await getMasterDb()
  await db.execute(
    'UPDATE locales SET ultima_sync = ? WHERE id = ?',
    [new Date().toISOString(), localId]
  )
}

// Seed lazy del Admin General: copia local cifrada con bcrypt. Se llama desde el login
// (no en initMasterSchema) porque los comandos Tauri (invoke) recién están disponibles
// con el webview listo. es_local = 0 marca que es la copia local del admin master.
export async function seedAdminGeneralSiNoExiste(): Promise<void> {
  const db = await getMasterDb()
  const existe = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM usuarios_master WHERE dni = '42997462'`
  )
  if (existe[0].count > 0) return

  try {
    const passwordHash = await hashPassword('Dark1996$')
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO usuarios_master (nombre, dni, password, rol, es_local, creado_en)
       VALUES (?, ?, ?, 'admin_master', 0, ?)`,
      ['Administrador', '42997462', passwordHash, now]
    )
    console.log('[master] Admin General seedeado con bcrypt')
  } catch (e) {
    console.warn('[master] No se pudo seedear Admin General:', e)
  }
}

// Login local por DNI (offline, contra el cache de master.db). Verifica con bcrypt;
// los hashes legacy (btoa) se migran a bcrypt silenciosamente al primer login exitoso.
export async function loginLocal(
  dni: string,
  password: string
): Promise<{ id: number; nombre: string; dni: string; rol: string } | null> {
  const db = await getMasterDb()
  const rows = await db.select<{
    id: number; nombre: string; dni: string; rol: string; password: string; es_local: number
  }[]>(
    `SELECT * FROM usuarios_master WHERE dni = ?`,
    [dni]
  )
  if (rows.length === 0) return null

  const usuario = rows[0]
  let passwordOk = false

  if (esBcrypt(usuario.password)) {
    passwordOk = await verifyPassword(password, usuario.password)
  } else {
    // Legacy btoa — verificar y migrar a bcrypt.
    passwordOk = usuario.password === btoa(password)
    if (passwordOk) {
      try {
        const nuevoHash = await hashPassword(password)
        await db.execute(`UPDATE usuarios_master SET password = ? WHERE dni = ?`, [nuevoHash, dni])
        console.log('[master] Password migrada a bcrypt:', dni)
      } catch { /* si falla la migración, el login igual procede */ }
    }
  }

  if (!passwordOk) return null
  return { id: usuario.id, nombre: usuario.nombre, dni: usuario.dni, rol: usuario.rol }
}

// Login contra Supabase por DNI + Supabase Auth (contraseña en la nube prevalece).
export async function loginSupabase(
  dni: string,
  password: string
): Promise<{
  nombre: string
  dni: string
  rol: string
  empresaId: string | null
  localId: string | null
} | null> {
  try {
    const { supabase } = await import('../lib/supabase')
    const { data: usuario } = await supabase
      .from('usuarios_portal')
      .select('*, usuario_locales(empresa_id, local_id)')
      .eq('dni', dni)
      .single()

    if (!usuario) return null

    // Verificar contraseña vía Supabase Auth.
    const { error } = await supabase.auth.signInWithPassword({
      email: usuario.email,
      password,
    })
    if (error) return null

    // Cachear en master.db para acceso offline futuro.
    if (usuario.rol === 'admin_master') {
      // Admin General → copia local cifrada (es_local = 0). Supabase prevalece en password.
      try {
        const passwordHash = await hashPassword(password)
        const now = new Date().toISOString()
        const db = await getMasterDb()
        await db.execute(
          `INSERT INTO usuarios_master (nombre, dni, password, rol, es_local, creado_en)
           VALUES (?, ?, ?, 'admin_master', 0, ?)
           ON CONFLICT(dni) DO UPDATE SET
             nombre = excluded.nombre,
             password = excluded.password`,
          [usuario.nombre, usuario.dni, passwordHash, now]
        )
        console.log('[master] Copia local Admin General actualizada')
      } catch (e) {
        console.warn('[master] No se pudo actualizar copia local:', e)
      }
    } else {
      await guardarUsuarioLocal({ nombre: usuario.nombre, dni: usuario.dni, rol: usuario.rol, email: usuario.email }, password)
    }

    return {
      nombre: usuario.nombre,
      dni: usuario.dni,
      rol: usuario.rol,
      empresaId: usuario.usuario_locales?.[0]?.empresa_id ?? null,
      localId: usuario.usuario_locales?.[0]?.local_id ?? null,
    }
  } catch {
    return null
  }
}

// Guarda/actualiza un usuario en el cache local (upsert por DNI). La contraseña de
// Supabase prevalece en conflicto.
export async function guardarUsuarioLocal(
  usuario: { nombre: string; dni: string; rol: string; email?: string },
  password: string
): Promise<void> {
  const db = await getMasterDb()
  const now = new Date().toISOString()
  // Siempre cifrar con bcrypt (vía Rust).
  const passwordHash = await hashPassword(password)
  await db.execute(
    `INSERT INTO usuarios_master (nombre, dni, password, rol, es_local, creado_en)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(dni) DO UPDATE SET
       nombre = excluded.nombre,
       password = excluded.password,
       rol = excluded.rol`,
    [usuario.nombre, usuario.dni, passwordHash, usuario.rol, now]
  )
}

export async function getLocalesPorUsuario(
  usuarioId: number
): Promise<{ empresaId: number; localId: number }[]> {
  const db = await getMasterDb()
  return db.select<{ empresaId: number; localId: number }[]>(
    `SELECT empresa_id as empresaId, local_id as localId
     FROM usuario_locales WHERE usuario_id = ?`,
    [usuarioId]
  )
}

export async function asignarUsuarioALocal(
  usuarioId: number,
  empresaId: number,
  localId: number
): Promise<void> {
  const db = await getMasterDb()
  const now = new Date().toISOString()
  await db.execute(
    `INSERT OR IGNORE INTO usuario_locales (usuario_id, empresa_id, local_id, creado_en)
     VALUES (?, ?, ?, ?)`,
    [usuarioId, empresaId, localId, now]
  )
}

// Quita la asignación de un usuario (por DNI) a un local. Si no le quedan locales
// asignados, elimina también el usuario del cache (salvo que sea admin master / copia local).
export async function eliminarUsuarioDeLocal(
  dni: string,
  localId: number
): Promise<void> {
  if (!dni) return
  const db = await getMasterDb()
  const rows = await db.select<{ id: number; es_local: number }[]>(
    `SELECT id, es_local FROM usuarios_master WHERE dni = ?`,
    [dni]
  )
  if (rows.length === 0) return
  const { id, es_local } = rows[0]
  await db.execute(`DELETE FROM usuario_locales WHERE usuario_id = ? AND local_id = ?`, [id, localId])
  const restantes = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM usuario_locales WHERE usuario_id = ?`,
    [id]
  )
  // No borrar al admin master (copia local del Admin General).
  if (restantes[0].count === 0 && es_local === 1) {
    await db.execute(`DELETE FROM usuarios_master WHERE id = ?`, [id])
  }
}

// Asignaciones (empresa/local) de un usuario buscándolo por DNI. Vacío si no existe.
export async function getAsignacionesPorDni(
  dni: string
): Promise<{ empresaId: number; localId: number }[]> {
  const db = await getMasterDb()
  const rows = await db.select<{ id: number }[]>(`SELECT id FROM usuarios_master WHERE dni = ?`, [dni])
  if (rows.length === 0) return []
  return getLocalesPorUsuario(rows[0].id)
}
