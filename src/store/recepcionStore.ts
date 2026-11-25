import { create } from 'zustand'
import { getDb } from '../db'
import { exigirEditar } from '../lib/permisos'
import { registrarActividad } from '../lib/registrarActividad'
import { formatearPesos } from '../lib/dinero'
import { useAuthGlobalStore } from './authGlobalStore'
import { useInventarioStore } from './inventarioStore'
import { useEtiquetasStore } from './etiquetasStore'
import type { Producto, UnidadMedida } from '../types/inventario'
import { armarConfirmacion, cantidadOk, numeroRecepcion } from '../lib/recepcion/confirmacion'

// Recepción de mercadería por escaneo (contra una orden de compra o directa).
// Mismo patrón que "Agregar stock": una recepción abierta por usuario, guardada en la base en
// cada cambio (se retoma si la app se cierra) y confirmada en una sola transacción.
//
// Criterios:
//  - Lo marcado como dañado o vencido NO entra al stock (queda "para devolver") y NO cuenta
//    como recibido para la orden: sigue pendiente, para que el proveedor lo reponga.
//  - El estado de cada fila (Completo / Falta / De más) compara lo pedido con todo lo que
//    llegó físicamente (ya recibido antes + ahora); los dañados se marcan aparte.
//  - Referencia de precio: lo pactado en la orden; en la directa o en un producto no pedido,
//    el costo actual del producto.
//  - Productos con costo en USD: el costo no se actualiza desde la recepción (el proveedor
//    cobra en pesos); se avisa en la fila.

export interface FilaRecepcion {
  productoId: number
  nombre: string
  codigo: string | null
  unidadMedida: UnidadMedida
  monedaCosto: 'ARS' | 'USD'
  stockActual: number
  /** Costo actual del producto (centavos). */
  costoActual: number
  /** Precio de venta actual (centavos). */
  precioVenta: number
  /** Está en la orden. false = "No pedido" (o recepción directa). */
  enOrden: boolean
  pedido: number
  yaRecibido: number
  /** Costo pactado en la orden (centavos); null si no estaba en la orden. */
  costoPactado: number | null
  /** Líneas de la orden de este producto (para repartir lo recibido). */
  lineas: { itemId: number; cantidad: number; recibido: number }[]
  /** Todo lo que llegó ahora (incluye dañados y vencidos). */
  recibidoAhora: number
  /** Costo que cobró el proveedor, por unidad (centavos). */
  costoCobrado: number
  danado: number
  vencido: number
  notaProblema: string
  /** Se dio de alta en esta recepción (para ofrecer etiquetas). */
  nuevo: boolean
}

export interface RecepcionAbierta {
  id: number
  numero: number
  ordenId: number | null
  ordenNumero: number | null
  ordenFecha: string | null
  proveedorId: number
  proveedorNombre: string
  proveedorTelefono: string
  notas: string
  creadoEn: string
}

export interface ResumenAbierta { id: number; numero: number; ordenNumero: number | null; proveedorNombre: string; productos: number }

export interface SubaDeCosto {
  productoId: number
  nombre: string
  costoAntes: number
  costoNuevo: number
  precioVenta: number
  /** Mismo margen %: precio × costo nuevo / costo anterior. */
  sugerido: number
}

export interface ResultadoRecepcion {
  recepcion: RecepcionAbierta
  filas: FilaRecepcion[]
  estadoOrden: 'parcial' | 'recibida' | null
  totalCobrado: number
  subas: SubaDeCosto[]
}

export interface RecepcionHistorial {
  id: number
  numero: number
  ordenNumero: number | null
  proveedorNombre: string
  empleadoNombre: string
  notas: string
  confirmadoEn: string
  productos: number
  totalCobrado: number
}

export interface ItemRecepcionHistorial {
  productoId: number
  nombre: string
  unidadMedida: UnidadMedida
  cantidad: number
  estado: 'ok' | 'danado' | 'vencido'
  nota: string
  costoPactado: number | null
  costoCobrado: number | null
}

export { numeroRecepcion }
export const numeroOrden = (n: number) => `Orden #${String(n).padStart(4, '0')}`

/** Costo de referencia para comparar lo cobrado. */
export const costoReferencia = (f: FilaRecepcion) => f.costoPactado ?? f.costoActual

export type EstadoFila =
  | { tipo: 'completo' } | { tipo: 'falta'; n: number } | { tipo: 'demas'; n: number }
  | { tipo: 'no_pedido' } | { tipo: 'directa' }

