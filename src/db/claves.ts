import type Database from '@tauri-apps/plugin-sql'
import { hashPassword, verifyPassword, esBcrypt, coincideLegacy } from '../lib/crypto'

// Contraseña que Velora ponía sola en versiones anteriores: hay que cambiarla al ingresar.
export const CLAVE_POR_DEFECTO = 'cambiar'

// Verifica la contraseña (o PIN) de un empleado contra su hash bcrypt. Si todavía quedó
// un valor viejo en btoa, lo verifica como legacy y lo re-guarda con hash (igual que
// loginLocal en master.ts).
export async function verificarClaveEmpleado(
  db: Database,
  empleado: { id: number; password: string },
  clave: string
): Promise<boolean> {
  if (clave === '') return false
  if (esBcrypt(empleado.password)) return verifyPassword(clave, empleado.password)

  if (!coincideLegacy(clave, empleado.password)) return false
  try {
    const nuevoHash = await hashPassword(clave)
    await db.execute(
      'UPDATE empleados SET password = ?, debe_cambiar_clave = ? WHERE id = ?',
      [nuevoHash, clave === CLAVE_POR_DEFECTO ? 1 : 0, empleado.id]
    )
  } catch { /* si falla el re-guardado, la verificación igual vale */ }
  return true
}
