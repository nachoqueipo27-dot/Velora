import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginLocal } from '../db/master'

interface UsuarioGlobal {
  nombre: string
  dni: string
  rol: string
  esAdminGeneral: boolean
}

interface AuthGlobalStore {
  usuario: UsuarioGlobal | null
  loginError: string | null
  cargando: boolean
  login: (dni: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthGlobalStore = create<AuthGlobalStore>()(
  persist(
    (set) => ({
      usuario: null,
      loginError: null,
      cargando: false,

      login: async (dni, password) => {
        set({ cargando: true, loginError: null })

        try {
          const usuarioLocal = await loginLocal(dni, password)
          if (usuarioLocal) {
            set({
              usuario: {
                nombre: usuarioLocal.nombre,
                dni: usuarioLocal.dni,
                rol: usuarioLocal.rol,
                esAdminGeneral: usuarioLocal.rol === 'admin_master',
              },
              cargando: false,
            })
            return true
          }

          set({ loginError: 'DNI o contraseña incorrectos.', cargando: false })
          return false
        } catch (e) {
          set({ loginError: String(e), cargando: false })
          return false
        }
      },

      logout: () => set({ usuario: null }),
      clearError: () => set({ loginError: null }),
    }),
    { name: 'velora-auth-global' }
  )
)