/** Estado de la fila según lo pedido y todo lo que llegó (ya recibido + ahora). */
export function estadoFila(f: FilaRecepcion, conOrden: boolean): EstadoFila {
  if (!conOrden) return { tipo: 'directa' }
  if (!f.enOrden) return { tipo: 'no_pedido' }
  const llegado = f.yaRecibido + f.recibidoAhora
  const diferencia = Math.round((f.pedido - llegado) * 1000) / 1000
  if (diferencia === 0) return { tipo: 'completo' }
  return diferencia > 0 ? { tipo: 'falta', n: diferencia } : { tipo: 'demas', n: -diferencia }
}

export { cantidadOk }

// ─── Usuario, SQL ────────────────────────────────────────────────────────────

function usuarioActual(): { empleadoId: number | null; nombre: string } {
  const u = useAuthGlobalStore.getState().usuario
  return { empleadoId: u?.empleadoId ?? null, nombre: u?.nombre ?? 'Administrador' }
}
const FILTRO_USUARIO = `(r.empleado_id = ? OR (? IS NULL AND r.empleado_id IS NULL AND r.empleado_nombre = ?))`
const paramsUsuario = () => { const u = usuarioActual(); return [u.empleadoId, u.empleadoId, u.nombre] }
type Db = Awaited<ReturnType<typeof getDb>>

const COLUMNAS_PRODUCTO = `p.nombre, p.unidad_medida, p.moneda_costo, p.stock, p.precio_costo, p.precio, p.creado_en AS p_creado,
  (SELECT codigo FROM productos_codigos pc WHERE pc.producto_id = p.id ORDER BY pc.id LIMIT 1) AS codigo`

function filaBase(r: any, creadoRecepcion: string): FilaRecepcion {
  return {
    productoId: r.producto_id, nombre: r.nombre, codigo: r.codigo ?? null,
    unidadMedida: (r.unidad_medida ?? 'unidad') as UnidadMedida, monedaCosto: r.moneda_costo === 'USD' ? 'USD' : 'ARS',
    stockActual: r.stock ?? 0, costoActual: r.precio_costo ?? 0, precioVenta: r.precio ?? 0,
    enOrden: false, pedido: 0, yaRecibido: 0, costoPactado: null, lineas: [],
    recibidoAhora: 0, costoCobrado: r.precio_costo ?? 0, danado: 0, vencido: 0, notaProblema: '',
    nuevo: (r.p_creado ?? '') >= creadoRecepcion,
  }
}

async function cargarRecepcion(db: Db, id: number): Promise<{ recepcion: RecepcionAbierta; filas: FilaRecepcion[] }> {
  const cab = await db.select<any[]>(
    `SELECT r.*, pr.nombre AS proveedor_nombre, pr.telefono AS proveedor_telefono,
            o.numero AS orden_numero, COALESCE(o.fecha_envio, o.creado_en) AS orden_fecha
     FROM recepciones r JOIN proveedores pr ON pr.id = r.proveedor_id LEFT JOIN ordenes_compra o ON o.id = r.orden_id
     WHERE r.id = ?`, [id])
  const c = cab[0]
  if (!c) throw new Error('No se encontró la recepción.')
  const recepcion: RecepcionAbierta = {
    id: c.id, numero: c.numero, ordenId: c.orden_id ?? null, ordenNumero: c.orden_numero ?? null, ordenFecha: c.orden_fecha ?? null,
    proveedorId: c.proveedor_id, proveedorNombre: c.proveedor_nombre, proveedorTelefono: c.proveedor_telefono ?? '',
    notas: c.notas ?? '', creadoEn: c.creado_en,
  }

  const filas = new Map<number, FilaRecepcion>()
  // Lo pedido en la orden (aunque todavía no haya llegado nada).
  if (recepcion.ordenId) {
    const lineas = await db.select<any[]>(
      `SELECT i.id AS item_id, i.producto_id, i.cantidad, COALESCE(i.recibido, 0) AS recibido, i.precio_costo AS pactado, ${COLUMNAS_PRODUCTO}
       FROM items_orden_compra i JOIN productos p ON p.id = i.producto_id WHERE i.orden_id = ? ORDER BY i.id`,
      [recepcion.ordenId])
    for (const l of lineas) {
      const f = filas.get(l.producto_id) ?? { ...filaBase(l, recepcion.creadoEn), enOrden: true, costoPactado: l.pactado ?? 0, costoCobrado: l.pactado ?? 0 }
      f.pedido += l.cantidad
      f.yaRecibido += l.recibido
      f.lineas.push({ itemId: l.item_id, cantidad: l.cantidad, recibido: l.recibido })
      filas.set(l.producto_id, f)
    }
  }
  // Lo cargado en esta recepción.
  const items = await db.select<any[]>(
    `SELECT ir.producto_id, ir.cantidad, ir.estado, ir.nota, ir.costo_cobrado, ${COLUMNAS_PRODUCTO}
     FROM items_recepcion ir JOIN productos p ON p.id = ir.producto_id WHERE ir.recepcion_id = ? ORDER BY ir.id`, [id])
  for (const it of items) {
    const f = filas.get(it.producto_id) ?? filaBase(it, recepcion.creadoEn)
    f.recibidoAhora += it.cantidad
    if (it.estado === 'danado') { f.danado += it.cantidad; f.notaProblema = it.nota ?? f.notaProblema }
    if (it.estado === 'vencido') { f.vencido += it.cantidad; f.notaProblema = it.nota ?? f.notaProblema }
    if (it.costo_cobrado !== null && it.costo_cobrado !== undefined) f.costoCobrado = it.costo_cobrado
    filas.set(it.producto_id, f)
  }
  return { recepcion, filas: [...filas.values()] }
}

