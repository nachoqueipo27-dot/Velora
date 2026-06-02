import { useEffect, useRef } from 'react'
import { useConectividadStore } from '../store/conectividadStore'
import { useSyncStore } from '../store/syncStore'

const INTERVALO_CONECTADO    = 30_000  // 30s
const INTERVALO_DESCONECTADO =  5_000  // 5s

export function useConectividad() {
  const { verificar, estado, setEstado } = useConectividadStore()
  const { pendientes } = useSyncStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const programarSiguiente = (estaConectado: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const ok = await verificar()
      programarSiguiente(ok)
    }, estaConectado ? INTERVALO_CONECTADO : INTERVALO_DESCONECTADO)
  }

  // Iniciar al montar — ping inmediato
  useEffect(() => {
    verificar().then(ok => programarSiguiente(ok))
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cruzar con pendientes de sync
  useEffect(() => {
    if (estado === 'conectado' && pendientes > 0) {
      setEstado('sin_sync')
    } else if (estado === 'sin_sync' && pendientes === 0) {
      setEstado('conectado')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendientes, estado])
}
