import { create } from 'zustand'
import { getDb } from '../db'
import type { FormatoEtiqueta } from '../lib/etiquetas/plantillas'

// Preferencias de etiquetas y aviso de reimpresión.
//   configuracion → 'etiquetas'             : preferencias (JSON)
//   configuracion → 'etiquetas_reimprimir'  : productos cuyo precio cambió desde que se imprimió
//                                             con precio (JSON: number[])
// Layout carga esto al arrancar (el aviso de reimprimir aparece en cualquier pantalla).

export interface PreferenciasEtiquetas {
  /** El precio en la etiqueta viene apagado: el precio real siempre sale al escanear. */
  incluirPrecio: boolean
  formato: FormatoEtiqueta
  /** Primera posición libre propuesta para cada hoja A4 (dónde terminó la última impresión). */
  inicio: Partial<Record<FormatoEtiqueta, number>>
  filaNueva: boolean
}

export const PREFERENCIAS_DEFAULT: PreferenciasEtiquetas = { incluirPrecio: false, formato: 'rollo', inicio: {}, filaNueva: false }

const CLAVE_PREFS = 'etiquetas'
const CLAVE_REIMPRIMIR = 'etiquetas_reimprimir'

type Db = Awaited<ReturnType<typeof getDb>>
async function leerKV<T>(db: Db, clave: string, def: T): Promise<T> {
  const f = await db.select<{ valor: string }[]>('SELECT valor FROM configuracion WHERE clave = ?', [clave])
  if (!f.length) return def
  try { return JSON.parse(f[0].valor) as T } catch { return def }
}
async function escribirKV(db: Db, clave: string, valor: unknown) {
  await db.execute(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [clave, JSON.stringify(valor)]
  )
}

/** A dónde se pide ir con una lista de productos. */
export type DestinoEtiquetas = 'etiquetas' | 'mostrador'

/** Producto pedido; `codigo` elige uno puntual (ej. el del pack). Sin él, el principal. */
export interface PedidoItem { productoId: number; codigo?: string }
export interface PedidoEtiquetas { destino: DestinoEtiquetas; items: PedidoItem[] }

interface EtiquetasStore {
  prefs: PreferenciasEtiquetas
  /** Productos con precio cambiado cuyas etiquetas (con precio) quedaron viejas. */
  reimprimir: number[]
  /** Pedido para abrir la pantalla de etiquetas con estos productos (lo toma Inventario). */
  pedido: PedidoEtiquetas | null

  cargar: () => Promise<void>
  guardarPrefs: (cambios: Partial<PreferenciasEtiquetas>) => Promise<void>
  /** Llamar cuando cambia el precio de productos (edición, aumento masivo, recálculo por dólar). */
  registrarCambioPrecio: (productoIds: number[]) => Promise<void>
  /** Ya se reimprimió (o "Ahora no"): saca esos productos del aviso. */
  quitarDeReimprimir: (productoIds?: number[]) => Promise<void>
  pedirEtiquetas: (items: PedidoItem[], destino?: DestinoEtiquetas) => void
  tomarPedido: () => PedidoEtiquetas | null
}

export const useEtiquetasStore = create<EtiquetasStore>((set, get) => ({
  prefs: PREFERENCIAS_DEFAULT,
  reimprimir: [],
  pedido: null,

  cargar: async () => {
    const db = await getDb()
    const prefs = { ...PREFERENCIAS_DEFAULT, ...(await leerKV<Partial<PreferenciasEtiquetas>>(db, CLAVE_PREFS, {})) }
    const reimprimir = await leerKV<number[]>(db, CLAVE_REIMPRIMIR, [])
    set({ prefs, reimprimir: Array.isArray(reimprimir) ? reimprimir : [] })
  },

  guardarPrefs: async (cambios) => {
    const prefs = { ...get().prefs, ...cambios, inicio: { ...get().prefs.inicio, ...(cambios.inicio ?? {}) } }
    await escribirKV(await getDb(), CLAVE_PREFS, prefs)
    set({ prefs })
    // Si se apaga el precio, ya no hay etiquetas que queden viejas por un aumento.
    if (cambios.incluirPrecio === false && get().reimprimir.length) await get().quitarDeReimprimir()
  },

  registrarCambioPrecio: async (productoIds) => {
    // Solo importa si las etiquetas llevan precio.
    if (!get().prefs.incluirPrecio || productoIds.length === 0) return
    const reimprimir = [...new Set([...get().reimprimir, ...productoIds])]
    await escribirKV(await getDb(), CLAVE_REIMPRIMIR, reimprimir)
    set({ reimprimir })
  },

  quitarDeReimprimir: async (productoIds) => {
    const quitar = productoIds ? new Set(productoIds) : null
    const reimprimir = quitar ? get().reimprimir.filter(id => !quitar.has(id)) : []
    await escribirKV(await getDb(), CLAVE_REIMPRIMIR, reimprimir)
    set({ reimprimir })
  },

  pedirEtiquetas: (items, destino = 'etiquetas') => set({ pedido: { destino, items } }),
  tomarPedido: () => {
    const pedido = get().pedido
    if (pedido) set({ pedido: null })
    return pedido
  },
}))