/** Reescribe las filas de items_recepcion de un producto (una por estado). */
async function guardarFila(db: Db, recepcionId: number, f: FilaRecepcion) {
  await db.execute('DELETE FROM items_recepcion WHERE recepcion_id = ? AND producto_id = ?', [recepcionId, f.productoId])
  const filas: [number, 'ok' | 'danado' | 'vencido'][] = [[cantidadOk(f), 'ok'], [f.danado, 'danado'], [f.vencido, 'vencido']]
  for (const [cantidad, estado] of filas) {
    // La fila 'ok' se guarda aunque sea 0 para no perder el costo cobrado editado.
    if (cantidad <= 0 && estado !== 'ok') continue
    await db.execute(
      `INSERT INTO items_recepcion (recepcion_id, producto_id, cantidad, costo_pactado, costo_cobrado, estado, nota) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [recepcionId, f.productoId, Math.max(0, cantidad), f.costoPactado, f.costoCobrado, estado, estado === 'ok' ? null : (f.notaProblema.trim() || null)]
    )
  }
}

export class ErrorRecepcionAbierta extends Error {}

interface RecepcionStore {
  recepcion: RecepcionAbierta | null
  filas: FilaRecepcion[]
  guardadoEn: string | null
  confirmando: boolean

  buscarAbierta: () => Promise<ResumenAbierta | null>
  /** Abre (o retoma) la recepción del usuario: contra una orden, o directa de un proveedor. */
  abrir: (destino: { ordenId: number } | { proveedorId: number }) => Promise<void>
  /** Retoma la abierta del usuario, sea cual sea. */
  retomar: () => Promise<void>
  sumar: (producto: Producto, cantidad: number) => Promise<void>
  fijarCantidad: (productoId: number, cantidad: number) => Promise<void>
  fijarCosto: (productoId: number, costo: number) => Promise<void>
  marcarProblema: (productoId: number, datos: { danado: number; vencido: number; nota: string }) => Promise<void>
  quitar: (productoId: number) => Promise<void>
  guardarNotas: (notas: string) => Promise<void>
  descartar: (recepcionId?: number) => Promise<void>
  confirmar: () => Promise<ResultadoRecepcion>
  cerrarVista: () => void
  /** Después de confirmar: precio de venta nuevo para los productos marcados (mismo margen). */
  actualizarPreciosVenta: (cambios: { productoId: number; precioNuevo: number }[], numero: number) => Promise<void>

  listarHistorial: () => Promise<RecepcionHistorial[]>
  detalleHistorial: (recepcionId: number) => Promise<ItemRecepcionHistorial[]>
}

export const useRecepcionStore = create<RecepcionStore>((set, get) => {
  const guardado = () => set({ guardadoEn: new Date().toISOString() })
  const persistir = async (f: FilaRecepcion) => {
    const r = get().recepcion
    if (!r) return
    await guardarFila(await getDb(), r.id, f)
    set({ filas: get().filas.map(x => (x.productoId === f.productoId ? f : x)) })
    guardado()
  }
  const fila = (productoId: number) => get().filas.find(f => f.productoId === productoId)

  return {
    recepcion: null,
    filas: [],
    guardadoEn: null,
    confirmando: false,

    buscarAbierta: async () => {
      const db = await getDb()
      const filas = await db.select<any[]>(
        `SELECT r.id, r.numero, o.numero AS orden_numero, pr.nombre AS proveedor_nombre,
                (SELECT COUNT(DISTINCT producto_id) FROM items_recepcion ir WHERE ir.recepcion_id = r.id AND ir.cantidad > 0) AS productos
         FROM recepciones r JOIN proveedores pr ON pr.id = r.proveedor_id LEFT JOIN ordenes_compra o ON o.id = r.orden_id
         WHERE r.estado = 'abierta' AND ${FILTRO_USUARIO} ORDER BY r.id DESC LIMIT 1`, paramsUsuario())
      const f = filas[0]
      return f ? { id: f.id, numero: f.numero, ordenNumero: f.orden_numero ?? null, proveedorNombre: f.proveedor_nombre, productos: f.productos } : null
    },

    abrir: async (destino) => {
      exigirEditar('proveedores')
      const db = await getDb()
      const abierta = await get().buscarAbierta()
      let id: number
      if (abierta) {
        const r = await db.select<any[]>('SELECT orden_id, proveedor_id FROM recepciones WHERE id = ?', [abierta.id])
        const mismo = 'ordenId' in destino
          ? r[0]?.orden_id === destino.ordenId
          : r[0]?.orden_id == null && r[0]?.proveedor_id === destino.proveedorId
        if (!mismo) {
          throw new ErrorRecepcionAbierta(
            `Tenés la ${numeroRecepcion(abierta.numero)} sin confirmar (${abierta.ordenNumero ? numeroOrden(abierta.ordenNumero) + ' · ' : ''}${abierta.proveedorNombre}). Confirmala o descartala antes de empezar otra.`)
        }
        id = abierta.id
      } else {
        let proveedorId: number
        let ordenId: number | null = null
        if ('ordenId' in destino) {
          const o = await db.select<any[]>('SELECT proveedor_id, estado FROM ordenes_compra WHERE id = ?', [destino.ordenId])
          if (!o[0]) throw new Error('No se encontró la orden.')
          if (o[0].estado !== 'enviada' && o[0].estado !== 'parcial') throw new Error('Solo se reciben órdenes enviadas o parciales.')
          proveedorId = o[0].proveedor_id
          ordenId = destino.ordenId
        } else proveedorId = destino.proveedorId
        const u = usuarioActual()
        const max = await db.select<{ m: number | null }[]>('SELECT MAX(numero) AS m FROM recepciones')
        const res = await db.execute(
          `INSERT INTO recepciones (numero, orden_id, proveedor_id, estado, empleado_id, empleado_nombre, creado_en) VALUES (?, ?, ?, 'abierta', ?, ?, ?)`,
          [(max[0]?.m ?? 0) + 1, ordenId, proveedorId, u.empleadoId, u.nombre, new Date().toISOString()])
        id = Number(res.lastInsertId)
      }
      const { recepcion, filas } = await cargarRecepcion(db, id)
      set({ recepcion, filas, guardadoEn: null, confirmando: false })
    },

    retomar: async () => {
      exigirEditar('proveedores')
      const abierta = await get().buscarAbierta()
      if (!abierta) throw new Error('No hay una recepción abierta.')
      const { recepcion, filas } = await cargarRecepcion(await getDb(), abierta.id)
      set({ recepcion, filas, guardadoEn: null, confirmando: false })
    },

    sumar: async (producto, cantidad) => {
      exigirEditar('proveedores')
      const r = get().recepcion
      if (!r || !(cantidad > 0)) return
      const existente = fila(producto.id)
      if (existente) { await persistir({ ...existente, recibidoAhora: existente.recibidoAhora + cantidad }); return }
      const nueva: FilaRecepcion = {
        productoId: producto.id, nombre: producto.nombre, codigo: null, unidadMedida: producto.unidadMedida,
        monedaCosto: producto.monedaCosto, stockActual: producto.stock, costoActual: producto.precioCosto, precioVenta: producto.precio,
        enOrden: false, pedido: 0, yaRecibido: 0, costoPactado: null, lineas: [],
        recibidoAhora: cantidad, costoCobrado: producto.precioCosto, danado: 0, vencido: 0, notaProblema: '',
        nuevo: producto.creadoEn >= r.creadoEn,
      }
      const db = await getDb()
      const cod = await db.select<{ codigo: string }[]>('SELECT codigo FROM productos_codigos WHERE producto_id = ? ORDER BY id LIMIT 1', [producto.id])
      nueva.codigo = cod[0]?.codigo ?? null
      await guardarFila(db, r.id, nueva)
      set({ filas: [...get().filas, nueva] })
      guardado()
    },

    fijarCantidad: async (productoId, cantidad) => {
      exigirEditar('proveedores')
      const f = fila(productoId)
      if (!f) return
      const n = Math.max(0, cantidad)
      if (n === 0 && !f.enOrden) { await get().quitar(productoId); return }
      // Si baja la cantidad, los dañados/vencidos no pueden quedar por encima.
      const problemas = f.danado + f.vencido
      const ajuste = problemas > n ? n / problemas : 1
      await persistir({ ...f, recibidoAhora: n, danado: f.danado * ajuste, vencido: f.vencido * ajuste })
    },

    fijarCosto: async (productoId, costo) => {
      exigirEditar('proveedores')
      const f = fila(productoId)
      if (!f || !(costo >= 0)) return
      await persistir({ ...f, costoCobrado: Math.round(costo) })
    },

    marcarProblema: async (productoId, { danado, vencido, nota }) => {
      exigirEditar('proveedores')
      const f = fila(productoId)
      if (!f) return
      if (danado < 0 || vencido < 0 || danado + vencido > f.recibidoAhora) {
        throw new Error('Los dañados y vencidos no pueden superar lo que llegó.')
      }
      await persistir({ ...f, danado, vencido, notaProblema: nota })
    },

    quitar: async (productoId) => {
      exigirEditar('proveedores')
      const r = get().recepcion
      const f = fila(productoId)
      if (!r || !f) return
      const db = await getDb()
      await db.execute('DELETE FROM items_recepcion WHERE recepcion_id = ? AND producto_id = ?', [r.id, productoId])
      // Lo pedido en la orden queda (en 0); un "no pedido" desaparece.
      set({ filas: f.enOrden
        ? get().filas.map(x => (x.productoId === productoId ? { ...x, recibidoAhora: 0, danado: 0, vencido: 0, costoCobrado: x.costoPactado ?? x.costoActual } : x))
        : get().filas.filter(x => x.productoId !== productoId) })
      guardado()
    },

    guardarNotas: async (notas) => {
      const r = get().recepcion
      if (!r || notas === r.notas) return
      await (await getDb()).execute('UPDATE recepciones SET notas = ? WHERE id = ?', [notas.trim() || null, r.id])
      set({ recepcion: { ...r, notas } })
      guardado()
    },

    descartar: async (recepcionId) => {
      exigirEditar('proveedores')
      const id = recepcionId ?? get().recepcion?.id
      if (!id) return
      await (await getDb()).execute(`UPDATE recepciones SET estado = 'descartada' WHERE id = ? AND estado = 'abierta'`, [id])
      if (get().recepcion?.id === id) set({ recepcion: null, filas: [], guardadoEn: null })
    },

    confirmar: async () => {
      exigirEditar('proveedores')
      const { recepcion: r, filas, confirmando } = get()
      if (!r || confirmando) throw new Error('No hay una recepción abierta.')
      const recibidas = filas.filter(f => f.recibidoAhora > 0)
      if (recibidas.length === 0) throw new Error('No se cargó nada en esta recepción.')
      set({ confirmando: true })
      const db = await getDb()
      try {
        // Doble clic / otra ventana: solo se confirma una recepción abierta.
        const estado = await db.select<{ estado: string }[]>('SELECT estado FROM recepciones WHERE id = ?', [r.id])
        if (estado[0]?.estado !== 'abierta') throw new Error('Esta recepción ya no está abierta.')

        const ahora = new Date().toISOString()
        const motivo = numeroRecepcion(r.numero)
        const { sql, subas, totalCobrado, estadoOrden } = armarConfirmacion(r, filas, ahora, usuarioActual().nombre)
        try {
          await db.execute(sql)
        } catch (e) {
          try { await db.execute('ROLLBACK') } catch { /* la transacción quedó en otra conexión */ }
          throw e
        }

        await registrarActividad({
          modulo: 'Proveedores', accion: `Confirmó la ${motivo}`, entidadTipo: 'recepcion', entidadId: r.id,
          detalle: `${motivo} (${r.proveedorNombre}, ${recibidas.length} producto${recibidas.length === 1 ? '' : 's'}, ${formatearPesos(totalCobrado)})`
            + (r.ordenNumero ? ` · ${numeroOrden(r.ordenNumero)} ${estadoOrden === 'recibida' ? 'recibida' : 'parcial'}` : ''),
        })
        set({ recepcion: null, filas: [], guardadoEn: null })
        await useInventarioStore.getState().cargarProductos()
        return { recepcion: r, filas, estadoOrden, totalCobrado, subas }
      } finally {
        set({ confirmando: false })
      }
    },

    cerrarVista: () => set({ recepcion: null, filas: [], guardadoEn: null }),

    actualizarPreciosVenta: async (cambios, numero) => {
      exigirEditar('lista-precios')
      if (cambios.length === 0) return
      const db = await getDb()
      const ahora = new Date().toISOString()
      const por = usuarioActual().nombre
      for (const c of cambios) {
        const previo = await db.select<{ precio: number }[]>('SELECT precio FROM productos WHERE id = ?', [c.productoId])
        const anterior = previo[0]?.precio ?? 0
        if (anterior === c.precioNuevo) continue
        await db.execute('UPDATE productos SET precio = ?, actualizado_en = ? WHERE id = ?', [c.precioNuevo, ahora, c.productoId])
        await db.execute(
          `INSERT INTO historial_precios (producto_id, precio_anterior, precio_nuevo, porcentaje, motivo, tipo, aplicado_por, fecha, creado_en)
           VALUES (?, ?, ?, ?, ?, 'precio', ?, ?, ?)`,
          [c.productoId, anterior, c.precioNuevo, anterior > 0 ? Math.round(((c.precioNuevo - anterior) / anterior) * 10000) / 100 : null,
           `Mismo margen tras la ${numeroRecepcion(numero)}`, por, ahora, ahora])
      }
      await useEtiquetasStore.getState().registrarCambioPrecio(cambios.map(c => c.productoId))
      await registrarActividad({
        modulo: 'Proveedores', accion: 'Actualizó precios de venta manteniendo el margen',
        detalle: `${cambios.length} producto${cambios.length === 1 ? '' : 's'} · ${numeroRecepcion(numero)}`,
      })
      await useInventarioStore.getState().cargarProductos()
    },

    listarHistorial: async () => {
      const db = await getDb()
      const filas = await db.select<any[]>(
        `SELECT r.*, pr.nombre AS proveedor_nombre, o.numero AS orden_numero,
                (SELECT COUNT(DISTINCT producto_id) FROM items_recepcion ir WHERE ir.recepcion_id = r.id AND ir.cantidad > 0) AS productos
         FROM recepciones r JOIN proveedores pr ON pr.id = r.proveedor_id LEFT JOIN ordenes_compra o ON o.id = r.orden_id
         WHERE r.estado = 'confirmada' ORDER BY r.numero DESC`)
      return filas.map(f => ({
        id: f.id, numero: f.numero, ordenNumero: f.orden_numero ?? null, proveedorNombre: f.proveedor_nombre,
        empleadoNombre: f.empleado_nombre ?? '—', notas: f.notas ?? '', confirmadoEn: f.confirmado_en ?? f.creado_en,
        productos: f.productos, totalCobrado: f.total_cobrado ?? 0,
      }))
    },

    detalleHistorial: async (recepcionId) => {
      const db = await getDb()
      const filas = await db.select<any[]>(
        `SELECT ir.*, p.nombre, p.unidad_medida FROM items_recepcion ir JOIN productos p ON p.id = ir.producto_id
         WHERE ir.recepcion_id = ? AND ir.cantidad > 0 ORDER BY p.nombre, ir.estado`, [recepcionId])
      return filas.map(f => ({
        productoId: f.producto_id, nombre: f.nombre, unidadMedida: (f.unidad_medida ?? 'unidad') as UnidadMedida,
        cantidad: f.cantidad, estado: f.estado, nota: f.nota ?? '', costoPactado: f.costo_pactado ?? null, costoCobrado: f.costo_cobrado ?? null,
      }))
    },
  }
})
