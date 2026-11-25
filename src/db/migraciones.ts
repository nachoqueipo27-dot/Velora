import type Database from '@tauri-apps/plugin-sql'
import { getMasterDb } from './master'
import { hashPassword, esBcrypt, decodificarLegacy } from '../lib/crypto'

// Migraciones versionadas de velora.db.
//
// Cada migración corre UNA sola vez y queda registrada en `_migraciones`.
// Corren después de `respaldarSiCambioVersion()` (copia de las bases en backups/) y de
// `initSchema()`. Cada una es un único script SQL que va de BEGIN a COMMIT y que inserta
// su propia fila en `_migraciones` antes del COMMIT: o se aplica entera y queda marcada,
// o no se aplica nada.
//
// Por qué un solo execute: tauri-plugin-sql usa un pool de conexiones, así que un BEGIN,
// los UPDATE y el COMMIT mandados en llamadas separadas pueden caer en conexiones
// distintas y la transacción no protegería nada.
//
// Si una migración falla, la app NO arranca (getDb rechaza): el COMMIT nunca corrió, así
// que la base queda como estaba, la marca de versión no se actualiza y en el próximo
// inicio se vuelve a respaldar y a intentar.

export const MENSAJE_ERROR_MIGRACION =
  'No se pudo actualizar la base. Tus datos están a salvo en backups/. Contactá a soporte.'

export class ErrorMigracion extends Error {
  readonly migracion: string
  readonly causa: unknown
  constructor(migracion: string, causa: unknown) {
    super(MENSAJE_ERROR_MIGRACION)
    this.name = 'ErrorMigracion'
    this.migracion = migracion
    this.causa = causa
  }
}

interface Migracion {
  id: string
  /** Script completo BEGIN … COMMIT. `ahora` es ISO (sin comillas). */
  sql: (ahora: string, db: Database) => string | Promise<string>
  /** Paso previo fuera de la base (idempotente); corre también en instalaciones nuevas. */
  antes?: () => void
}

const MIGRACIONES: Migracion[] = [
  { id: '2026_12_centavos', sql: sqlCentavos },
  { id: '2026_12_hash_claves', sql: sqlHashClaves, antes: limpiarClavesLocalStorage },
]

/** true si la base todavía no tiene tablas de negocio (hay que llamarla ANTES de initSchema). */
export async function esInstalacionNueva(db: Database): Promise<boolean> {
  const filas = await db.select<{ n: number }[]>(
    `SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'productos'`
  )
  return (filas[0]?.n ?? 0) === 0
}

/**
 * Aplica las migraciones pendientes. En una instalación nueva las tablas ya nacen con el
 * formato final, así que solo se marcan como aplicadas.
 * Lanza `ErrorMigracion` si alguna falla.
 */
export async function aplicarMigraciones(db: Database, instalacionNueva: boolean): Promise<void> {
  await db.execute(`CREATE TABLE IF NOT EXISTS _migraciones (id TEXT PRIMARY KEY, aplicada_en TEXT)`)
  const filas = await db.select<{ id: string }[]>('SELECT id FROM _migraciones')
  const aplicadas = new Set(filas.map(f => f.id))

  for (const m of MIGRACIONES) {
    if (aplicadas.has(m.id)) continue
    const ahora = new Date().toISOString()
    m.antes?.()

    if (instalacionNueva) {
      await db.execute('INSERT OR IGNORE INTO _migraciones (id, aplicada_en) VALUES (?, ?)', [m.id, ahora])
      continue
    }

    try {
      await db.execute(await m.sql(ahora, db))
    } catch (e) {
      console.error(`Falló la migración ${m.id}:`, e)
      // Si la conexión que falló quedó con la transacción abierta, se descarta igual al
      // cerrarse la app; este ROLLBACK es por las dudas y puede caer en otra conexión.
      try { await db.execute('ROLLBACK') } catch { /* no había transacción abierta en esta conexión */ }
      throw new ErrorMigracion(m.id, e)
    }
  }
}

