import { useOnboardingStore } from '../store/onboardingStore'
import type { DatosNegocio } from '../lib/pdf/componentes/Encabezado'

export function useNegocio(): DatosNegocio {
  const { data } = useOnboardingStore()
  return {
    nombre:    data.nombreNegocio ?? 'Mi Negocio',
    direccion: data.direccion ?? '',
    telefono:  data.telefono ?? '',
    logo:      data.logo ?? null,
  }
}
