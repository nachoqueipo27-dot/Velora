import { create } from 'zustand'
import { porCantidad } from '../lib/dinero'
import { getDb } from '../db'
import { registrarActividad } from '../lib/registrarActividad'
import { exigirEditar } from '../lib/permisos'
import { ErrorValidacion } from '../db/acceso'
import type { CodigoProducto } from '../lib/codigos'
import type {
  Producto, Categoria, ComponenteConjunto, MovimientoStock, InformeRentabilidad, Trazabilidad, UnidadMedida,
} from '../types/inventario'

export interface ComponenteInput {
  componenteId: number
  cantidad: number
}

export interface NuevoProducto {
  nombre: string
  tipo: 'simple' | 'conjunto'
  descripcion: string
  categoriaId: number | null
  precio: number
  precioCosto: number
  monedaCosto: 'ARS' | 'USD'
  codigoSku: string
  stock: number
  stockMinimo: number
  imagen: string | null
  trazabilidad: Trazabilidad
  unidadMedida: UnidadMedida
  activo: boolean
  /** Códigos de barras. undefined = no tocar los que ya tiene. */
  codigos?: CodigoProducto[]
}

interface InventarioStore {
  productos: Producto[]
  categorias: Categoria[]
  componentes: ComponenteConjunto[]
  movimientos: MovimientoStock[]
  informe: InformeRentabilidad[]
  loading: boolean
  productoSeleccionado: Producto | null

  cargarProductos: () => Promise<void>
  cargarCategorias: () => Promise<void>
  crearCategoria: (nombre: string) => Promise<number | null>
  /** Devuelve el id del producto creado. */
  crearProducto: (data: NuevoProducto, componentes: ComponenteInput[]) => Promise<number>
  actualizarProducto: (id: number, data: NuevoProducto, componentes: ComponenteInput[]) => Promise<void>
  eliminarProducto: (id: number) => Promise<void>
  seleccionarProducto: (p: Producto | null) => void
  cargarComponentes: (conjuntoId: number) => Promise<ComponenteConjunto[]>
  ajustarStock: (productoId: number, cantidad: number, tipo: 'entrada' | 'salida' | 'ajuste', motivo: string) => Promise<void>
  cargarMovimientos: (productoId: number) => Promise<void>
  obtenerSalidasPorProducto: (desdeISO?: string) => Promise<Map<number, number>>
  cargarInformeRentabilidad: () => Promise<void>
}

export const mapProducto = (r: any): Producto => ({
  id: r.id,
  nombre: r.nombre,
  tipo: r.tipo,
  descripcion: r.descripcion ?? '',
  categoriaId: r.categoria_id ?? null,
  categoriaNombre: r.categoria_nombre ?? '',
  precio: r.precio ?? 0,
  precioCosto: r.precio_costo ?? 0,
  monedaCosto: (r.moneda_costo ?? 'ARS') as 'ARS' | 'USD',
  codigoSku: r.codigo_sku ?? '',
  stock: r.stock ?? 0,
  stockMinimo: r.stock_minimo ?? 0,
  imagen: r.imagen ?? null,
  trazabilidad: (r.trazabilidad ?? 'ninguna') as Trazabilidad,
  unidadMedida: (r.unidad_medida ?? 'unidad') as UnidadMedida,
  activo: r.activo === 1 || r.activo === true,
  creadoEn: r.creado_en,
  actualizadoEn: r.actualizado_en,
})

async function guardarComponentes(
  db: Awaited<ReturnType<typeof getDb>>,
  conjuntoId: number,
  componentes: ComponenteInput[],
) {
  await db.execute('DELETE FROM conjunto_componentes WHERE conjunto_id = ?', [conjuntoId])
  for (const c of componentes) {
    await db.execute(
      'INSERT INTO conjunto_componentes (conjunto_id, componente_id, cantidad) VALUES (?, ?, ?)',
      [conjuntoId, c.componenteId, c.cantidad]
    )
  }
}

type Db = Awaited<ReturnType<typeof getDb>>

/**
 * Valida los códigos de un producto: sin vacíos, sin repetidos y que ningún OTRO producto
 * los use (dice cuál). Lanza ErrorValidacion. Va antes de escribir nada.
 */
async function validarCodigos(db: Db, productoId: number | null, codigos: CodigoProducto[]): Promise<CodigoProducto[]> {
  const limpios = codigos
    .map(c => ({ ...c, codigo: c.codigo.trim() }))
    .filter(c => c.codigo !== '')
  const vistos = new Set<string>()
  for (const c of limpios) {
    if (vistos.has(c.codigo)) throw new ErrorValidacion(`El código ${c.codigo} está cargado dos veces.`)
    vistos.add(c.codigo)
    const otros = await db.select<{ nombre: string }[]>(
      `SELECT p.nombre FROM productos_codigos pc JOIN productos p ON p.id = pc.producto_id
       WHERE pc.codigo = ? AND pc.producto_id <> ? LIMIT 1`,
      [c.codigo, productoId ?? -1]
    )
    if (otros.length) throw new ErrorValidacion(`El código ${c.codigo} ya lo usa «${otros[0].nombre}».`)
    if (c.tipo === 'pack' && !(c.unidadesPorPack > 0)) {
      throw new ErrorValidacion(`Indicá cuántas unidades trae el pack ${c.codigo}.`)
    }
  }
  return limpios
}

