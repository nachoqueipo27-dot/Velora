import { getDb } from '../../db'
import type { TablaSyncable } from './types'

// Columnas a sincronizar por tabla — solo lo relevante para el portal.
const COLUMNAS_SYNC: Record<TablaSyncable, string> = {
  clientes: `
    id as local_row_id, nombre, telefono, email,
    direccion, categoria, notas,
    creado_en, actualizado_en, deleted_at
  `,
  empleados: `
    id as local_row_id, nombre,
    (SELECT r.nombre FROM roles r WHERE r.id = rol_id) as rol_nombre,
    activo, tipo_horario, creado_en, actualizado_en, deleted_at
  `,
  productos: `
    id as local_row_id, nombre, tipo,
    (SELECT c.nombre FROM categorias c WHERE c.id = categoria_id) as categoria,
    precio, precio_costo, stock, stock_minimo,
    activo, creado_en, actualizado_en, deleted_at
  `,
  ordenes_trabajo: `
    id as local_row_id, numero,
    (SELECT c.nombre FROM clientes c WHERE c.id = cliente_id) as cliente_nombre,
    (SELECT e.nombre FROM empleados e WHERE e.id = empleado_id) as empleado_nombre,
    producto_nombre, tipo_item, descripcion,
    estado, precio, total_final,
    creado_en, actualizado_en, deleted_at
  `,
  presupuestos: `
    id as local_row_id, numero,
    (SELECT c.nombre FROM clientes c WHERE c.id = cliente_id) as cliente_nombre,
    estado, total_final, fecha_vigencia,
    creado_en, actualizado_en, deleted_at
  `,
  cobros_caja: `
    id as local_row_id, fecha, monto, forma_pago, concepto
  `,
  gastos_operativos: `
    id as local_row_id, fecha, monto, categoria, descripcion
  `,
  cierres_caja: `
    id as local_row_id, fecha,
    total_efectivo, total_transferencia, total_tarjeta,
    total_ingresos, total_gastos, saldo_neto, cerrado_por
  `,
  cierres_mes: `
    id as local_row_id, anio, mes,
    total_ingresos, total_gastos, margen_operativo,
    ots_completadas, ots_canceladas,
    producto_mas_vendido, empleado_destacado, cerrado_por
  `,
  fichajes: `
    id as local_row_id,
    (SELECT e.nombre FROM empleados e WHERE e.id = empleado_id) as empleado_nombre,
    fecha, entrada, salida, horas_trabajadas
  `,
  movimientos_stock: `
    id as local_row_id,
    (SELECT p.nombre FROM productos p WHERE p.id = producto_id) as producto_nombre,
    tipo, cantidad, motivo, fecha
  `,
  proveedores: `
    id as local_row_id, nombre, rubro, contacto,
    telefono, email, activo, creado_en, actualizado_en
  `,
  ordenes_compra: `
    id as local_row_id,
    (SELECT p.nombre FROM proveedores p WHERE p.id = proveedor_id) as proveedor_nombre,
    estado, numero, total, creado_en, actualizado_en
  `,
}

// Tablas que tienen columna sync_status (definen el set sincronizable real).
export const TABLAS_SYNC: TablaSyncable[] = [
  'clientes', 'empleados', 'productos', 'ordenes_trabajo',
  'presupuestos', 'cobros_caja', 'gastos_operativos',
  'cierres_caja', 'cierres_mes', 'fichajes',
  'movimientos_stock', 'proveedores', 'ordenes_compra',
]

export async function getPendientes(
  tabla: TablaSyncable,
  limite = 100
): Promise<Record<string, unknown>[]> {
  const db = await getDb()
  const cols = COLUMNAS_SYNC[tabla]
  return db.select<Record<string, unknown>[]>(
    `SELECT ${cols}
     FROM ${tabla}
     WHERE sync_status = 'pendiente'
     ORDER BY rowid ASC
     LIMIT ?`,
    [limite]
  )
}

export async function marcarSincronizado(tabla: TablaSyncable, ids: number[]): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  const placeholders = ids.map(() => '?').join(',')
  await db.execute(
    `UPDATE ${tabla}
     SET sync_status = 'sincronizado', synced_at = ?
     WHERE id IN (${placeholders})`,
    [new Date().toISOString(), ...ids]
  )
}

export async function marcarError(tabla: TablaSyncable, ids: number[]): Promise<void> {
  if (ids.length === 0) return
  const db = await getDb()
  const placeholders = ids.map(() => '?').join(',')
  await db.execute(
    `UPDATE ${tabla}
     SET sync_status = 'error'
     WHERE id IN (${placeholders})`,
    ids
  )
}

export async function contarPendientes(): Promise<number> {
  const db = await getDb()
  let total = 0
  for (const tabla of TABLAS_SYNC) {
    const result = await db.select<{ count: number }[]>(
      `SELECT COUNT(*) as count FROM ${tabla} WHERE sync_status = 'pendiente'`,
      []
    )
    total += result[0]?.count ?? 0
  }
  return total
}
