import { invoke } from '@tauri-apps/api/core'
import { getPendientes, marcarSincronizado, marcarError } from './queries'
import { actualizarUltimaSync } from '../../db/master'
import { useNegocioStore } from '../../store/negocioStore'
import { useConectividadStore } from '../../store/conectividadStore'
import { getDb } from '../../db'
import type { TablaSyncable, ResultadoSync } from './types'

const TABLAS_ORDEN: TablaSyncable[] = [
  'clientes',
  'empleados',
  'productos',
  'proveedores',
  'ordenes_compra',
  'presupuestos',
  'ordenes_trabajo',
  'cobros_caja',
  'gastos_operativos',
  'cierres_caja',
  'cierres_mes',
  'fichajes',
  'movimientos_stock',
]

export async function sincronizarTabla(
  tabla: TablaSyncable,
  localRemoteId: string,
  onProgreso?: (procesados: number, total: number) => void
): Promise<ResultadoSync> {
  const pendientes = await getPendientes(tabla, 200)
  if (pendientes.length === 0) {
    return { tabla, procesados: 0, errores: 0, timestamp: new Date().toISOString() }
  }

  const registros = pendientes.map(r => ({ ...r, local_id: localRemoteId }))
  onProgreso?.(0, pendientes.length)

  try {
    const resultado = await invoke<{ ok: boolean; procesados: number; error?: string }>(
      'sync_tabla',
      { payload: { local_id: localRemoteId, tabla, registros } }
    )

    if (resultado.ok) {
      const ids = pendientes.map(r => r.local_row_id as number)
      await marcarSincronizado(tabla, ids)
      onProgreso?.(pendientes.length, pendientes.length)
      return { tabla, procesados: resultado.procesados, errores: 0, timestamp: new Date().toISOString() }
    } else {
      const ids = pendientes.map(r => r.local_row_id as number)
      await marcarError(tabla, ids)
      return { tabla, procesados: 0, errores: pendientes.length, timestamp: new Date().toISOString() }
    }
  } catch {
    const ids = pendientes.map(r => r.local_row_id as number)
    await marcarError(tabla, ids)
    return { tabla, procesados: 0, errores: pendientes.length, timestamp: new Date().toISOString() }
  }
}

// Resuelve el UUID del local en Supabase: primero el negocioStore, si no, la tabla configuracion.
export async function resolverLocalRemoteId(): Promise<string | null> {
  const negocio = useNegocioStore.getState().negocioActivo
  if (negocio?.localRemoteId) return negocio.localRemoteId
  try {
    const db = await getDb()
    const rows = await db.select<{ valor: string }[]>(
      "SELECT valor FROM configuracion WHERE clave = 'sync_local_remote_id'"
    )
    return rows[0]?.valor?.trim() || null
  } catch {
    return null
  }
}

export async function sincronizarTodo(
  onProgreso?: (tabla: string, procesados: number, total: number) => void
): Promise<ResultadoSync[]> {
  // Verificar conectividad real antes de intentar el sync.
  const hayConexion = await useConectividadStore.getState().verificar()
  if (!hayConexion) {
    throw new Error(
      'Sin conexión con Supabase. Los cambios quedan guardados y se sincronizarán automáticamente cuando vuelva la conexión.'
    )
  }

  const localRemoteId = await resolverLocalRemoteId()
  if (!localRemoteId) {
    throw new Error('No hay Remote ID del local. Completalo en Configuración → Sincronización.')
  }

  const resultados: ResultadoSync[] = []
  for (const tabla of TABLAS_ORDEN) {
    const resultado = await sincronizarTabla(
      tabla,
      localRemoteId,
      (procesados, total) => onProgreso?.(tabla, procesados, total)
    )
    resultados.push(resultado)
  }

  const localId = useNegocioStore.getState().negocioActivo?.localId
  if (localId != null) await actualizarUltimaSync(localId)
  return resultados
}

export async function enviarHeartbeat(): Promise<void> {
  const localRemoteId = await resolverLocalRemoteId()
  if (!localRemoteId) return

  try {
    const db = await getDb()

    const otsActivas = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM ordenes_trabajo
       WHERE estado IN ('recepcion','en_proceso','finalizado')`
    )

    const hoy = new Date().toISOString().split('T')[0]
    const cobros = await db.select<{ total: number }[]>(
      `SELECT COALESCE(SUM(monto), 0) as total FROM cobros_caja WHERE substr(fecha,1,10) = ?`, [hoy])
    const gastos = await db.select<{ total: number }[]>(
      `SELECT COALESCE(SUM(monto), 0) as total FROM gastos_operativos WHERE substr(fecha,1,10) = ?`, [hoy])

    await invoke('sync_heartbeat', {
      payload: {
        local_id: localRemoteId,
        ots_activas: otsActivas[0]?.count ?? 0,
        saldo_caja_hoy: (cobros[0]?.total ?? 0) - (gastos[0]?.total ?? 0),
        empleados_online: 1,
        version_app: '1.0.0',
        fecha: new Date().toISOString(),
      },
    })
  } catch (e) {
    console.warn('Heartbeat falló silenciosamente:', e)
  }
}