// ─── 2026_12_centavos ────────────────────────────────────────────────────────
// Pasa todos los montos en pesos (REAL) a enteros en centavos (× 100, redondeado).
// No toca stock, cantidades, horas, porcentajes ni tipos de cambio.
// SQLite no cambia el tipo declarado de columnas existentes: en bases viejas la columna
// sigue diciendo REAL pero guarda enteros. No se recrean tablas.

/** Columnas que se convierten siempre. */
const COLUMNAS_PLATA: Record<string, string[]> = {
  productos:          ['precio', 'precio_costo'],
  ordenes_compra:     ['total'],
  items_orden_compra: ['precio_costo'],
  historial_precios:  ['precio_anterior', 'precio_nuevo'],
  presupuestos:       ['subtotal', 'total_final'],            // descuento: solo si es monto (abajo)
  items_presupuesto:  ['precio_unitario', 'descuento_item', 'subtotal'],
  ordenes_trabajo:    ['precio', 'total_final'],              // descuento: solo si es monto (abajo)
  ventas_pos:         ['subtotal', 'descuento', 'total_final'],
  items_venta_pos:    ['precio_unitario', 'subtotal'],        // descuento_item: solo si es monto (abajo)
  cobros_caja:        ['monto'],
  gastos_operativos:  ['monto'],
  cierres_caja:       ['total_efectivo', 'total_transferencia', 'total_tarjeta', 'total_ingresos', 'total_gastos', 'saldo_neto'],
  cierres_mes:        ['total_ingresos', 'total_gastos', 'margen_operativo'],
  devoluciones:       ['total_devuelto'],
  items_devolucion:   ['precio_unitario', 'subtotal_devuelto'],
}

const x100 = (col: string) => `${col} = CAST(ROUND(${col} * 100) AS INTEGER)`

// items_venta_pos.descuento_item guardaba el número crudo (% o $ según el tipo global del
// carrito, que no se guardaba). Se infiere con el subtotal guardado (valores viejos, en pesos),
// tolerancia $ 0,01. Si encaja en las dos fórmulas (bruto = $ 100) se toma porcentaje:
// el monto resultante es el mismo y el valor queda igual.
const ENCAJA_PORCENTAJE =
  `ABS(subtotal - MAX(0, cantidad * precio_unitario * (1 - descuento_item / 100.0))) <= 0.010001`
const ENCAJA_MONTO =
  `ABS(subtotal - MAX(0, cantidad * precio_unitario - descuento_item)) <= 0.010001`

// Snapshots JSON (aprobado por Ignacio: se convierten en la misma migración).
const SNAPSHOT_LISTA_VALIDO =
  `CASE WHEN json_valid(snapshot) THEN json_type(snapshot) = 'array' ELSE 0 END`
const CAMPOS_CIERRE_MES = ['totalIngresos', 'totalGastos', 'margenOperativo']

