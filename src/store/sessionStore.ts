import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getDb } from '../db'
import type { Usuario } from '../types'

interface SessionStore {
  usuario: Usuario | null
  loginError: string | null
  setUsuario: (u: Usuario) => void
  login: (nombre: string, password: string) => Promise<boolean>
  cerrarSesion: () => void
  clearError: () => void
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      usuario: null,
      loginError: null,

      setUsuario: (usuario) => set({ usuario }),

      login: async (nombre, password) => {
        try {
          const db = await getDb()
          const rows = await db.select<any[]>(
            `SELECT e.*, r.nombre as rol_nombre, r.es_admin
             FROM empleados e
             JOIN roles r ON e.rol_id = r.id
             WHERE e.nombre = ? AND e.activo = 1`,
            [nombre]
          )
          if (rows.length === 0) {
            set({ loginError: 'Usuario no encontrado' })
            return false
          }
          const emp = rows[0]
          if (emp.password !== btoa(password)) {
            set({ loginError: 'Contraseña incorrecta' })
            return false
          }
          set({
            usuario: {
              id: emp.id,
              nombre: emp.nombre,
              rol: emp.rol_nombre,
              avatar: emp.avatar,
            },
            loginError: null,
          })
          return true
        } catch (e) {
          set({ loginError: String(e) })
          return false
        }
      },

      cerrarSesion: () => set({ usuario: null }),
      clearError: () => set({ loginError: null }),
    }),
    { name: 'velora-session' }
  )
)
