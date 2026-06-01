import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginGlobal } from '../db/master'

interface UsuarioGlobal {
  id: number
  nombre: string
  rol: string
}

interface AuthGlobalStore {
  usuario: UsuarioGlobal | null
  loginError: string | null
  login: (nombre: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthGlobalStore = create<AuthGlobalStore>()(
  persist(
    (set) => ({
      usuario: null,
      loginError: null,

      login: async (nombre, password) => {
        const usuario = await loginGlobal(nombre, password)
        if (!usuario) {
          set({ loginError: 'Usuario o contraseña incorrectos' })
          return false
        }
        set({ usuario, loginError: null })
        return true
      },

      logout: () => set({ usuario: null }),
      clearError: () => set({ loginError: null }),
    }),
    { name: 'velora-auth-global' }
  )
)
