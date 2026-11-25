import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingData } from '../types'

interface OnboardingStore {
  completado: boolean
  paso: number
  data: Partial<OnboardingData>
  setPaso: (paso: number) => void
  updateData: (data: Partial<OnboardingData>) => void
  completarOnboarding: () => void
  resetOnboarding: () => void
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
      paso: 1,
      data: {},
      setPaso: (paso) => set({ paso }),
      updateData: (data) => set(s => ({ data: { ...s.data, ...data } })),
      completarOnboarding: () => set(s => ({ completado: true, data: sinSecretos(s.data) })),
      resetOnboarding: () => set({ completado: false, paso: 1, data: {} }),
    }),
    {
      name: 'velora-onboarding',
      partialize: (s) => ({
        completado: s.completado,
        // Si se cierra la app antes de terminar, se retoma a lo sumo en el paso 2, que es
        // donde se vuelven a pedir la contraseña y la respuesta.
        paso: s.completado ? s.paso : Math.min(s.paso, 2),
        data: sinSecretos(s.data),
      }),
    }
  )
)
