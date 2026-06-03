import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

// El systemId NO se persiste: se regenera siempre igual desde el hardware (hostname).
interface SistemaStore {
  systemId: string | null
  inicializar: () => Promise<void>
  registrarEnSupabase: (localId?: string, empresaId?: string) => Promise<void>
}

export const useSistemaStore = create<SistemaStore>((set, get) => ({
  systemId: null,

  inicializar: async () => {
    try {
      const id = await invoke<string>('get_system_id')
      set({ systemId: id })
      console.log('[sistema] System ID:', id)
    } catch (e) {
      console.warn('[sistema] No se pudo obtener system ID:', e)
    }
  },

  registrarEnSupabase: async (localId, empresaId) => {
    const { systemId } = get()
    if (!systemId) return
    try {
      // Cliente anónimo: escribe solo si hay sesión Supabase autenticada (RLS authenticated).
      // El service key nunca está en el bundle JS. Falla en silencio si no hay sesión.
      const { supabase } = await import('../lib/supabase')
      await supabase.from('sistemas').upsert(
        {
          system_id: systemId,
          local_id: localId ?? null,
          empresa_id: empresaId ?? null,
          version_app: '1.0.0',
          ultimo_acceso: new Date().toISOString(),
          activo: true,
        },
        { onConflict: 'system_id' }
      )
      console.log('[sistema] Registrado en Supabase:', systemId)
    } catch (e) {
      console.warn('[sistema] No se pudo registrar en Supabase:', e)
    }
  },
}))
