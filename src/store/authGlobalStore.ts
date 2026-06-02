import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginLocal, loginSupabase } from '../db/master'
import { useConectividadStore } from './conectividadStore'

interface UsuarioGlobal {
  nombre: string
  dni: string
  rol: string
  esAdminGeneral: boolean
  localId: number | null
  empresaId: number | null
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
          // 1. Login local primero (rápido, funciona offline).
          const usuarioLocal = await loginLocal(dni, password)
          if (usuarioLocal) {
            set({
              usuario: {
                nombre: usuarioLocal.nombre,
                dni: usuarioLocal.dni,
                rol: usuarioLocal.rol,
                esAdminGeneral: usuarioLocal.rol === 'admin_master',
                localId: null,
                empresaId: null,
              },
              cargando: false,
            })
            return true
          }

          // 2. No está en local → intentar Supabase (requiere conexión).
          const { estado } = useConectividadStore.getState()
          if (estado === 'desconectado') {
            set({
              loginError: 'Usuario no encontrado. Sin conexión para verificar en la nube.',
              cargando: false,
            })
            return false
          }

          const usuarioNube = await loginSupabase(dni, password)
          if (usuarioNube) {
            set({
              usuario: {
                nombre: usuarioNube.nombre,
                dni: usuarioNube.dni,
                rol: usuarioNube.rol,
                esAdminGeneral: usuarioNube.rol === 'admin_master',
                localId: null,
                empresaId: null,
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
