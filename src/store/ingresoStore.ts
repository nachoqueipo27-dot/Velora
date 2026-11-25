import { create } from 'zustand'
import { getDb } from '../db'
import { exigirEditar } from '../lib/permisos'
import { registrarActividad } from '../lib/registrarActividad'
import { useAuthGlobalStore } from './authGlobalStore'
import { useInventarioStore } from './inventarioStore'
import { UNIDAD_ABREVIADA, permiteDecimales, type Producto, type UnidadMedida } from '../types/inventario'

// "Agregar stock" por escaneo. Un ingreso abierto por usuario, guardado en la base en
// cada cambio (si la app se cierra, se retoma). El stock de los productos cambia recién al
// confirmar: una sola transacción suma el stock, crea los movimientos y cierra el ingreso.

export interface ItemIngreso {
  productoId: number
  nombre: string
  /** Primer código del producto (para mostrar). */
  codigo: string | null
  unidadMedida: UnidadMedida
  /** Stock actual del producto (antes de confirmar). */
  stockActual: number
  /** Lo que ingresa. */
  cantidad: number
}

export interface IngresoAbierto {
  id: number
  numero: number
  notas: string
  creadoEn: string
}

export interface ResumenIngresoAbierto { id: number; numero: number; productos: number }

export interface IngresoHistorial {
  id: number
  numero: number
  estado: 'abierto' | 'confirmado' | 'descartado'
  empleadoNombre: string
  notas: string
  creadoEn: string
  confirmadoEn: string | null
  productos: number
  /** Suma de cantidades (unidades y kg/m mezclados: solo para ordenar). */
  unidades: number
}

export interface ItemIngresoHistorial {
  productoId: number
  nombre: string
  unidadMedida: UnidadMedida
  cantidad: number
  stockAntes: number | null
}

/** "Ingreso #0001". */
export const numeroIngreso = (n: number) => `Ingreso #${String(n).padStart(4, '0')}`

/** "+86 unidades + 5 kg": suma por unidad de medida (las enteras juntas como "unidades"). */
export function resumenCantidades(items: { cantidad: number; unidadMedida: UnidadMedida }[]): string {
  const porUnidad = new Map<string, number>()
  for (const it of items) {
    const clave = permiteDecimales(it.unidadMedida) ? (UNIDAD_ABREVIADA[it.unidadMedida] ?? it.unidadMedida) : 'unidades'
    porUnidad.set(clave, (porUnidad.get(clave) ?? 0) + it.cantidad)
  }
  const partes = [...porUnidad.entries()].map(([u, n]) =>
    `${n.toLocaleString('es-AR', { maximumFractionDigits: 3 })} ${u === 'unidades' && n === 1 ? 'unidad' : u}`)
  return partes.length ? partes.join(' + ') : '0 unidades'
}

/** Quién es "el usuario" del ingreso: empleado_id, o el dueño (empleado_id null + nombre). */
function usuarioActual(): { empleadoId: number | null; nombre: string } {
  const u = useAuthGlobalStore.getState().usuario
  return { empleadoId: u?.empleadoId ?? null, nombre: u?.nombre ?? 'Administrador' }
}

const FILTRO_USUARIO = `(empleado_id = ? OR (? IS NULL AND empleado_id IS NULL AND empleado_nombre = ?))`
const paramsUsuario = () => { const u = usuarioActual(); return [u.empleadoId, u.empleadoId, u.nombre] }

type Db = Awaited<ReturnType<typeof getDb>>