function sqlCentavos(ahora: string): string {
  const s: string[] = ['BEGIN;']

  // 1. Tipo de descuento de los ítems POS viejos (antes de convertir: usa valores en pesos).
  s.push(`UPDATE items_venta_pos SET tipo_descuento_item = 'monto'
    WHERE descuento_item > 0 AND (${ENCAJA_MONTO}) AND NOT (${ENCAJA_PORCENTAJE});`)

  // 2. Registro en el historial de actividad, con los conteos (también antes de convertir).
  s.push(`INSERT INTO historial_actividad (usuario, modulo, accion, detalle, fecha, creado_en)
    SELECT 'Sistema', 'Sistema', 'Convirtió los montos a centavos',
      'Migración 2026_12_centavos. Descuentos por ítem de ventas POS: '
      || (SELECT COUNT(*) FROM items_venta_pos WHERE tipo_descuento_item = 'monto') || ' en pesos, '
      || (SELECT COUNT(*) FROM items_venta_pos WHERE descuento_item > 0 AND tipo_descuento_item <> 'monto' AND (${ENCAJA_PORCENTAJE})) || ' en porcentaje, '
      || (SELECT COUNT(*) FROM items_venta_pos WHERE descuento_item > 0 AND NOT (${ENCAJA_PORCENTAJE}) AND NOT (${ENCAJA_MONTO})) || ' sin tipo identificable (quedaron igual). '
      || 'Snapshots con JSON inválido (quedaron igual): '
      || (SELECT COUNT(*) FROM listas_precios_snapshot WHERE NOT (${SNAPSHOT_LISTA_VALIDO})) || ' de listas de precios, '
      || (SELECT COUNT(*) FROM cierres_mes WHERE NOT COALESCE(json_valid(snapshot), 0)) || ' de cierres de mes.',
      '${ahora}', '${ahora}';`)

  // 3. Descuentos que dependen del tipo.
  s.push(`UPDATE items_venta_pos SET ${x100('descuento_item')} WHERE tipo_descuento_item = 'monto';`)
  s.push(`UPDATE presupuestos SET ${x100('descuento')} WHERE tipo_descuento = 'monto';`)
  s.push(`UPDATE ordenes_trabajo SET ${x100('descuento')} WHERE tipo_descuento = 'monto';`)

  // 4. Columnas que son siempre plata.
  for (const [tabla, cols] of Object.entries(COLUMNAS_PLATA)) {
    s.push(`UPDATE ${tabla} SET ${cols.map(x100).join(', ')};`)
  }

  // 5. Snapshot de listas de precios: [{ productoId, nombre, precio }] → precio × 100.
  //    restaurarSnapshot() escribe ese precio en productos.precio: tiene que estar en centavos.
  s.push(`UPDATE listas_precios_snapshot SET snapshot = (
      SELECT json_group_array(json(CASE
        WHEN e.type = 'object' AND json_type(e.value, '$.precio') IN ('integer', 'real')
          THEN json_set(e.value, '$.precio', CAST(ROUND(json_extract(e.value, '$.precio') * 100) AS INTEGER))
        WHEN e.type IN ('object', 'array') THEN e.value
        ELSE json_quote(e.value)
      END))
      FROM (SELECT value, type FROM json_each(listas_precios_snapshot.snapshot) ORDER BY key) AS e
    )
    WHERE ${SNAPSHOT_LISTA_VALIDO};`)

  // 6. Snapshot de cierres de mes: los tres totales en pesos → centavos.
  for (const campo of CAMPOS_CIERRE_MES) {
    s.push(`UPDATE cierres_mes
      SET snapshot = json_set(snapshot, '$.${campo}', CAST(ROUND(json_extract(snapshot, '$.${campo}') * 100) AS INTEGER))
      WHERE CASE WHEN json_valid(snapshot) THEN json_type(snapshot, '$.${campo}') IN ('integer', 'real') ELSE 0 END;`)
  }

  // 7. Marca (dentro de la transacción) y fin.
  s.push(`INSERT INTO _migraciones (id, aplicada_en) VALUES ('2026_12_centavos', '${ahora}');`)
  s.push('COMMIT;')
  return s.join('\n')
}

/** Solo para verificar el script fuera de la app (no se usa en runtime). */
export const _sqlCentavosParaPruebas = sqlCentavos

// ─── 2026_12_hash_claves ─────────────────────────────────────────────────────
// Pasa a bcrypt las claves que quedaron en btoa: empleados.password (velora.db) y
// usuarios_master.password / respuesta_seguridad_hash (velora_master.db).
// Un valor corrupto queda como estaba y solo se cuenta en el historial.
//
// Son dos archivos, así que no hay una transacción común: primero va master y al final
// velora.db junto con la marca. Cada UPDATE solo toca valores que todavía no son bcrypt,
// así que si se corta en el medio el reintento retoma sin hashear dos veces.

const FORMATO_BCRYPT = /^\$2[ab]\$\d{2}\$[./A-Za-z0-9]{53}$/

