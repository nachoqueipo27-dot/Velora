import { useState } from 'react'
import { generarYDescargarPDF } from '../lib/pdf/generarPDF'
import type { ReactElement } from 'react'

export function usePDF() {
  const [generando, setGenerando] = useState(false)

  const descargar = async (documento: ReactElement, nombre: string) => {
    setGenerando(true)
    try {
      return await generarYDescargarPDF(documento, nombre)
    } finally {
      setGenerando(false)
    }
  }

  return { descargar, generando }
}