async function leerItems(db: Db, ingresoId: number): Promise<ItemIngreso[]> {
  const filas = await db.select<any[]>(
    `SELECT i.producto_id, i.cantidad, p.nombre, p.stock, p.unidad_medida,
            (SELECT codigo FROM productos_codigos pc WHERE pc.producto_id = i.producto_id ORDER BY pc.id LIMIT 1) AS codigo
     FROM items_ingreso_stock i JOIN productos p ON p.id = i.producto_id
     WHERE i.ingreso_id = ? ORDER BY i.id DESC`,
    [ingresoId]
  )
  return filas.map(f => ({
    productoId: f.producto_id, nombre: f.nombre, codigo: f.codigo ?? null,
    unidadMedida: (f.unidad_medida ?? 'unidad') as UnidadMedida, stockActual: f.stock ?? 0, cantidad: f.cantidad,
  }))
}

interface IngresoStore {
  ingreso: IngresoAbierto | null
  items: ItemIngreso[]
  /** Hora del último guardado (para "Sesión guardada automáticamente · 10:42"). */
  guardadoEn: string | null
  confirmando: boolean

  /** Ingreso abierto del usuario, si hay (para "Tenés un ingreso sin confirmar"). */
  buscarAbierto: () => Promise<ResumenIngresoAbierto | null>
  /** Retoma el abierto del usuario o crea uno nuevo. */
  abrir: () => Promise<void>
  /** Suma cantidad a un producto (misma fila si ya estaba). */
  sumar: (producto: Producto, cantidad: number) => Promise<void>
  fijarCantidad: (productoId: number, cantidad: number) => Promise<void>
  quitar: (productoId: number) => Promise<void>
  guardarNotas: (notas: string) => Promise<void>
  /** Descarta el ingreso abierto del usuario (no toca el stock). */
  descartar: (ingresoId?: number) => Promise<void>
  /** Confirma: suma el stock y deja el ingreso cerrado. Devuelve lo confirmado. */
  confirmar: () => Promise<{ numero: number; items: ItemIngreso[] }>
  /** Sale de la pantalla (el ingreso queda abierto en la base). */
  cerrarVista: () => void

  listarHistorial: () => Promise<IngresoHistorial[]>
  detalleHistorial: (ingresoId: number) => Promise<ItemIngresoHistorial[]>
}

