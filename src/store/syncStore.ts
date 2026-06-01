import { create } from 'zustand'
import { sincronizarTodo, enviarHeartbeat } from '../lib/sync/engine'
import { contarPendientes } from '../lib/sync/queries'
import type { EstadoSync, ResultadoSync } from '../lib/sync/types'

interface SyncStore {
  estado: EstadoSync
  pendientes: number
  ultimosResultados: ResultadoSync[]

  sincronizar: () => Promise<void>
  heartbeat: () => Promise<void>
  actualizarPendientes: () => Promise<void>
  iniciarHeartbeatPeriodico: () => () => void
  iniciarSyncPeriodica: (intervaloHoras: number) => () => void
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  estado: { enCurso: false, ultimaSync: null, error: null, progreso: null },
  pendientes: 0,
  ultimosResultados: [],

  sincronizar: async () => {
    if (get().estado.enCurso) return
    set(s => ({ estado: { ...s.estado, enCurso: true, error: null } }))
    try {
      const resultados = await sincronizarTodo((tabla, procesados, total) => {
        set(s => ({ estado: { ...s.estado, progreso: { tabla, procesados, total } } }))
      })
      const totalPendientes = await contarPendientes()
      set({
        estado: { enCurso: false, ultimaSync: new Date().toISOString(), error: null, progreso: null },
        ultimosResultados: resultados,
        pendientes: totalPendientes,
      })
    } catch (e) {
      set(s => ({ estado: { ...s.estado, enCurso: false, error: String(e), progreso: null } }))
    }
  },

  heartbeat: async () => {
    await enviarHeartbeat()
  },

  actualizarPendientes: async () => {
    const count = await contarPendientes()
    set({ pendientes: count })
  },

  iniciarHeartbeatPeriodico: () => {
    const interval = setInterval(() => { get().heartbeat() }, 60_000)
    return () => clearInterval(interval)
  },

  iniciarSyncPeriodica: (intervaloHoras: number) => {
    const ms = intervaloHoras * 60 * 60 * 1000
    const interval = setInterval(() => { get().sincronizar() }, ms)
    return () => clearInterval(interval)
  },
}))
