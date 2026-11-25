import { create } from 'zustand'
import { getDb } from '../db'
import { exigirEditar } from '../lib/permisos'
import { registrarActividad } from '../lib/registrarActividad'

// Opciones del lector de códigos. Viven en configuracion → clave 'escaneo' (JSON).
// Layout las carga al arrancar porque el lector las usa en todas las pantallas.

/** Qué hace Enter sobre la barra de "código desconocido" del punto de venta. */
export type AccionDesconocido = 'opciones' | 'alta' | 'borrador' | 'producto_x'

export interface EscaneoConfig {
  /** Sonido al escanear (encontrado / desconocido). */
  sonido: boolean
  accionDesconocido: AccionDesconocido
}

export const ESCANEO_DEFAULT: EscaneoConfig = { sonido: true, accionDesconocido: 'opciones' }

const CLAVE = 'escaneo'

interface EscaneoStore {
  config: EscaneoConfig
  cargar: () => Promise<void>
  guardar: (cambios: Partial<EscaneoConfig>) => Promise<void>
  /** Código para el que se pidió "Darlo de alta" desde otra pantalla (lo toma Inventario). */
  altaPendiente: string | null
  pedirAlta: (codigo: string) => void
  tomarAltaPendiente: () => string | null
}

export const useEscaneoStore = create<EscaneoStore>((set, get) => ({
  config: ESCANEO_DEFAULT,
  altaPendiente: null,
  pedirAlta: (codigo) => set({ altaPendiente: codigo }),
  tomarAltaPendiente: () => {
    const codigo = get().altaPendiente
    if (codigo) set({ altaPendiente: null })
    return codigo
  },

  cargar: async () => {
    const db = await getDb()
    const filas = await db.select<{ valor: string }[]>('SELECT valor FROM configuracion WHERE clave = ?', [CLAVE])
    let config = ESCANEO_DEFAULT
    if (filas.length) {
      try { config = { ...ESCANEO_DEFAULT, ...JSON.parse(filas[0].valor) } } catch { /* valor corrupto: default */ }
    }
    set({ config })
  },

  guardar: async (cambios) => {
    exigirEditar('configuracion')
    const config = { ...get().config, ...cambios }
    const db = await getDb()
    await db.execute(
      `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
       ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
      [CLAVE, JSON.stringify(config)]
    )
    set({ config })
    await registrarActividad({ modulo: 'Configuración', accion: 'Editó las opciones del lector de códigos' })
  },
}))
