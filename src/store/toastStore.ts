import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  mensaje: string
  variante: ToastVariant
  duracion: number
}

interface ToastStore {
  toasts: Toast[]
  agregar: (mensaje: string, variante: ToastVariant, duracion?: number) => void
  eliminar: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  agregar: (mensaje, variante, duracion = 3500) => {
    const id = Math.random().toString(36).slice(2)
    // Apila hasta 3 (descarta el más viejo si hay 3)
    set(s => ({ toasts: [...s.toasts.slice(-2), { id, mensaje, variante, duracion }] }))
    setTimeout(() => {
      set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
    }, duracion)
  },
  eliminar: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))

export const toast = {
  success: (m: string) => useToastStore.getState().agregar(m, 'success'),
  error:   (m: string) => useToastStore.getState().agregar(m, 'error'),
  warning: (m: string) => useToastStore.getState().agregar(m, 'warning'),
  info:    (m: string) => useToastStore.getState().agregar(m, 'info'),
}
