import { save, open } from '@tauri-apps/plugin-dialog'
import { copyFile, readFile, writeFile, mkdir, exists } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import { getDb } from '../db'

export type TipoBackup = 'manual' | 'automatico' | 'pre_operacion'

export async function realizarBackup(tipo: TipoBackup): Promise<boolean> {
  try {
    const dataDir = await appDataDir()
    const origen = await join(dataDir, 'velora.db')
    const fecha = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const nombre = `Velora_${fecha}.db`

    let destino: string

    if (tipo === 'manual') {
      const elegida = await save({
        defaultPath: nombre,
        filters: [{ name: 'Base de datos Velora', extensions: ['db'] }],
      })
      if (!elegida) return false
      destino = elegida
    } else {
      const carpeta = await join(dataDir, 'backups')
      if (!(await exists(carpeta))) await mkdir(carpeta, { recursive: true })
      destino = await join(carpeta, nombre)
    }

    await copyFile(origen, destino)

    const db = await getDb()
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO backups (ruta, estado, tipo, creado_en) VALUES (?, 'ok', ?, ?)`,
      [destino, tipo, now]
    )
    return true
  } catch (e) {
    console.error('Error en backup:', e)
    return false
  }
}

export async function restaurarBackup(): Promise<boolean> {
  try {
    const archivo = await open({
      filters: [{ name: 'Base de datos Velora', extensions: ['db'] }],
      multiple: false,
    })
    if (!archivo) return false

    const dataDir = await appDataDir()
    const destino = await join(dataDir, 'velora.db')

    // Backup pre-operación automático antes de restaurar
    await realizarBackup('pre_operacion')

    const contenido = await readFile(archivo as string)
    await writeFile(destino, contenido)
    return true
  } catch (e) {
    console.error('Error al restaurar:', e)
    return false
  }
}
