import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { OnboardingData } from '../types'

// El onboarding es POR LOCAL. Como la app recarga al cambiar de negocio,
// leemos el local activo persistido al iniciar para derivar la key de persistencia.
function onboardingKey(): string {
  try {
    const raw = localStorage.getItem('velora-negocio-activo')
    if (raw) {
      const localId = JSON.parse(raw)?.state?.negocioActivo?.localId
      if (localId != null) return `velora-onboarding-l${localId}`
    }
  } catch { /* ignora parse */ }
  return 'velora-onboarding-default'
}

interface OnboardingStore {
  completado: boolean
  paso: number
  data: Partial<OnboardingData>
  setPaso: (paso: number) => void
  updateData: (data: Partial<OnboardingData>) => void
  completarOnboarding: () => void
  resetOnboarding: () => void
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      completado: false,
      paso: 1,
      data: {},
      setPaso: (paso) => set({ paso }),
      updateData: (data) => set(s => ({ data: { ...s.data, ...data } })),
      completarOnboarding: () => set({ completado: true }),
      resetOnboarding: () => set({ completado: false, paso: 1, data: {} }),
    }),
    { name: onboardingKey() }
  )
)
