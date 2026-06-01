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
    { name: 'velora-onboarding' }
  )
)
