import { useEffect, useState } from 'react'
import { getDb } from '../db'

export function useInitDb() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDb()
      .then(() => setReady(true))
      .catch(e => setError(String(e)))
  }, [])

  return { ready, error }
}
