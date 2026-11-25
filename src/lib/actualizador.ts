import { check, type Update } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

// Actualizador automático de Velora.
// La app consulta `latest.json` del último Release publicado en el repo público
// nachoqueipo27-dot/velora-actualizaciones (el código vive en un repo privado)
// (endpoint y clave pública en src-tauri/tauri.conf.json → plugins.updater).
// Los Releases se crean en borrador desde CI y solo llegan a los comercios
// cuando Ignacio los publica a mano.

/** Cada cuánto se vuelve a buscar una versión nueva con la app abierta. */
export const INTERVALO_BUSQUEDA_MS = 6 * 60 * 60 * 1000

/** Roles que pueden instalar actualizaciones (el resto solo ve el aviso). */
const ROLES_QUE_ACTUALIZAN = ['admin_master', 'admin', 'administrador', 'encargado', 'supervisor']

export function puedeActualizar(rol: string | null | undefined): boolean {
  return ROLES_QUE_ACTUALIZAN.includes((rol ?? '').trim().toLowerCase())
}

/**
 * Devuelve la actualización disponible, o null si no hay versión nueva.
 * Sin internet o ante cualquier error devuelve null en silencio: el aviso es
 * opcional y nunca debe molestar al comercio.
 * En desarrollo (`tauri dev`) no busca, para no instalar un release sobre el código local.
 */
export async function buscarActualizacion(): Promise<Update | null> {
  if (import.meta.env.DEV) return null
  try {
    return await check()
  } catch {
    return null
  }
}

/**
 * Descarga e instala la actualización y reinicia Velora.
 * `onProgreso` recibe el porcentaje (0–100) o null si el servidor no informa el tamaño.
 * En Windows el instalador (modo pasivo) cierra la app solo; en macOS se reinicia acá.
 */
export async function instalarActualizacion(
  update: Update,
  onProgreso: (porcentaje: number | null) => void,
): Promise<void> {
  let total = 0
  let descargado = 0
  await update.downloadAndInstall(evento => {
    switch (evento.event) {
      case 'Started':
        total = evento.data.contentLength ?? 0
        onProgreso(total ? 0 : null)
        break
      case 'Progress':
        descargado += evento.data.chunkLength
        onProgreso(total ? Math.min(100, Math.round((descargado / total) * 100)) : null)
        break
      case 'Finished':
        onProgreso(100)
        break
    }
  })
  await relaunch()
}
