import { pdf } from '@react-pdf/renderer'
import { save } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
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
