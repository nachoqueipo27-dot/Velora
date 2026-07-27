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

  // Usuarios con acceso al sistema (login único por DNI, 100% local). El primer
  // usuario que completa el onboarding se convierte en Admin General de esta
  // instalación — no vive en ningún servidor remoto.
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
  // Columna es_local (1: se puede eliminar libremente · 0: Admin General, protegido).
  try {
    await db.execute(`ALTER TABLE usuarios_master ADD COLUMN es_local INTEGER DEFAULT 1`)
  } catch { /* la columna ya existe */ }
  // Pregunta de seguridad para recuperar la contraseña: id fijo (de una lista de 3
  // opciones) + respuesta cifrada con bcrypt, mismo mecanismo que la password.
  try {
    await db.execute(`ALTER TABLE usuarios_master ADD COLUMN pregunta_seguridad_id TEXT`)
  } catch { /* la columna ya existe */ }
  try {
    await db.execute(`ALTER TABLE usuarios_master ADD COLUMN respuesta_seguridad_hash TEXT`)
  } catch { /* la columna ya existe */ }
  // Índice único por DNI (permite ON CONFLICT(dni)).
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS usuarios_master_dni_unique ON usuarios_master(dni)`)
}

// Indica si ya existe algún usuario registrado en esta instalación. No crea ningún
// usuario — solo se usa para decidir si mostrar Onboarding (crea el primer usuario,
// que se convierte en Admin General) o el Login.
export async function existeUsuarioMaster(): Promise<boolean> {
  const db = await getMasterDb()
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM usuarios_master`
  )
  return (rows[0]?.count ?? 0) > 0
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

// Guarda/actualiza un usuario en el cache local (upsert por DNI). La contraseña
// siempre se cifra con bcrypt.
export async function guardarUsuarioLocal(
  usuario: { nombre: string; dni: string; rol: string },
  password: string
): Promise<void> {
  const db = await getMasterDb()
  const now = new Date().toISOString()
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

// Cambia la contraseña de un usuario ya existente — usado por el flujo de
// recuperación vía pregunta de seguridad. No toca nombre/rol/pregunta de seguridad.
export async function cambiarPassword(dni: string, nuevaPassword: string): Promise<void> {
  const db = await getMasterDb()
  const passwordHash = await hashPassword(nuevaPassword)
  await db.execute(`UPDATE usuarios_master SET password = ? WHERE dni = ?`, [passwordHash, dni])
}

// Guarda la pregunta de seguridad elegida (id de una lista fija de 3) junto con el
// hash bcrypt de la respuesta (calculado por el caller vía hash_password).
export async function guardarPreguntaSeguridad(
  dni: string,
  preguntaId: string,
  respuestaHash: string
): Promise<void> {
  const db = await getMasterDb()
  await db.execute(
    `UPDATE usuarios_master SET pregunta_seguridad_id = ?, respuesta_seguridad_hash = ? WHERE dni = ?`,
    [preguntaId, respuestaHash, dni]
  )
}

// Devuelve la pregunta de seguridad + hash de respuesta guardados para un DNI, o
// null si el usuario no existe o todavía no tiene pregunta configurada.
export async function obtenerPreguntaSeguridad(
  dni: string
): Promise<{ preguntaId: string; respuestaHash: string } | null> {
  const db = await getMasterDb()
  const rows = await db.select<{ pregunta_seguridad_id: string | null; respuesta_seguridad_hash: string | null }[]>(
    `SELECT pregunta_seguridad_id, respuesta_seguridad_hash FROM usuarios_master WHERE dni = ?`,
    [dni]
  )
  if (rows.length === 0) return null
  const { pregunta_seguridad_id, respuesta_seguridad_hash } = rows[0]
  if (!pregunta_seguridad_id || !respuesta_seguridad_hash) return null
  return { preguntaId: pregunta_seguridad_id, respuestaHash: respuesta_seguridad_hash }
}
