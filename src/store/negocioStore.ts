import { create } from 'zustand'
import { getDb } from '../db'
import { useOnboardingStore } from './onboardingStore'
import type { OnboardingData } from '../types'

// Datos del negocio (nombre, logo, contacto y funciones activas).
// Viven en velora.db → tabla `configuracion`, clave `datos_negocio` (JSON), así entran en
// el backup y no se pierden si se borran los datos del navegador.
// Hasta la 1.3.4 vivían en localStorage (velora-onboarding): `cargar()` los copia una vez.

export interface DatosDelNegocio {
  nombreNegocio: string
  rubro: string
  direccion: string
  telefono: string
  email: string
  logo: string | null
  /** null = nunca se configuraron (se muestran todas). */
  funcionesHabilitadas: string[] | null
}

const CLAVE = 'datos_negocio'
const CAMPOS = ['nombreNegocio', 'rubro', 'direccion', 'telefono', 'email', 'logo', 'funcionesHabilitadas'] as const

export const DATOS_NEGOCIO_VACIOS: DatosDelNegocio = {
  nombreNegocio: '', rubro: '', direccion: '', telefono: '', email: '', logo: null, funcionesHabilitadas: null,
}

/** Toma los datos del negocio de lo que cargó el onboarding. */
export function datosDesdeOnboarding(data: Partial<OnboardingData>): DatosDelNegocio {
  return {
    nombreNegocio: data.nombreNegocio ?? '',
    rubro: data.rubro ?? '',
    direccion: data.direccion ?? '',
    telefono: data.telefono ?? '',
    email: data.email ?? '',
    logo: data.logo ?? null,
    funcionesHabilitadas: data.funcionesHabilitadas ?? null,
  }
}

type Db = Awaited<ReturnType<typeof getDb>>

async function leer(db: Db): Promise<DatosDelNegocio | null> {
  const filas = await db.select<{ valor: string }[]>('SELECT valor FROM configuracion WHERE clave = ?', [CLAVE])
  if (filas.length === 0) return null
  try { return { ...DATOS_NEGOCIO_VACIOS, ...JSON.parse(filas[0].valor) } } catch { return null }
}

async function escribir(db: Db, datos: DatosDelNegocio) {
  await db.execute(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [CLAVE, JSON.stringify(datos)]
  )
}

/** Saca de localStorage los datos que ya están en la base (la base es la única fuente). */
function limpiarLocalStorage() {
  const { completado, relanzado } = useOnboardingStore.getState()
  if (!completado || relanzado) return // durante el onboarding se siguen usando
  useOnboardingStore.setState(s => {
    const data = { ...s.data }
    for (const c of CAMPOS) delete data[c]
    return { data }
  })
}

interface NegocioStore {
  datos: DatosDelNegocio
  cargado: boolean
  cargar: () => Promise<void>
  guardar: (cambios: Partial<DatosDelNegocio>) => Promise<void>
}

export const useNegocioStore = create<NegocioStore>((set, get) => ({
  datos: DATOS_NEGOCIO_VACIOS,
  cargado: false,

  cargar: async () => {
    const db = await getDb()
    let datos = await leer(db)
    if (!datos) {
      // Migración única desde localStorage (si el comercio ya había hecho el onboarding).
      const { completado, data } = useOnboardingStore.getState()
      const hayAlgo = CAMPOS.some(c => data[c] !== undefined && data[c] !== '')
      if (completado && hayAlgo) {
        datos = datosDesdeOnboarding(data)
        await escribir(db, datos)
      }
    }
    if (datos) limpiarLocalStorage()
    set({ datos: datos ?? DATOS_NEGOCIO_VACIOS, cargado: true })
  },

  guardar: async (cambios) => {
    const datos = { ...get().datos, ...cambios }
    await escribir(await getDb(), datos)
    set({ datos, cargado: true })
  },
}))
