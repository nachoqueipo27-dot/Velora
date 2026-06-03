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
