import { getDb } from '../db'
import { useSessionStore } from '../store/sessionStore'

export async function registrarActividad(params: {
  modulo: string
  accion: string
  detalle?: string
  entidadTipo?: string
  entidadId?: number
  campoAnterior?: object
  campoNuevo?: object
}) {
  try {
    const db = await getDb()
    const usuario = useSessionStore.getState().usuario?.nombre ?? 'Sistema'
    const now = new Date().toISOString()
    await db.execute(
      `INSERT INTO historial_actividad
       (usuario, modulo, accion, detalle, entidad_tipo, entidad_id,
        campo_anterior, campo_nuevo, fecha, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuario, params.modulo, params.accion,
        params.detalle ?? null,
        params.entidadTipo ?? null,
        params.entidadId ?? null,
        params.campoAnterior ? JSON.stringify(params.campoAnterior) : null,
        params.campoNuevo ? JSON.stringify(params.campoNuevo) : null,
        now, now,
      ]
    )
  } catch (e) {
    console.warn('registrarActividad falló silenciosamente:', e)
  }
}
