import { pdf } from '@react-pdf/renderer'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile, mkdir, exists } from '@tauri-apps/plugin-fs'
import { appDataDir, join } from '@tauri-apps/api/path'
import { openPath } from '@tauri-apps/plugin-opener'
import type { ReactElement } from 'react'

export async function generarYDescargarPDF(
  documento: ReactElement,
  nombreSugerido: string,
): Promise<boolean> {
  try {
    // Generar el blob del PDF
    const blob = await pdf(documento as any).toBlob()
    const buffer = await blob.arrayBuffer()
    const bytes = new Uint8Array(buffer)

    // Diálogo de guardar
    const rutaElegida = await save({
      defaultPath: nombreSugerido,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    })

    if (!rutaElegida) return false // Usuario canceló

    await writeFile(rutaElegida, bytes)
    return true
  } catch (e) {
    console.error('Error al generar PDF:', e)
    return false
  }
}

/**
 * Genera el PDF, lo guarda en <datos de la app>/impresiones/ y lo abre con el visor del
 * sistema, desde donde se imprime. (La impresión directa a la impresora llega con el ticket.)
 */
export async function generarYAbrirPDF(documento: ReactElement, nombreArchivo: string): Promise<boolean> {
  try {
    const blob = await pdf(documento as any).toBlob()
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const carpeta = await join(await appDataDir(), 'impresiones')
    if (!(await exists(carpeta))) await mkdir(carpeta, { recursive: true })
    const ruta = await join(carpeta, nombreArchivo)
    await writeFile(ruta, bytes)
    await openPath(ruta)
    return true
  } catch (e) {
    console.error('Error al generar o abrir el PDF:', e)
    return false
  }
}
