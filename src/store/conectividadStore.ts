import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

export type EstadoConexion = 'conectado' | 'sin_sync' | 'desconectado'

interface ConectividadStore {
  estado: EstadoConexion
  ultimoCheck: string | null
  checkeando: boolean
  setEstado: (estado: EstadoConexion) => void
  verificar: () => Promise<boolean>
}

export const useConectividadStore = create<ConectividadStore>((set) => ({
  estado: 'desconectado',
  ultimoCheck: null,
  checkeando: false,

  setEstado: (estado) => set({ estado }),

  verificar: async () => {
    set({ checkeando: true })
    try {
      const ok = await invoke<boolean>('ping_supabase')
      set({
        estado: ok ? 'conectado' : 'desconectado',
        ultimoCheck: new Date().toISOString(),
        checkeando: false,
      })
      return ok
    } catch {
      set({
        estado: 'desconectado',
        ultimoCheck: new Date().toISOString(),
        checkeando: false,
      })
      return false
    }
  },
}))
