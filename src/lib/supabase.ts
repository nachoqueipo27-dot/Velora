import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables de entorno de Supabase')
}

// Cliente público — para auth del portal y lecturas con RLS.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } },
})

// Cliente con service role — SOLO para el sync engine.
// Nunca exponer este cliente en componentes de UI.
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY ?? '', {
  auth: { persistSession: false, autoRefreshToken: false },
})

export type SyncStatus = 'pendiente' | 'sincronizado' | 'error'
