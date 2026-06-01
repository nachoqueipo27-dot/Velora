import Database from '@tauri-apps/plugin-sql'

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
