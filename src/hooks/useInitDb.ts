import { useEffect, useState } from 'react'
import { getDb } from '../db'
import { ErrorMigracion } from '../db/migraciones'

export interface ErrorInitDb {
  /** Para el comercio. */
  mensaje: string
  /** Para soporte (botón "Copiar detalle"). */
  detalle: string
  fecha: string
}

function describirError(e: unknown): ErrorInitDb {
  const fecha = new Date().toISOString()
  if (e instanceof ErrorMigracion) {
    return { mensaje: e.message, detalle: `Migración: ${e.migracion}\n${String(e.causa)}`, fecha }
  }
  return { mensaje: 'No se pudo abrir la base. Contactá a soporte.', detalle: String(e), fecha }
}

export function useInitDb() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<ErrorInitDb | null>(null)

  useEffect(() => {
    getDb()
      .then(() => setReady(true))
      .catch(e => {
        console.error('useInitDb', e)
        setError(describirError(e))
      })
  }, [])

  return { ready, error }
}
