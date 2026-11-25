import { getDb } from '../db'
import { mapProducto } from '../store/inventarioStore'
import type { Producto } from '../types/inventario'

// Códigos de barras de los productos (tabla productos_codigos).
// Un producto puede tener varios códigos; un código pertenece a un solo producto.
// tipo 'pack': un escaneo de ese código suma `unidadesPorPack` unidades (ej. caja de 12).

export type TipoCodigo = 'unidad' | 'pack'

export interface CodigoProducto {
  codigo: string
  tipo: TipoCodigo
  /** Unidades que suma un escaneo. 1 para 'unidad'. */
  unidadesPorPack: number
}

export interface ResultadoCodigo {
  producto: Producto
  /** Cuántas unidades representa el escaneo (un pack de 12 → 12). */
  unidades: number
  codigo: CodigoProducto
}

/** Lo que llega del lector o del teclado, sin espacios a los costados. */
export const normalizarCodigo = (codigo: string) => codigo.trim()

// ─── Dígito verificador (GS1) ────────────────────────────────────────────────
// Desde la derecha (sin contar el verificador), las posiciones impares pesan 3 y las pares 1.

function verificadorGS1(digitos: string): boolean {
  if (!/^\d+$/.test(digitos)) return false
  const cuerpo = digitos.slice(0, -1)
  let suma = 0
  for (let i = 0; i < cuerpo.length; i++) {
    const d = cuerpo.charCodeAt(cuerpo.length - 1 - i) - 48
    suma += i % 2 === 0 ? d * 3 : d
  }
  return (10 - (suma % 10)) % 10 === digitos.charCodeAt(digitos.length - 1) - 48
}

export const validarEAN13 = (codigo: string) => /^\d{13}$/.test(codigo) && verificadorGS1(codigo)
export const validarEAN8 = (codigo: string) => /^\d{8}$/.test(codigo) && verificadorGS1(codigo)
export const validarUPC = (codigo: string) => /^\d{12}$/.test(codigo) && verificadorGS1(codigo)

/**
 * Los códigos con forma de EAN-13 / EAN-8 / UPC-A y dígito verificador inválido se aceptan
 * igual (hay productos mal impresos), pero se avisa en la consola.
 */
export function avisarSiVerificadorInvalido(codigo: string): void {
  const invalido =
    (codigo.length === 13 && /^\d+$/.test(codigo) && !validarEAN13(codigo)) ||
    (codigo.length === 12 && /^\d+$/.test(codigo) && !validarUPC(codigo)) ||
    (codigo.length === 8 && /^\d+$/.test(codigo) && !validarEAN8(codigo))
  if (invalido) console.warn(`Código ${codigo}: el dígito verificador no coincide (se acepta igual).`)
}

// ─── Consultas ──────────────────────────────────────────────────────────────

/** Producto al que pertenece el código y cuántas unidades suma un escaneo, o null. */
export async function buscarPorCodigo(codigo: string): Promise<ResultadoCodigo | null> {
  const c = normalizarCodigo(codigo)
  if (!c) return null
  avisarSiVerificadorInvalido(c)
  const db = await getDb()
  const filas = await db.select<any[]>(
    `SELECT p.*, cat.nombre AS categoria_nombre,
            pc.codigo AS pc_codigo, pc.tipo AS pc_tipo, pc.unidades_por_pack AS pc_unidades
     FROM productos_codigos pc
     JOIN productos p ON p.id = pc.producto_id
     LEFT JOIN categorias cat ON cat.id = p.categoria_id
     WHERE pc.codigo = ? LIMIT 1`,
    [c]
  )
  if (filas.length === 0) return null
  const f = filas[0]
  const tipo: TipoCodigo = f.pc_tipo === 'pack' ? 'pack' : 'unidad'
  const unidades = tipo === 'pack' ? Math.max(1, Number(f.pc_unidades) || 1) : 1
  return {
    producto: mapProducto(f),
    unidades,
    codigo: { codigo: f.pc_codigo, tipo, unidadesPorPack: unidades },
  }
}

/** Códigos de un producto, en el orden en que se cargaron. */
export async function cargarCodigos(productoId: number): Promise<CodigoProducto[]> {
  const db = await getDb()
  const filas = await db.select<any[]>(
    'SELECT codigo, tipo, unidades_por_pack FROM productos_codigos WHERE producto_id = ? ORDER BY id',
    [productoId]
  )
  return filas.map(f => ({
    codigo: f.codigo,
    tipo: f.tipo === 'pack' ? 'pack' : 'unidad',
    unidadesPorPack: f.tipo === 'pack' ? Number(f.unidades_por_pack) || 1 : 1,
  }))
}

/** Si el código ya lo usa OTRO producto, devuelve cuál. */
export async function codigoEnUso(
  codigo: string,
  exceptoProductoId?: number | null,
): Promise<{ productoId: number; nombre: string } | null> {
  const db = await getDb()
  const filas = await db.select<{ producto_id: number; nombre: string }[]>(
    `SELECT pc.producto_id, p.nombre FROM productos_codigos pc JOIN productos p ON p.id = pc.producto_id
     WHERE pc.codigo = ? AND pc.producto_id <> ? LIMIT 1`,
    [normalizarCodigo(codigo), exceptoProductoId ?? -1]
  )
  return filas.length ? { productoId: filas[0].producto_id, nombre: filas[0].nombre } : null
}