async function convertirClaves(tabla: string, columna: string, filas: { id: number; valor: string | null }[]) {
  const updates: string[] = []
  let corruptas = 0
  for (const { id, valor } of filas) {
    if (valor === null || esBcrypt(valor)) continue
    const texto = decodificarLegacy(valor)
    if (texto === null) { corruptas++; continue }
    const hash = await hashPassword(texto)
    // El hash y el id van como literales en el script: no se acepta otra cosa.
    if (!FORMATO_BCRYPT.test(hash) || !Number.isInteger(id)) {
      throw new Error(`Hash o id inesperado en ${tabla}.${columna}`)
    }
    updates.push(`UPDATE ${tabla} SET ${columna} = '${hash}' WHERE id = ${id} AND ${columna} NOT LIKE '$2_$%';`)
  }
  return { updates, corruptas }
}

async function sqlHashClaves(ahora: string, db: Database): Promise<string> {
  const master = await getMasterDb()

  // 1. Todos los hashes primero (bcrypt en Rust, asíncrono).
  const empleados = await convertirClaves('empleados', 'password',
    await db.select('SELECT id, password AS valor FROM empleados'))
  const usuarios = await convertirClaves('usuarios_master', 'password',
    await master.select('SELECT id, password AS valor FROM usuarios_master'))
  const respuestas = await convertirClaves('usuarios_master', 'respuesta_seguridad_hash',
    await master.select('SELECT id, respuesta_seguridad_hash AS valor FROM usuarios_master'))

  // 2. velora_master.db, en su propia transacción.
  const updatesMaster = [...usuarios.updates, ...respuestas.updates]
  if (updatesMaster.length > 0) {
    try {
      await master.execute(['BEGIN;', ...updatesMaster, 'COMMIT;'].join('\n'))
    } catch (e) {
      try { await master.execute('ROLLBACK') } catch { /* no había transacción abierta en esta conexión */ }
      throw e
    }
  }

  // 3. velora.db: claves, historial y marca, en una sola transacción.
  const resumen = (r: { updates: string[]; corruptas: number }) =>
    `${r.updates.length} convertidas, ${r.corruptas} con valor inválido (quedaron igual)`
  return [
    'BEGIN;',
    ...empleados.updates,
    `INSERT INTO historial_actividad (usuario, modulo, accion, detalle, fecha, creado_en)
      VALUES ('Sistema', 'Sistema', 'Protegió las contraseñas con hash',
        'Migración 2026_12_hash_claves. Contraseñas de empleados: ${resumen(empleados)}. Contraseñas de usuarios del sistema: ${resumen(usuarios)}. Respuestas de seguridad: ${resumen(respuestas)}.',
        '${ahora}', '${ahora}');`,
    `INSERT INTO _migraciones (id, aplicada_en) VALUES ('2026_12_hash_claves', '${ahora}');`,
    'COMMIT;',
  ].join('\n')
}

// Versiones anteriores persistían el onboarding completo (con la contraseña del admin en
// texto plano). Se borran esos campos de lo que ya quedó guardado en la PC.
const STORES_PERSISTIDOS = ['velora-onboarding', 'velora-session', 'velora-auth-global']
const CAMPOS_SECRETOS = new Set([
  'adminPassword', 'adminRespuestaSeguridad', 'password', 'passwordHash', 'pin', 'pinHash',
  'respuestaSeguridad', 'respuestaHash', 'respuesta_seguridad_hash',
])

function limpiarClavesLocalStorage(): void {
  for (const clave of STORES_PERSISTIDOS) {
    try {
      const guardado = localStorage.getItem(clave)
      if (!guardado) continue
      const limpio = JSON.stringify(JSON.parse(guardado), (campo, valor) =>
        CAMPOS_SECRETOS.has(campo) ? undefined : valor)
      if (limpio !== guardado) localStorage.setItem(clave, limpio)
    } catch (e) {
      console.error(`No se pudo limpiar ${clave}:`, e)
    }
  }
}
