import { open } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile, mkdir, exists, remove } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import { relaunch } from '@tauri-apps/plugin-process'
import { getDb } from '../db'
import { getMasterDb } from '../db/master'
import { exigirDueno } from '../db/acceso'
import { useAuthGlobalStore } from '../store/authGlobalStore'

// Backup completo de Velora: las DOS bases.
//   velora.db         → datos del comercio
//   velora_master.db  → usuarios y claves
//
// Formato nuevo (1.3.5): una carpeta `Velora_backup_<fecha>/` con `velora.db` y
// `velora_master.db`. Cada archivo se arma con `VACUUM INTO`: SQLite escribe una copia
// coherente que ya incluye lo que estaba en el -wal, así que no hace falta copiar -wal/-shm.
// Formato viejo: un único `.db` (solo velora.db). Restaurar acepta los dos.

export type TipoBackup = 'manual' | 'automatico' | 'pre_operacion'

const BASE = 'velora.db'
const MASTER = 'velora_master.db'

const dniActual = () => useAuthGlobalStore.getState().usuario?.dni ?? null
const textoSql = (s: string) => `'${s.replace(/'/g, "''")}'`
const fechaArchivo = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

/** Copia coherente de las dos bases dentro de `carpeta` (se crea). */
async function copiarBasesA(carpeta: string): Promise<void> {
  await mkdir(carpeta, { recursive: true })
  const db = await getDb()
  await db.execute(`VACUUM INTO ${textoSql(await join(carpeta, BASE))}`)
  const master = await getMasterDb()
  await master.execute(`VACUUM INTO ${textoSql(await join(carpeta, MASTER))}`)
}

/** Crea el backup y devuelve la carpeta, o null si el usuario canceló. Lanza si falla. */
async function crearBackup(tipo: TipoBackup): Promise<string | null> {
  let carpetaPadre: string
  if (tipo === 'manual') {
    const elegida = await open({ directory: true, recursive: true, title: 'Elegí dónde guardar el backup' })
    if (!elegida || Array.isArray(elegida)) return null
    carpetaPadre = elegida
  } else {
    carpetaPadre = await join(await appDataDir(), 'backups')
  }
  const nombre = tipo === 'pre_operacion' ? `Velora_pre_restauracion_${fechaArchivo()}` : `Velora_backup_${fechaArchivo()}`
  const destino = await join(carpetaPadre, nombre)
  await copiarBasesA(destino)

  const db = await getDb()
  await db.execute(
    `INSERT INTO backups (ruta, estado, tipo, creado_en) VALUES (?, 'ok', ?, ?)`,
    [destino, tipo, new Date().toISOString()]
  )
  return destino
}

/**
 * Backup de las dos bases. Manual: el usuario elige la carpeta (solo el dueño).
 * Automático / pre-operación: dentro de backups/ en los datos de la app.
 * Devuelve false si se canceló o falló.
 */
export async function realizarBackup(tipo: TipoBackup): Promise<boolean> {
  // Exportar la base completa a cualquier carpeta: solo el dueño.
  if (tipo === 'manual') await exigirDueno(dniActual(), 'Solo el dueño puede exportar la base.')
  try {
    return (await crearBackup(tipo)) !== null
  } catch (e) {
    console.error('Error en backup:', e)
    return false
  }
}

// ─── Restauración ────────────────────────────────────────────────────────────

/** Archivos de origen de una restauración. `master` null = formato viejo (solo velora.db). */
export interface OrigenBackup {
  base: string
  master: string | null
}

/** Formato nuevo: el usuario elige la carpeta del backup. */
export async function elegirCarpetaBackup(): Promise<OrigenBackup | null> {
  const carpeta = await open({ directory: true, recursive: true, title: 'Elegí la carpeta del backup' })
  if (!carpeta || Array.isArray(carpeta)) return null
  return origenDesdeCarpeta(carpeta)
}

