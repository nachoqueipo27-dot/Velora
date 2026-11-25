import { useState } from 'react'
import { getVersion } from '@tauri-apps/api/app'
import type { ErrorInitDb } from '../../hooks/useInitDb'
import { VeloraLogo } from '../ui/VeloraLogo'

/** Reemplaza a la app cuando la base no se pudo abrir o migrar. Sin reintentar, a propósito. */
export const PantallaErrorBase = ({ error }: { error: ErrorInitDb }) => {
  const [copiado, setCopiado] = useState(false)
  // Si el portapapeles no está disponible, se muestra el detalle para copiarlo a mano.
  const [detalleVisible, setDetalleVisible] = useState<string | null>(null)

  const copiar = async () => {
    let version = 'desconocida'
    try { version = await getVersion() } catch { /* el detalle sirve igual sin la versión */ }
    const texto = `Velora ${version}\n${error.fecha}\n${error.detalle}`
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setDetalleVisible(texto)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center p-6 bg-fondo text-texto dark:bg-oscuro-fondo dark:text-oscuro-texto">
      <div
        role="alert"
        className="w-full max-w-md flex flex-col gap-4 p-6 rounded-panel border border-borde bg-superficie dark:border-oscuro-borde dark:bg-oscuro-superficie"
      >
        <VeloraLogo size={40} variant="auto" />
        <p className="text-titulo font-semibold">{error.mensaje}</p>
        <p className="text-cuerpo text-texto-3 dark:text-oscuro-texto-2">
          Tocá "Copiar detalle" y mandáselo a soporte por WhatsApp: con eso podemos ver qué pasó.
        </p>
        <button
          onClick={copiar}
          className="self-start px-4 py-2 rounded-control bg-acento text-superficie text-cuerpo font-semibold transition-colors duration-150 hover:bg-acento-hover"
        >
          {copiado ? 'Detalle copiado' : 'Copiar detalle'}
        </button>
        {detalleVisible && (
          <textarea
            readOnly
            rows={6}
            value={detalleVisible}
            onFocus={e => e.target.select()}
            className="w-full p-3 rounded-control border border-borde bg-superficie-suave text-etiqueta font-mono select-text dark:border-oscuro-borde dark:bg-oscuro-elevado"
          />
        )}
      </div>
    </div>
  )
}