/** Reemplaza los códigos del producto por los validados. */
async function guardarCodigos(db: Db, productoId: number, codigos: CodigoProducto[]) {
  const now = new Date().toISOString()
  await db.execute('DELETE FROM productos_codigos WHERE producto_id = ?', [productoId])
  for (const c of codigos) {
    await db.execute(
      'INSERT INTO productos_codigos (producto_id, codigo, tipo, unidades_por_pack, creado_en) VALUES (?, ?, ?, ?, ?)',
      [productoId, c.codigo, c.tipo, c.tipo === 'pack' ? c.unidadesPorPack : 1, now]
    )
  }
}

export const useInventarioStore = create<InventarioStore>((set, get) => ({
  productos: [],
  categorias: [],
  componentes: [],
  movimientos: [],
  informe: [],
  loading: false,
  productoSeleccionado: null,

  cargarProductos: async () => {
    set({ loading: true })
    try {
      const db = await getDb()
      const rows = await db.select<any[]>(
        `SELECT p.*, c.nombre as categoria_nombre
         FROM productos p LEFT JOIN categorias c ON p.categoria_id = c.id
         ORDER BY p.nombre ASC`
      )
      set({ productos: rows.map(mapProducto), loading: false })
    } catch (e) {
      console.error('cargarProductos', e)
      set({ loading: false })
    }
  },

  cargarCategorias: async () => {
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT * FROM categorias ORDER BY nombre ASC')
    set({ categorias: rows.map(r => ({ id: r.id, nombre: r.nombre })) })
  },

  crearCategoria: async (nombre) => {
    exigirEditar('inventario')
    const db = await getDb()
    try {
      const res = await db.execute(
        'INSERT INTO categorias (nombre, creado_en) VALUES (?, ?)',
        [nombre, new Date().toISOString()]
      )
      await get().cargarCategorias()
      return Number(res.lastInsertId)
    } catch (e) {
      console.error('crearCategoria', e)
      return null
    }
  },

  crearProducto: async (data, componentes) => {
    exigirEditar('inventario')
    const db = await getDb()
    const now = new Date().toISOString()
    const codigos = data.codigos ? await validarCodigos(db, null, data.codigos) : []
    const res = await db.execute(
      `INSERT INTO productos
       (nombre, tipo, descripcion, categoria_id, precio, precio_costo, moneda_costo, codigo_sku, stock, stock_minimo, imagen, trazabilidad, unidad_medida, activo, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.nombre, data.tipo, data.descripcion, data.categoriaId, data.precio, data.precioCosto, data.monedaCosto,
       data.codigoSku, data.stock, data.stockMinimo, data.imagen, data.trazabilidad, data.unidadMedida, data.activo ? 1 : 0, now, now]
    )
    const id = Number(res.lastInsertId)
    if (data.tipo === 'conjunto') await guardarComponentes(db, id, componentes)
    if (codigos.length) await guardarCodigos(db, id, codigos)
    await registrarActividad({ modulo: 'Inventario', accion: 'Creó un producto', detalle: data.nombre, entidadTipo: 'producto', entidadId: id })
    await get().cargarProductos()
    return id
  },

  actualizarProducto: async (id, data, componentes) => {
    exigirEditar('inventario')
    const db = await getDb()
    const now = new Date().toISOString()
    const codigos = data.codigos ? await validarCodigos(db, id, data.codigos) : null
    await db.execute(
      `UPDATE productos SET nombre=?, tipo=?, descripcion=?, categoria_id=?, precio=?, precio_costo=?, moneda_costo=?,
        codigo_sku=?, stock=?, stock_minimo=?, imagen=?, trazabilidad=?, unidad_medida=?, activo=?, actualizado_en=? WHERE id=?`,
      [data.nombre, data.tipo, data.descripcion, data.categoriaId, data.precio, data.precioCosto, data.monedaCosto,
       data.codigoSku, data.stock, data.stockMinimo, data.imagen, data.trazabilidad, data.unidadMedida, data.activo ? 1 : 0, now, id]
    )
    if (data.tipo === 'conjunto') await guardarComponentes(db, id, componentes)
    else await db.execute('DELETE FROM conjunto_componentes WHERE conjunto_id = ?', [id])
    if (codigos) await guardarCodigos(db, id, codigos)
    await registrarActividad({ modulo: 'Inventario', accion: 'Editó un producto', detalle: data.nombre, entidadTipo: 'producto', entidadId: id })
    await get().cargarProductos()
    const sel = get().productoSeleccionado
    if (sel && sel.id === id) set({ productoSeleccionado: get().productos.find(p => p.id === id) ?? null })
  },

  eliminarProducto: async (id) => {
    exigirEditar('inventario')
    const db = await getDb()
    const previo = get().productos.find(p => p.id === id)
    // Los códigos primero: referencian al producto.
    await db.execute('DELETE FROM productos_codigos WHERE producto_id = ?', [id])
    await db.execute('DELETE FROM productos WHERE id = ?', [id])
    await db.execute('DELETE FROM conjunto_componentes WHERE conjunto_id = ? OR componente_id = ?', [id, id])
    await db.execute('DELETE FROM movimientos_stock WHERE producto_id = ?', [id])
    await registrarActividad({ modulo: 'Inventario', accion: 'Eliminó un producto', detalle: previo?.nombre, entidadTipo: 'producto', entidadId: id })
    await get().cargarProductos()
  },

  seleccionarProducto: (p) => set({ productoSeleccionado: p }),

  cargarComponentes: async (conjuntoId) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT cc.*, p.nombre as componente_nombre, p.stock as stock_componente
       FROM conjunto_componentes cc JOIN productos p ON cc.componente_id = p.id
       WHERE cc.conjunto_id = ?`,
      [conjuntoId]
    )
    const comps: ComponenteConjunto[] = rows.map(r => ({
      id: r.id,
      conjuntoId: r.conjunto_id,
      componenteId: r.componente_id,
      componenteNombre: r.componente_nombre,
      cantidad: r.cantidad,
      stockComponente: r.stock_componente ?? 0,
    }))
    set({ componentes: comps })
    return comps
  },

  ajustarStock: async (productoId, cantidad, tipo, motivo) => {
    exigirEditar('inventario')
    const db = await getDb()
    const now = new Date().toISOString()
    const prod = get().productos.find(p => p.id === productoId)
    if (!prod) return
    let nuevoStock = prod.stock
    if (tipo === 'entrada') nuevoStock = prod.stock + cantidad
    else if (tipo === 'salida') nuevoStock = Math.max(0, prod.stock - cantidad)
    else nuevoStock = cantidad // ajuste: valor absoluto
    await db.execute(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, fecha, creado_en) VALUES (?, ?, ?, ?, ?, ?)`,
      [productoId, tipo, cantidad, motivo, now, now]
    )
    await db.execute('UPDATE productos SET stock = ?, actualizado_en = ? WHERE id = ?', [nuevoStock, now, productoId])
    await get().cargarProductos()
    await get().cargarMovimientos(productoId)
    const sel = get().productoSeleccionado
    if (sel && sel.id === productoId) set({ productoSeleccionado: get().productos.find(p => p.id === productoId) ?? null })
  },

  cargarMovimientos: async (productoId) => {
    const db = await getDb()
    const rows = await db.select<any[]>(
      `SELECT m.*, p.nombre as producto_nombre FROM movimientos_stock m
       JOIN productos p ON m.producto_id = p.id
       WHERE m.producto_id = ? ORDER BY m.fecha DESC`,
      [productoId]
    )
    set({
      movimientos: rows.map(r => ({
        id: r.id,
        productoId: r.producto_id,
        productoNombre: r.producto_nombre,
        tipo: r.tipo,
        cantidad: r.cantidad,
        motivo: r.motivo ?? null,
        lote: r.lote ?? null,
        serie: r.serie ?? null,
        fecha: r.fecha,
      })),
    })
  },

  obtenerSalidasPorProducto: async (desdeISO) => {
    const db = await getDb()
    const rows = desdeISO
      ? await db.select<any[]>(
          `SELECT producto_id, SUM(cantidad) as total FROM movimientos_stock WHERE tipo='salida' AND fecha >= ? GROUP BY producto_id`,
          [desdeISO]
        )
      : await db.select<any[]>(
          `SELECT producto_id, SUM(cantidad) as total FROM movimientos_stock WHERE tipo='salida' GROUP BY producto_id`
        )
    const map = new Map<number, number>()
    rows.forEach(r => map.set(r.producto_id, Number(r.total)))
    return map
  },

  cargarInformeRentabilidad: async () => {
    const { productos } = get()
    if (productos.length === 0) await get().cargarProductos()
    const lista = get().productos
    const salidas = await get().obtenerSalidasPorProducto()
    const informe: InformeRentabilidad[] = lista.map(p => {
      const unidades = salidas.get(p.id) ?? 0
      const margenUnitario = p.precio - p.precioCosto
      const margenPorcentaje = p.precio > 0 ? (margenUnitario / p.precio) * 100 : 0
      return {
        productoId: p.id,
        productoNombre: p.nombre,
        categoria: p.categoriaNombre,
        precioCosto: p.precioCosto,
        precioVenta: p.precio,
        margenUnitario,
        margenPorcentaje,
        unidadesVendidas: unidades,
        margenAcumulado: porCantidad(margenUnitario, unidades), // centavos (unidades puede ser kg/m)
      }
    })
    set({ informe })
  },
}))
