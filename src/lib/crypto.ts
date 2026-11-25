import { invoke } from '@tauri-apps/api/core'

// bcrypt SIEMPRE vía Rust (comandos Tauri) — nunca en JS.
export async function hashPassword(password: string): Promise<string> {
  return invoke<string>('hash_password', { password })
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  return invoke<boolean>('verify_password', { password, hashStr })
}

// Legacy: distinguir un hash bcrypt ($2a$/$2b$) de uno btoa (base64).
export function esBcrypt(hash: string): boolean {
  return hash.startsWith('$2b$') || hash.startsWith('$2a$')
}

// Legacy: ¿`guardada` es el btoa viejo de `clave`? Solo para verificar valores que
// quedaron sin migrar; nunca para guardar.
export function coincideLegacy(clave: string, guardada: string): boolean {
  if (clave === '' || guardada === '') return false
  // btoa lanza con caracteres fuera de Latin-1: esa clave nunca pudo guardarse así.
  try { return guardada === btoa(clave) } catch { return false }
}

// Legacy: texto original de un valor guardado con btoa, o null si está corrupto (no es
// base64 canónico, está vacío o contiene caracteres de control que nadie puede tipear).
export function decodificarLegacy(guardada: string): string | null {
  try {
    const texto = atob(guardada)
    if (texto === '' || btoa(texto) !== guardada) return null
    // eslint-disable-next-line no-control-regex
    return /[\x00-\x1f\x7f-\x9f]/.test(texto) ? null : texto
  } catch {
    return null
  }
}
