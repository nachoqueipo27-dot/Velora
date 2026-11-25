import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loginLocal, obtenerUsuarioMaster } from '../db/master'
import { CLAVE_POR_DEFECTO } from '../db/claves'
import {
  resolverAcceso, estaDadoDeBaja, guardarClaveElegida, MENSAJE_BAJA, type UsuarioGlobal,
} from '../db/acceso'

interface AuthGlobalStore {
  usuario: UsuarioGlobal | null
  /** Ingresó bien pero con la contraseña por defecto: no entra hasta elegir otra. */
  pendienteClave: UsuarioGlobal | null
  loginError: string | null
  cargando: boolean
  login: (dni: string, password: string) => Promise<boolean>
  /** Vuelve a resolver el acceso de la sesión guardada (al abrir la app): rol y bajas. */
  revalidar: () => Promise<void>
  completarCambioClave: (clave: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthGlobalStore = create<AuthGlobalStore>()(
  persist(
    (set, get) => ({
      usuario: null,
      pendienteClave: null,
      loginError: null,
      cargando: false,

      login: async (dni, password) => {
        set({ cargando: true, loginError: null })

        try {
          const usuarioLocal = await loginLocal(dni, password)
          if (!usuarioLocal) {
            const baja = await estaDadoDeBaja(dni)
            set({ loginError: baja ? MENSAJE_BAJA : 'DNI o contraseña incorrectos.', cargando: false })
            return false
          }

          const acceso = await resolverAcceso(usuarioLocal)
          if (acceso.tipo === 'baja') {
            set({ loginError: MENSAJE_BAJA, cargando: false })
            return false
          }
          if (acceso.debeCambiarClave || password === CLAVE_POR_DEFECTO) {
            set({ pendienteClave: acceso.usuario, cargando: false })
            return false
          }
          set({ usuario: acceso.usuario, cargando: false })
          return true
        } catch (e) {
          set({ loginError: String(e), cargando: false })
          return false
        }
      },

      revalidar: async () => {
        const actual = get().usuario
        if (!actual) return
        try {
          const enMaster = await obtenerUsuarioMaster(actual.dni)
          if (!enMaster) {
            const baja = await estaDadoDeBaja(actual.dni)
            set({ usuario: null, loginError: baja ? MENSAJE_BAJA : null })
            return
          }
          const acceso = await resolverAcceso(enMaster)
          if (acceso.tipo === 'baja') set({ usuario: null, loginError: MENSAJE_BAJA })
          else if (acceso.debeCambiarClave) set({ usuario: null, pendienteClave: acceso.usuario })
          else set({ usuario: acceso.usuario })
        } catch (e) {
          // Sin poder verificarlo no se conserva la sesión: que vuelva a ingresar.
          console.error('revalidar sesión', e)
          set({ usuario: null })
        }
      },

      completarCambioClave: async (clave) => {
        const usuario = get().pendienteClave
        if (!usuario) return
        await guardarClaveElegida(usuario, clave)
        set({ usuario, pendienteClave: null })
      },

      logout: () => set({ usuario: null, pendienteClave: null }),
      clearError: () => set({ loginError: null }),
    }),
    {
      name: 'velora-auth-global',
      // Solo datos de identidad: nunca contraseñas ni hashes.
      partialize: (s) => ({
        usuario: s.usuario && {
          nombre: s.usuario.nombre,
          dni: s.usuario.dni,
          rol: s.usuario.rol,
          esAdminGeneral: s.usuario.esAdminGeneral,
          empleadoId: s.usuario.empleadoId,
        },
      }),
    }
  )
)