/** Formato viejo: el usuario elige un archivo .db (solo velora.db). */
export async function elegirArchivoBackup(): Promise<OrigenBackup | null> {
  const archivo = await open({ filters: [{ name: 'Base de datos Velora', extensions: ['db'] }], multiple: false })
  if (!archivo || Array.isArray(archivo)) return null
  return { base: archivo, master: null }
}

/**
 * Origen a partir de la ruta guardada en el historial de backups:
 *  - carpeta del formato nuevo;
 *  - `…_velora.db` de los respaldos pre-actualización (tienen su `…_velora_master.db` al lado);
 *  - `.db` suelto del formato viejo.
 */
export async function origenDesdeRuta(ruta: string): Promise<OrigenBackup> {
  if (!/\.db$/i.test(ruta)) return origenDesdeCarpeta(ruta)
  const master = ruta.replace(/velora\.db$/, MASTER)
  return { base: ruta, master: master !== ruta && (await exists(master)) ? master : null }
}

async function origenDesdeCarpeta(carpeta: string): Promise<OrigenBackup> {
  const base = await join(carpeta, BASE)
  if (!(await exists(base))) throw new Error('La carpeta elegida no tiene un backup de Velora (falta velora.db).')
  const master = await join(carpeta, MASTER)
  return { base, master: (await exists(master)) ? master : null }
}

const CABECERA_SQLITE = 'SQLite format 3\u0000'
function validarSqlite(bytes: Uint8Array, nombre: string) {
  const cabecera = new TextDecoder().decode(bytes.slice(0, 16))
  if (cabecera !== CABECERA_SQLITE) throw new Error(`${nombre} no es una base de Velora válida.`)
}

interface ArchivoARestaurar { destino: string; bytes: Uint8Array; wal: Uint8Array | null }

async function leerOrigen(ruta: string, destino: string): Promise<ArchivoARestaurar> {
  const bytes = await readFile(ruta)
  validarSqlite(bytes, ruta)
  // Los respaldos pre-actualización copian también el -wal: si existe, se restaura con la base.
  const wal = (await exists(ruta + '-wal')) ? await readFile(ruta + '-wal') : null
  return { destino, bytes, wal }
}

/**
 * Reemplaza las bases actuales por las del backup y reinicia Velora. Solo el dueño
 * (restaurar velora_master.db reemplaza usuarios y claves).
 * 1. Lee y valida los archivos del backup (si algo falla, no se tocó nada).
 * 2. Backup pre-operación de las dos bases actuales.
 * 3. Cierra las conexiones, escribe los archivos y borra -wal/-shm viejos: si quedaran,
 *    SQLite los aplicaría sobre la base restaurada.
 * 4. Reinicia la app (al abrir corren las migraciones pendientes del backup, si es viejo).
 */
export async function restaurarBackup(origen: OrigenBackup): Promise<void> {
  await exigirDueno(dniActual(), 'Solo el dueño puede restaurar un backup.')
  const dataDir = await appDataDir()
  const archivos = [await leerOrigen(origen.base, await join(dataDir, BASE))]
  if (origen.master) archivos.push(await leerOrigen(origen.master, await join(dataDir, MASTER)))

  const previo = await crearBackup('pre_operacion')

  await (await getDb()).close()
  if (origen.master) await (await getMasterDb()).close()

  try {
    for (const a of archivos) {
      for (const sufijo of ['-wal', '-shm']) {
        if (await exists(a.destino + sufijo)) await remove(a.destino + sufijo)
      }
      await writeFile(a.destino, a.bytes)
      if (a.wal) await writeFile(a.destino + '-wal', a.wal)
    }
  } catch (e) {
    console.error('Restauración interrumpida:', e)
    throw new Error(`La restauración falló a mitad. Las bases anteriores están en ${previo}. Contactá a soporte antes de seguir usando Velora.`)
  }
  await relaunch()
}
