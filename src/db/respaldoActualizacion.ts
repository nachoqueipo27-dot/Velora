import { copyFile, exists, mkdir, readFile, writeFile } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import { getVersion } from '@tauri-apps/api/app'
import type Database from '@tauri-apps/plugin-sql'

// Respaldo automático al actualizar Velora.
// El instalador NSIS reemplaza sólo la carpeta del programa; las bases viven en
// %APPDATA%\com.velora.app y no se tocan. Pero la versión nueva corre migraciones
// (CREATE/ALTER) sobre esas bases al arrancar: si una falla, queremos tener una copia
// intacta de cómo estaban antes. Por eso, cuando la versión instalada cambió, se copian
// las bases a backups/ ANTES de abrirlas — nunca con una conexión abierta.

const BASES = ['velora.db', 'velora_master.db']
// SQLx abre SQLite en modo WAL: si la app se cerró de golpe (p. ej. el instalador la
// cerró para actualizar), parte de los datos sigue en el -wal. Se copia junto a la base.
const SUFIJOS = ['', '-wal', '-shm']
const MARCA = 'version_instalada.txt'

let respaldoPromise: Promise<string[]> | null = null

// Idempotente: getDb y getMasterDb lo esperan antes de abrir su base; sólo corre una vez.
// Devuelve las rutas de las bases respaldadas (vacío si no hizo falta).
export function respaldarSiCambioVersion(): Promise<string[]> {
  if (!respaldoPromise) respaldoPromise = respaldar()
  return respaldoPromise
}

async function respaldar(): Promise<string[]> {
  try {
    const dataDir = await appDataDir()
    const actual = await getVersion()
    const anterior = await leerVersionInstalada(dataDir)
    if (anterior === actual) return []

    // Sin marca y sin base: instalación nueva, no hay nada que respaldar.
    // Sin marca pero con base: actualización desde una versión previa a este mecanismo.
    if (!(await exists(await join(dataDir, 'velora.db')))) return []

    const carpeta = await join(dataDir, 'backups')
    if (!(await exists(carpeta))) await mkdir(carpeta, { recursive: true })

    const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const prefijo = `PreActualizacion_v${anterior ?? 'anterior'}_a_v${actual}_${fecha}`
    const rutas: string[] = []

    for (const base of BASES) {
      const origen = await join(dataDir, base)
      if (!(await exists(origen))) continue
      const destino = await join(carpeta, `${prefijo}_${base}`)
      for (const sufijo of SUFIJOS) {
        if (await exists(origen + sufijo)) await copyFile(origen + sufijo, destino + sufijo)
      }
      rutas.push(destino)
    }
    return rutas
  } catch (e) {
    // Un fallo del respaldo no debe impedir que la app arranque.
    console.error('Error en respaldo pre-actualización:', e)
    return []
  }
}

async function leerVersionInstalada(dataDir: string): Promise<string | null> {
  const ruta = await join(dataDir, MARCA)
  if (!(await exists(ruta))) return null
  return new TextDecoder().decode(await readFile(ruta)).trim() || null
}

// Se llama recién cuando las migraciones de velora.db terminaron bien: así, si fallan,
// el próximo arranque vuelve a intentar con la marca vieja.
export async function confirmarVersionInstalada(database: Database, rutas: string[]) {
  try {
    const now = new Date().toISOString()
    for (const ruta of rutas) {
      await database.execute(
        `INSERT INTO backups (ruta, estado, tipo, creado_en) VALUES (?, 'ok', 'pre_actualizacion', ?)`,
        [ruta, now]
      )
    }
    const dataDir = await appDataDir()
    await writeFile(await join(dataDir, MARCA), new TextEncoder().encode(await getVersion()))
  } catch (e) {
    console.error('Error al registrar la versión instalada:', e)
  }
}
