import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingData } from '../types'

interface OnboardingStore {
  completado: boolean
  /** El dueño lo volvió a correr desde Configuración (con su contraseña). */
  relanzado: boolean
  paso: number
  data: Partial<OnboardingData>
  setPaso: (paso: number) => void
  updateData: (data: Partial<OnboardingData>) => void
  completarOnboarding: () => void
  resetOnboarding: () => void
  relanzarOnboarding: (dueno: { nombre: string; dni: string }) => void
  salirDeRelanzado: () => void
}

// La contraseña y la respuesta de seguridad viven solo en memoria durante el onboarding.
function sinSecretos(data: Partial<OnboardingData>): Partial<OnboardingData> {
  const { adminPassword: _password, adminRespuestaSeguridad: _respuesta, ...resto } = data
  return resto
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      completado: false,
      relanzado: false,
      paso: 1,
      data: {},
      setPaso: (paso) => set({ paso }),
      updateData: (data) => set(s => ({ data: { ...s.data, ...data } })),
      completarOnboarding: () => set(s => ({ completado: true, relanzado: false, data: sinSecretos(s.data) })),
      resetOnboarding: () => set({ completado: false, relanzado: false, paso: 1, data: {} }),
      relanzarOnboarding: ({ nombre, dni }) =>
        set(s => ({ relanzado: true, paso: 1, data: { ...s.data, adminNombre: nombre, adminDni: dni } })),
      salirDeRelanzado: () => set(s => ({ relanzado: false, data: sinSecretos(s.data) })),
    }),
    {
      name: 'velora-onboarding',
      partialize: (s) => ({
        completado: s.completado,
        relanzado: s.relanzado,
        // Si se cierra la app antes de terminar, se retoma a lo sumo en el paso 2, que es
        // donde se vuelven a pedir la contraseña y la respuesta.
        paso: s.completado && !s.relanzado ? s.paso : Math.min(s.paso, 2),
        data: sinSecretos(s.data),
      }),
    }
  )
)
