export type TablaSyncable =
  | 'clientes'
  | 'empleados'
  | 'productos'
  | 'ordenes_trabajo'
  | 'presupuestos'
  | 'cobros_caja'
  | 'gastos_operativos'
  | 'cierres_caja'
  | 'cierres_mes'
  | 'fichajes'
  | 'movimientos_stock'
  | 'proveedores'
  | 'ordenes_compra'

export interface RegistroSync {
  local_id: string      // remote_id del local en Supabase
  local_row_id: number  // id local del registro en SQLite
  [key: string]: unknown
}

export interface ResultadoSync {
  tabla: TablaSyncable
  procesados: number
  errores: number
  timestamp: string
}

export interface EstadoSync {
  enCurso: boolean
  ultimaSync: string | null
  error: string | null
  progreso: { tabla: string; total: number; procesados: number } | null
}
