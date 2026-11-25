import { useEffect, useState } from 'react'
import type { Update } from '@tauri-apps/plugin-updater'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { usePosStore } from '../../store/posStore'
import {
  buscarActualizacion,
  instalarActualizacion,
  puedeActualizar,
  INTERVALO_BUSQUEDA_MS,
} from '../../lib/actualizador'
import { cn } from '../../lib/utils'

// "Más tarde" esconde el aviso hasta el próximo inicio de Velora.
// Vive fuera del componente para que no reaparezca al cerrar y abrir sesión.
let postergadoHastaProximoInicio = false

type Estado =
  | { tipo: 'aviso' }
  | { tipo: 'venta-en-curso' }
  | { tipo: 'descargando'; porcentaje: number | null }
  | { tipo: 'instalando' }
  | { tipo: 'error' }

/** Barra discreta arriba de la app cuando hay una versión nueva de Velora. */
export const AvisoActualizacion = () => {
  const rol = useAuthGlobalStore(s => s.usuario?.rol)
  const [update, setUpdate] = useState<Update | null>(null)
  const [estado, setEstado] = useState<Estado>({ tipo: 'aviso' })

  // Busca al montar (ya pasado el login) y cada 6 horas.
  useEffect(() => {
    let activo = true
    const buscar = async () => {
      if (postergadoHastaProximoInicio) return
      const encontrada = await buscarActualizacion()
      if (activo && encontrada) setUpdate(encontrada)
    }
    buscar()
    const id = setInterval(buscar, INTERVALO_BUSQUEDA_MS)
    return () => { activo = false; clearInterval(id) }
  }, [])

  if (!update || postergadoHastaProximoInicio) return null

  const ocupado = estado.tipo === 'descargando' || estado.tipo === 'instalando'

  const actualizarAhora = async () => {
    if (usePosStore.getState().carrito.length > 0) {
      setEstado({ tipo: 'venta-en-curso' })
      return
    }
    setEstado({ tipo: 'descargando', porcentaje: null })
    try {
      await instalarActualizacion(update, porcentaje => {
        setEstado(porcentaje === 100 ? { tipo: 'instalando' } : { tipo: 'descargando', porcentaje })
      })
    } catch {
      setEstado({ tipo: 'error' })
    }
  }

  const masTarde = () => {
    postergadoHastaProximoInicio = true
    setUpdate(null)
  }

  const mensaje = (() => {
    if (!puedeActualizar(rol)) return 'Hay una actualización: avisale al encargado.'
    switch (estado.tipo) {
      case 'venta-en-curso':
        return 'Hay una venta en curso en el Punto de venta. Terminala o cancelala antes de actualizar.'
      case 'descargando':
        return estado.porcentaje === null
          ? 'Descargando la actualización…'
          : `Descargando la actualización… ${estado.porcentaje}%`
      case 'instalando':
        return 'Instalando. Velora se va a reiniciar en unos segundos.'
      case 'error':
        return 'No se pudo instalar la actualización. Revisá la conexión y probá de nuevo.'
      default:
        return `Hay una versión nueva de Velora (${update.version}).`
    }
  })()

  return (
    <div
      role="status"
      className="relative flex items-center gap-3 px-4 py-2 border-b border-aviso-texto/15 bg-aviso-fondo text-aviso-texto text-[13px]"
    >
      <span className="flex-1 font-medium tabular-nums">{mensaje}</span>

      {puedeActualizar(rol) && !ocupado && (
        <div className="flex items-center gap-2">
          <button
            onClick={actualizarAhora}
            className="px-3 py-1 rounded-input bg-aviso-texto text-aviso-fondo text-[12px] font-semibold transition-opacity duration-150 hover:opacity-90"
          >
            Actualizar ahora
          </button>
          <button
            onClick={masTarde}
            className="px-3 py-1 rounded-input text-[12px] font-medium transition-colors duration-150 hover:bg-aviso-texto/10"
          >
            Más tarde
          </button>
        </div>
      )}

      {/* Barra de progreso de la descarga */}
      {ocupado && (
        <div className="absolute left-0 bottom-0 h-0.5 w-full bg-aviso-texto/10">
          <div
            className={cn(
              'h-full bg-aviso-texto transition-[width] duration-200',
              estado.tipo === 'descargando' && estado.porcentaje === null && 'animate-pulse',
            )}
            style={{
              width: estado.tipo === 'descargando' && estado.porcentaje !== null
                ? `${estado.porcentaje}%`
                : '100%',
            }}
          />
        </div>
      )}
    </div>
  )
}
