import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setActiveDb } from '../db'

export interface EmpresaLocal {
  empresaId: number
  empresaNombre: string
  empresaLogo: string | null
  localId: number
  localNombre: string
  localDireccion: string | null
  localRemoteId: string | null
  localApiKey: string | null
  ultimaSync: string | null
}

// Genera la key de DB para un negocio (empresa + local).
export const dbKeyDe = (empresaId: number, localId: number) => `e${empresaId}_l${localId}`

interface NegocioStore {
  negocioActivo: EmpresaLocal | null
  seleccionarNegocio: (negocio: EmpresaLocal) => void
  limpiarNegocio: () => void
}

export const useNegocioStore = create<NegocioStore>()(
  persist(
    (set) => ({
      negocioActivo: null,

      seleccionarNegocio: (negocio) => {
        setActiveDb(dbKeyDe(negocio.empresaId, negocio.localId))
        set({ negocioActivo: negocio })
        // Recarga para reinicializar DB, stores y onboarding del local elegido (estado limpio).
        window.location.reload()
      },

      limpiarNegocio: () => {
        setActiveDb('default')
        set({ negocioActivo: null })
        window.location.reload()
      },
    }),
    {
      name: 'velora-negocio-activo',
      // Al reabrir la app, restaurar la DB activa según el negocio persistido.
      onRehydrateStorage: () => (state) => {
        if (state?.negocioActivo) {
          setActiveDb(dbKeyDe(state.negocioActivo.empresaId, state.negocioActivo.localId))
        }
      },
    }
  )
)
