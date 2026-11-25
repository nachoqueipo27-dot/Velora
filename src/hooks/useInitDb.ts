import { useEffect, useState } from 'react'
import { getDb } from '../db'

export function useInitDb() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDb()
      .then(() => setReady(true))
      // ErrorMigracion trae un mensaje pensado para el comercio; el detalle técnico va a la consola.
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return { ready, error }
}
