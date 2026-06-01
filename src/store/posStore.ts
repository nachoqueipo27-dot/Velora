import { create } from 'zustand'
import { getDb } from '../db'
import { useSessionStore } from './sessionStore'
import { useInventarioStore } from './inventarioStore'
import type { FormaPago, ItemCarrito, VentaPOS } from '../types/pos'

interface PosStore {
  carrito: ItemCarrito[]
  descuentoGlobal: number
  tipoDescuentoGlobal: 'porcentaje' | 'monto'
  formaPago: FormaPago
  empleadoPOS: { id: number; nombre: string } | null
  procesando: boolean

  agregarProducto: (productoId: number, tipoItem: 'simple' | 'conjunto') => Promise<void>
  quitarProducto: (productoId: number) => void
  actualizarCantidad: (productoId: number, cantidad: number) => void
  actualizarDescuentoItem: (productoId: number, descuento: number) => void
  setDescuentoGlobal: (descuento: number, tipo: 'porcentaje' | 'monto') => void
  setFormaPago: (forma: FormaPago) => void
  setEmpleadoPOS: (empleado: { id: number; nombre: string } | null) => void
  limpiarCarrito: () => void

  calcularSubtotal: () => number
  calcularDescuentoGlobal: () => number
  calcularTotal: () => number

  confirmarVenta: () => Promise<VentaPOS | null>
  agregarProductoPorCodigo: (codigoBarras: string) => Promise<{ nombre: string } | null>
  verificarPIN: (pin: string) => Promise<boolean>
}

const subtotalItem = (it: { precioUnitario: number; cantidad: number; descuentoItem: number }) =>
  Math.max(0, it.precioUnitario * it.cantidad - (it.descuentoItem || 0))

const recomputar = (items: ItemCarrito[]): ItemCarrito[] =>
  items.map(i => ({ ...i, subtotal: subtotalItem(i) }))

async function descontarStock(db: Awaited<ReturnType<typeof getDb>>, productoId: number, tipoItem: string, cantidad: number, numero: number, now: string) {
  const motivo = `Venta POS #${String(numero).padStart(3, '0')}`
  if (tipoItem === 'conjunto') {
    const comps = await db.select<any[]>('SELECT componente_id, cantidad FROM conjunto_componentes WHERE conjunto_id = ?', [productoId])
    for (const c of comps) {
      const total = c.cantidad * cantidad
      await db.execute('UPDATE productos SET stock = MAX(0, stock - ?), actualizado_en = ? WHERE id = ?', [total, now, c.componente_id])
      await db.execute(
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, fecha, creado_en) VALUES (?, 'salida', ?, ?, ?, ?)`,
        [c.componente_id, total, motivo, now, now]
      )
    }
  } else {
    await db.execute('UPDATE productos SET stock = MAX(0, stock - ?), actualizado_en = ? WHERE id = ?', [cantidad, now, productoId])
    await db.execute(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, fecha, creado_en) VALUES (?, 'salida', ?, ?, ?, ?)`,
      [productoId, cantidad, motivo, now, now]
    )
  }
}