export const useIngresoStore = create<IngresoStore>((set, get) => {
  const marcarGuardado = () => set({ guardadoEn: new Date().toISOString() })

  return {
    ingreso: null,
    items: [],
    guardadoEn: null,
    confirmando: false,

    buscarAbierto: async () => {
      const db = await getDb()
      const filas = await db.select<any[]>(
        `SELECT g.id, g.numero, (SELECT COUNT(*) FROM items_ingreso_stock i WHERE i.ingreso_id = g.id) AS productos
         FROM ingresos_stock g WHERE g.estado = 'abierto' AND ${FILTRO_USUARIO.replace(/empleado_/g, 'g.empleado_')}
         ORDER BY g.id DESC LIMIT 1`,
        paramsUsuario()
      )
      return filas.length ? { id: filas[0].id, numero: filas[0].numero, productos: filas[0].productos } : null
    },

    abrir: async () => {
      exigirEditar('inventario')
      const db = await getDb()
      const abierto = await db.select<any[]>(
        `SELECT * FROM ingresos_stock WHERE estado = 'abierto' AND ${FILTRO_USUARIO} ORDER BY id DESC LIMIT 1`,
        paramsUsuario()
      )
      let fila = abierto[0]
      if (!fila) {
        const u = usuarioActual()
        const max = await db.select<{ m: number | null }[]>('SELECT MAX(numero) AS m FROM ingresos_stock')
        const numero = (max[0]?.m ?? 0) + 1
        const ahora = new Date().toISOString()
        const res = await db.execute(
          `INSERT INTO ingresos_stock (numero, estado, empleado_id, empleado_nombre, creado_en) VALUES (?, 'abierto', ?, ?, ?)`,
          [numero, u.empleadoId, u.nombre, ahora]
        )
        fila = { id: Number(res.lastInsertId), numero, notas: null, creado_en: ahora }
      }
      set({
        ingreso: { id: fila.id, numero: fila.numero, notas: fila.notas ?? '', creadoEn: fila.creado_en },
        items: await leerItems(db, fila.id),
        guardadoEn: null,
        confirmando: false,
      })
    },

    sumar: async (producto, cantidad) => {
      exigirEditar('inventario')
      const ingreso = get().ingreso
      if (!ingreso || !(cantidad > 0)) return
      const db = await getDb()
      const existe = get().items.find(i => i.productoId === producto.id)
      if (existe) {
        await db.execute(
          'UPDATE items_ingreso_stock SET cantidad = cantidad + ? WHERE ingreso_id = ? AND producto_id = ?',
          [cantidad, ingreso.id, producto.id]
        )
        set({ items: get().items.map(i => i.productoId === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i) })
      } else {
        await db.execute(
          'INSERT INTO items_ingreso_stock (ingreso_id, producto_id, cantidad) VALUES (?, ?, ?)',
          [ingreso.id, producto.id, cantidad]
        )
        const codigo = await db.select<{ codigo: string }[]>(
          'SELECT codigo FROM productos_codigos WHERE producto_id = ? ORDER BY id LIMIT 1', [producto.id])
        const nuevo: ItemIngreso = {
          productoId: producto.id, nombre: producto.nombre, codigo: codigo[0]?.codigo ?? null,
          unidadMedida: producto.unidadMedida, stockActual: producto.stock, cantidad,
        }
        set({ items: [nuevo, ...get().items] })
      }
      marcarGuardado()
    },

    fijarCantidad: async (productoId, cantidad) => {
      exigirEditar('inventario')
      const ingreso = get().ingreso
      if (!ingreso) return
      if (!(cantidad > 0)) { await get().quitar(productoId); return }
      const db = await getDb()
      await db.execute(
        'UPDATE items_ingreso_stock SET cantidad = ? WHERE ingreso_id = ? AND producto_id = ?',
        [cantidad, ingreso.id, productoId]
      )
      set({ items: get().items.map(i => i.productoId === productoId ? { ...i, cantidad } : i) })
      marcarGuardado()
    },

    quitar: async (productoId) => {
      exigirEditar('inventario')
      const ingreso = get().ingreso
      if (!ingreso) return
      const db = await getDb()
      await db.execute('DELETE FROM items_ingreso_stock WHERE ingreso_id = ? AND producto_id = ?', [ingreso.id, productoId])
      set({ items: get().items.filter(i => i.productoId !== productoId) })
      marcarGuardado()
    },

    guardarNotas: async (notas) => {
      const ingreso = get().ingreso
      if (!ingreso || notas === ingreso.notas) return
      const db = await getDb()
      await db.execute('UPDATE ingresos_stock SET notas = ? WHERE id = ?', [notas.trim() || null, ingreso.id])
      set({ ingreso: { ...ingreso, notas } })
      marcarGuardado()
    },

    descartar: async (ingresoId) => {
      exigirEditar('inventario')
      const id = ingresoId ?? get().ingreso?.id
      if (!id) return
      const db = await getDb()
      await db.execute(`UPDATE ingresos_stock SET estado = 'descartado' WHERE id = ? AND estado = 'abierto'`, [id])
      if (get().ingreso?.id === id) set({ ingreso: null, items: [], guardadoEn: null })
    },

    confirmar: async () => {
      exigirEditar('inventario')
      const { ingreso, items, confirmando } = get()
      if (!ingreso || confirmando) throw new Error('No hay un ingreso abierto.')
      if (items.length === 0) throw new Error('El ingreso no tiene productos.')
      set({ confirmando: true })
      const db = await getDb()
      try {
        // Que no se confirme dos veces (doble clic, otra ventana).
        const estado = await db.select<{ estado: string }[]>('SELECT estado FROM ingresos_stock WHERE id = ?', [ingreso.id])
        if (estado[0]?.estado !== 'abierto') throw new Error('Este ingreso ya no está abierto.')

        const ahora = new Date().toISOString()
        const motivo = numeroIngreso(ingreso.numero)
        // Todo va como literal en un único script (una sola conexión del pool = una transacción
        // real). Solo números validados, el ISO de la fecha y el motivo armado acá.
        const filas = await db.select<{ id: number; producto_id: number; cantidad: number }[]>(
          'SELECT id, producto_id, cantidad FROM items_ingreso_stock WHERE ingreso_id = ?', [ingreso.id])
        const sql: string[] = ['BEGIN;']
        for (const f of filas) {
          if (!Number.isInteger(f.id) || !Number.isInteger(f.producto_id) || !Number.isFinite(f.cantidad) || f.cantidad <= 0) {
            throw new Error('Hay un ítem con datos inválidos en el ingreso.')
          }
          sql.push(
            `UPDATE items_ingreso_stock SET stock_antes = (SELECT stock FROM productos WHERE id = ${f.producto_id}) WHERE id = ${f.id};`,
            `UPDATE productos SET stock = COALESCE(stock, 0) + ${f.cantidad}, actualizado_en = '${ahora}' WHERE id = ${f.producto_id};`,
            `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia_id, fecha, creado_en)
               VALUES (${f.producto_id}, 'entrada', ${f.cantidad}, '${motivo}', ${ingreso.id}, '${ahora}', '${ahora}');`,
          )
        }
        sql.push(`UPDATE ingresos_stock SET estado = 'confirmado', confirmado_en = '${ahora}' WHERE id = ${ingreso.id} AND estado = 'abierto';`)
        sql.push('COMMIT;')
        try {
          await db.execute(sql.join('\n'))
        } catch (e) {
          try { await db.execute('ROLLBACK') } catch { /* la transacción quedó en otra conexión */ }
          throw e
        }

        await registrarActividad({
          modulo: 'Inventario',
          accion: `Confirmó el ${motivo}`,
          detalle: `${motivo} (${items.length} producto${items.length === 1 ? '' : 's'}, ${resumenCantidades(items)})`,
          entidadTipo: 'ingreso_stock', entidadId: ingreso.id,
        })
        set({ ingreso: null, items: [], guardadoEn: null })
        await useInventarioStore.getState().cargarProductos()
        return { numero: ingreso.numero, items }
      } finally {
        set({ confirmando: false })
      }
    },

    cerrarVista: () => set({ ingreso: null, items: [], guardadoEn: null }),

    listarHistorial: async () => {
      const db = await getDb()
      const filas = await db.select<any[]>(
        `SELECT g.*, COUNT(i.id) AS productos, COALESCE(SUM(i.cantidad), 0) AS unidades
         FROM ingresos_stock g LEFT JOIN items_ingreso_stock i ON i.ingreso_id = g.id
         WHERE g.estado = 'confirmado'
         GROUP BY g.id ORDER BY g.numero DESC`
      )
      return filas.map(f => ({
        id: f.id, numero: f.numero, estado: f.estado, empleadoNombre: f.empleado_nombre ?? '—', notas: f.notas ?? '',
        creadoEn: f.creado_en, confirmadoEn: f.confirmado_en ?? null, productos: f.productos, unidades: f.unidades,
      }))
    },

    detalleHistorial: async (ingresoId) => {
      const db = await getDb()
      const filas = await db.select<any[]>(
        `SELECT i.producto_id, i.cantidad, i.stock_antes, p.nombre, p.unidad_medida
         FROM items_ingreso_stock i JOIN productos p ON p.id = i.producto_id
         WHERE i.ingreso_id = ? ORDER BY p.nombre`,
        [ingresoId]
      )
      return filas.map(f => ({
        productoId: f.producto_id, nombre: f.nombre, unidadMedida: (f.unidad_medida ?? 'unidad') as UnidadMedida,
        cantidad: f.cantidad, stockAntes: f.stock_antes ?? null,
      }))
    },
  }
})
