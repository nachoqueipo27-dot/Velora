import { getDb } from '../db'
import { digitoVerificadorGS1 } from './barras'
import { exigirEditar } from './permisos'
import { registrarActividad } from './registrarActividad'

// Códigos propios para productos sin código (sueltos, embolsados, hechos en el local).
// EAN-13: prefijo 29 + correlativo de 10 dígitos + dígito verificador.
// El correlativo vive en configuracion → 'ultimo_codigo_interno' y nunca se repite: antes de
// asignar se verifica que el código no exista en productos_codigos.

/** Prefijo de los códigos internos que genera Velora. */
export const PREFIJO_INTERNO = '29'
/** Reservado para los códigos de balanza (peso o precio dentro del código). Velora no lo
 *  genera ni lo acepta como código interno. Lo usa el prompt de balanza. */
export const PREFIJO_BALANZA = '20'

const CLAVE = 'ultimo_codigo_interno'

/** true si es un EAN-13 que empieza con el prefijo reservado de balanza. */
export const esCodigoDeBalanza = (codigo: string) => /^\d{13}$/.test(codigo) && codigo.startsWith(PREFIJO_BALANZA)

export function armarCodigoInterno(correlativo: number): string {
  const cuerpo = PREFIJO_INTERNO + String(correlativo).padStart(10, '0')
  if (cuerpo.length !== 12) throw new Error('Se agotaron los códigos internos')
  return cuerpo + digitoVerificadorGS1(cuerpo)
}

/**
 * Reserva el próximo código interno libre (avanza el correlativo aunque después no se use:
 * así nunca se repite). No lo asigna a ningún producto.
 */
export async function generarCodigoInterno(): Promise<string> {
  const db = await getDb()
  const filas = await db.select<{ valor: string }[]>('SELECT valor FROM configuracion WHERE clave = ?', [CLAVE])
  let n = Number(filas[0]?.valor ?? 0) || 0
  let codigo: string
  for (;;) {
    n++
    codigo = armarCodigoInterno(n)
    const existe = await db.select<{ n: number }[]>('SELECT COUNT(*) AS n FROM productos_codigos WHERE codigo = ?', [codigo])
    if ((existe[0]?.n ?? 0) === 0) break
  }
  await db.execute(
    `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [CLAVE, String(n)]
  )
  return codigo
}

/** Genera un código interno y lo asigna al producto (tipo unidad). Devuelve el código. */
export async function asignarCodigoInterno(productoId: number): Promise<string> {
  exigirEditar('inventario')
  const db = await getDb()
  const codigo = await generarCodigoInterno()
  await db.execute(
    `INSERT INTO productos_codigos (producto_id, codigo, tipo, unidades_por_pack, creado_en) VALUES (?, ?, 'unidad', 1, ?)`,
    [productoId, codigo, new Date().toISOString()]
  )
  return codigo
}

/** Genera y asigna un código a cada producto de la lista. Devuelve producto → código. */
export async function asignarCodigosEnLote(productoIds: number[]): Promise<Map<number, string>> {
  exigirEditar('inventario')
  const asignados = new Map<number, string>()
  for (const id of productoIds) asignados.set(id, await asignarCodigoInterno(id))
  if (asignados.size > 0) {
    await registrarActividad({
      modulo: 'Inventario', accion: 'Generó códigos internos',
      detalle: `${asignados.size} producto${asignados.size === 1 ? '' : 's'}: ${[...asignados.values()].join(', ')}`,
    })
  }
  return asignados
}

/** Ids de los productos que tienen al menos un código (para el filtro "Sin código de barras"). */
export async function productosConCodigo(): Promise<Set<number>> {
  const db = await getDb()
  const filas = await db.select<{ producto_id: number }[]>('SELECT DISTINCT producto_id FROM productos_codigos')
  return new Set(filas.map(f => f.producto_id))
}