export const usePosStore = create<PosStore>((set, get) => ({
  carrito: [],
  descuentoGlobal: 0,
  tipoDescuentoGlobal: 'porcentaje',
  formaPago: 'efectivo',
  empleadoPOS: null,
  procesando: false,

  agregarProducto: async (productoId, tipoItem) => {
    const { productos, cargarProductos } = useInventarioStore.getState()
    let prod = productos.find(p => p.id === productoId)
    if (!prod) { await cargarProductos(); prod = useInventarioStore.getState().productos.find(p => p.id === productoId) }
    if (!prod) return
    const existe = get().carrito.find(i => i.productoId === productoId)
    if (existe) {
      set({ carrito: recomputar(get().carrito.map(i => i.productoId === productoId ? { ...i, cantidad: i.cantidad + 1 } : i)) })
    } else {
      const nuevo: ItemCarrito = {
        productoId: prod.id, tipoItem, nombre: prod.nombre, precioUnitario: prod.precio,
        cantidad: 1, descuentoItem: 0, subtotal: prod.precio, imagen: prod.imagen,
      }
      set({ carrito: [...get().carrito, nuevo] })
    }
  },

  quitarProducto: (productoId) => set({ carrito: get().carrito.filter(i => i.productoId !== productoId) }),

  actualizarCantidad: (productoId, cantidad) =>
    set({ carrito: recomputar(get().carrito.map(i => i.productoId === productoId ? { ...i, cantidad: Math.max(1, cantidad) } : i)) }),

  actualizarDescuentoItem: (productoId, descuento) =>
    set({ carrito: recomputar(get().carrito.map(i => i.productoId === productoId ? { ...i, descuentoItem: Math.max(0, descuento) } : i)) }),

  setDescuentoGlobal: (descuento, tipo) => set({ descuentoGlobal: Math.max(0, descuento), tipoDescuentoGlobal: tipo }),
  setFormaPago: (forma) => set({ formaPago: forma }),
  setEmpleadoPOS: (empleado) => set({ empleadoPOS: empleado }),
  limpiarCarrito: () => set({ carrito: [], descuentoGlobal: 0, tipoDescuentoGlobal: 'porcentaje' }),

  calcularSubtotal: () => get().carrito.reduce((s, i) => s + subtotalItem(i), 0),

  calcularDescuentoGlobal: () => {
    const sub = get().calcularSubtotal()
    const { descuentoGlobal, tipoDescuentoGlobal } = get()
    const d = tipoDescuentoGlobal === 'porcentaje' ? sub * (descuentoGlobal / 100) : descuentoGlobal
    return Math.min(sub, Math.max(0, d))
  },

  calcularTotal: () => Math.max(0, Math.round((get().calcularSubtotal() - get().calcularDescuentoGlobal()) * 100) / 100),

  confirmarVenta: async () => {
    const { carrito } = get()
    if (carrito.length === 0) return null
    set({ procesando: true })
    try {
      const db = await getDb()
      const now = new Date().toISOString()
      const subtotal = get().calcularSubtotal()
      const descuento = get().calcularDescuentoGlobal()
      const totalFinal = get().calcularTotal()
      const formaPago = get().formaPago
      const empleado = get().empleadoPOS ?? (() => {
        const u = useSessionStore.getState().usuario
        return u ? { id: u.id, nombre: u.nombre } : null
      })()

      const maxRows = await db.select<{ max: number | null }[]>('SELECT MAX(numero) as max FROM ventas_pos')
      const numero = (maxRows[0].max ?? 0) + 1

      const res = await db.execute(
        `INSERT INTO ventas_pos (numero, empleado_id, empleado_nombre, subtotal, descuento, total_final, forma_pago, fecha, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [numero, empleado?.id ?? null, empleado?.nombre ?? null, subtotal, descuento, totalFinal, formaPago, now, now]
      )
      const ventaId = Number(res.lastInsertId)

      for (const it of carrito) {
        await db.execute(
          `INSERT INTO items_venta_pos (venta_id, producto_id, tipo_item, nombre, cantidad, precio_unitario, descuento_item, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [ventaId, it.productoId, it.tipoItem, it.nombre, it.cantidad, it.precioUnitario, it.descuentoItem, it.subtotal]
        )
        await descontarStock(db, it.productoId, it.tipoItem, it.cantidad, numero, now)
      }

      // Registrar cobro en caja
      await db.execute(
        `INSERT INTO cobros_caja (fecha, monto, forma_pago, concepto, venta_pos_id, empleado_id, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [now, totalFinal, formaPago, `Venta POS #${String(numero).padStart(3, '0')}`, ventaId, empleado?.id ?? null, now]
      )

      const venta: VentaPOS = {
        id: ventaId, numero, empleadoId: empleado?.id ?? null, empleadoNombre: empleado?.nombre ?? null,
        subtotal, descuento, totalFinal, formaPago, fecha: now,
        items: carrito.map((it, idx) => ({
          id: idx, ventaId, productoId: it.productoId, tipoItem: it.tipoItem, nombre: it.nombre,
          cantidad: it.cantidad, precioUnitario: it.precioUnitario, descuentoItem: it.descuentoItem, subtotal: it.subtotal,
        })),
      }

      get().limpiarCarrito()
      await useInventarioStore.getState().cargarProductos()
      return venta
    } catch (e) {
      console.error('confirmarVenta', e)
      return null
    } finally {
      set({ procesando: false })
    }
  },

  agregarProductoPorCodigo: async (codigoBarras) => {
    const prod = await useInventarioStore.getState().buscarPorCodigoBarras(codigoBarras)
    if (!prod) return null
    await get().agregarProducto(prod.id, prod.tipo)
    return { nombre: prod.nombre }
  },

  verificarPIN: async (pin) => {
    try {
      const db = await getDb()
      // El PIN se valida contra la contraseña del empleado (btoa) — reutiliza el esquema de empleados.
      const rows = await db.select<any[]>(
        `SELECT id, nombre, password FROM empleados WHERE activo = 1`
      )
      const enc = btoa(pin)
      const match = rows.find(r => r.password === enc)
      if (match) { get().setEmpleadoPOS({ id: match.id, nombre: match.nombre }); return true }
      return false
    } catch (e) {
      console.error('verificarPIN', e)
      return false
    }
  },
}))
