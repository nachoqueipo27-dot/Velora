import { useNegocioStore } from '../store/negocioStore'
import type { DatosNegocio } from '../lib/pdf/componentes/Encabezado'

export function useNegocio(): DatosNegocio {
  // Datos del negocio desde velora.db (Layout los carga antes de mostrar los módulos).
  const datos = useNegocioStore(s => s.datos)
  return {
    nombre:    datos.nombreNegocio || 'Mi Negocio',
    direccion: datos.direccion,
    telefono:  datos.telefono,
    logo:      datos.logo,
  }
}
