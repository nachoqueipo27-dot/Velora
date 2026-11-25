import { create } from 'zustand'
import { getDb } from '../db'
import { verificarClaveEmpleado } from '../db/claves'
import { useSessionStore } from './sessionStore'
import { useInventarioStore } from './inventarioStore'
import { permiteDecimales } from '../types/inventario'
import type { FormaPago, ItemCarrito, VentaPOS } from '../types/pos'
import { aCentavos, aplicarPorcentaje, porCantidad } from '../lib/dinero'

interface PosStore {
  carrito: ItemCarrito[]
  descuentoGlobal: number
  tipoDescuentoGlobal: 'porcentaje' | 'monto'
  formaPago: FormaPago
  empleadoPOS: { id: number; nombre: string } | null
  procesando: boolean
  errorPIN: string | null
  // productoId del ítem cuyo input de cantidad debe recibir foco — lo dispara
  // agregarProducto() al re-tocar un producto fraccionable ya en el carrito;
  // ItemCarrito.tsx lo consume y lo limpia después de enfocar.
  itemEnEdicion: number | null

  agregarProducto: (productoId: number, tipoItem: 'simple' | 'conjunto') => Promise<void>
  quitarProducto: (productoId: number) => void
  actualizarCantidad: (productoId: number, cantidad: number) => void
  limpiarItemEnEdicion: () => void
  actualizarDescuentoItem: (productoId: number, descuento: number) => void
  setDescuentoGlobal: (descuento: number, tipo: 'porcentaje' | 'monto') => void
  setFormaPago: (forma: FormaPago) => void
  setEmpleadoPOS: (empleado: { id: number; nombre: string } | null) => void
  limpiarCarrito: () => void

  calcularSubtotal: () => number
  calcularDescuentoGlobal: () => number
  calcularTotal: () => number

  confirmarVenta: () => Promise<VentaPOS | null>
  verificarPIN: (pin: string) => Promise<boolean>
}

// El "Desc" de cada item sigue el mismo tipo (%/$) que el descuento global del carrito.
// En el carrito, descuentoItem y descuentoGlobal guardan el número tal como lo tipeó el
// cajero (% o pesos según el tipo), así cambiar el tipo no lo reinterpreta en centavos.
// Precios y subtotales: centavos.
const descuentoEnCentavos = (bruto: number, valor: number, tipo: 'porcentaje' | 'monto') =>
  tipo === 'porcentaje' ? aplicarPorcentaje(bruto, valor || 0) : aCentavos(valor || 0)

const subtotalItem = (
  it: { precioUnitario: number; cantidad: number; descuentoItem: number },
  tipo: 'porcentaje' | 'monto',
) => {
  const bruto = porCantidad(it.precioUnitario, it.cantidad)
  return Math.max(0, bruto - descuentoEnCentavos(bruto, it.descuentoItem, tipo))
}

const recomputar = (items: ItemCarrito[], tipo: 'porcentaje' | 'monto'): ItemCarrito[] =>
  items.map(i => ({ ...i, subtotal: subtotalItem(i, tipo) }))

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
  errorPIN: null,
  itemEnEdicion: null,

  agregarProducto: async (productoId, tipoItem) => {
    const { productos, cargarProductos } = useInventarioStore.getState()
    let prod = productos.find(p => p.id === productoId)
    if (!prod) { await cargarProductos(); prod = useInventarioStore.getState().productos.find(p => p.id === productoId) }
    if (!prod) return
    const existe = get().carrito.find(i => i.productoId === productoId)
    if (existe) {
      if (permiteDecimales(existe.unidadMedida)) {
        // Fraccionable: sumar 1 "a ciegas" no tiene sentido (¿1 metro más sobre los
        // 2.5 ya cargados?). En vez de eso, se lleva el foco al input de cantidad de
        // ese ítem para que el cajero escriba/corrija el valor exacto.
        set({ itemEnEdicion: productoId })
      } else {
        set({ carrito: recomputar(get().carrito.map(i => i.productoId === productoId ? { ...i, cantidad: i.cantidad + 1 } : i), get().tipoDescuentoGlobal) })
      }
    } else {
      const nuevo: ItemCarrito = {
        productoId: prod.id, tipoItem, nombre: prod.nombre, precioUnitario: prod.precio,
        // La cantidad inicial siempre es 1 (una unidad de medida completa, ej. "1 metro"),
        // sea la unidad fraccionable o no — el cajero ajusta el valor exacto desde ahí.
        cantidad: 1, descuentoItem: 0, subtotal: prod.precio, imagen: prod.imagen,
        unidadMedida: prod.unidadMedida,
      }
      set({ carrito: [...get().carrito, nuevo] })
    }
  },

  quitarProducto: (productoId) => set({ carrito: get().carrito.filter(i => i.productoId !== productoId) }),

  limpiarItemEnEdicion: () => set({ itemEnEdicion: null }),

  actualizarCantidad: (productoId, cantidad) =>
    set({
      carrito: recomputar(get().carrito.map(i => {
        if (i.productoId !== productoId) return i
        const cantidadFinal = permiteDecimales(i.unidadMedida) ? Math.max(0.01, cantidad) : Math.max(1, Math.round(cantidad))
        return { ...i, cantidad: cantidadFinal }
      }), get().tipoDescuentoGlobal),
    }),

  actualizarDescuentoItem: (productoId, descuento) =>
    set({ carrito: recomputar(get().carrito.map(i => i.productoId === productoId ? { ...i, descuentoItem: Math.max(0, descuento) } : i), get().tipoDescuentoGlobal) }),

  setDescuentoGlobal: (descuento, tipo) =>
    set({ descuentoGlobal: Math.max(0, descuento), tipoDescuentoGlobal: tipo, carrito: recomputar(get().carrito, tipo) }),
  setFormaPago: (forma) => set({ formaPago: forma }),
  setEmpleadoPOS: (empleado) => set({ empleadoPOS: empleado }),
  limpiarCarrito: () => set({ carrito: [], descuentoGlobal: 0, tipoDescuentoGlobal: 'porcentaje', itemEnEdicion: null }),

  calcularSubtotal: () => get().carrito.reduce((s, i) => s + subtotalItem(i, get().tipoDescuentoGlobal), 0),

  calcularDescuentoGlobal: () => {
    const sub = get().calcularSubtotal()
    const { descuentoGlobal, tipoDescuentoGlobal } = get()
    const d = descuentoEnCentavos(sub, descuentoGlobal, tipoDescuentoGlobal)
    return Math.min(sub, Math.max(0, d))
  },

  calcularTotal: () => Math.max(0, get().calcularSubtotal() - get().calcularDescuentoGlobal()),

  confirmarVenta: async () => {
    const { carrito, tipoDescuentoGlobal } = get()
    if (carrito.length === 0) return null
    // En la base: centavos si el descuento del ítem es monto, el % tal cual si es porcentaje.
    const descuentoItemGuardado = (valor: number) =>
      tipoDescuentoGlobal === 'monto' ? aCentavos(valor || 0) : (valor || 0)
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
          `INSERT INTO items_venta_pos (venta_id, producto_id, tipo_item, nombre, cantidad, precio_unitario, descuento_item, subtotal, tipo_descuento_item)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ventaId, it.productoId, it.tipoItem, it.nombre, it.cantidad, it.precioUnitario, descuentoItemGuardado(it.descuentoItem), it.subtotal, tipoDescuentoGlobal]
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
          cantidad: it.cantidad, precioUnitario: it.precioUnitario, descuentoItem: descuentoItemGuardado(it.descuentoItem),
          tipoDescuentoItem: tipoDescuentoGlobal, subtotal: it.subtotal,
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

  verificarPIN: async (pin) => {
    set({ errorPIN: null })
    try {
      const db = await getDb()
      // El PIN se valida contra la contraseña del empleado (bcrypt) — reutiliza el esquema de empleados.
      // Cada hash tiene su propia sal: hay que comparar uno por uno. Se recorren todos para
      // detectar un PIN repetido.
      const rows = await db.select<any[]>(
        `SELECT id, nombre, password FROM empleados WHERE activo = 1`
      )
      const coinciden: { id: number; nombre: string }[] = []
      for (const r of rows) {
        try {
          if (await verificarClaveEmpleado(db, r, pin)) coinciden.push({ id: r.id, nombre: r.nombre })
        } catch (e) {
          // Un hash dañado no tiene que dejar sin PIN al resto.
          console.error('verificarPIN: no se pudo verificar al empleado', r.id, e)
        }
      }
      if (coinciden.length > 1) {
        set({ errorPIN: 'PIN repetido: pedile al administrador que cambie uno' })
        return false
      }
      if (coinciden.length === 1) { get().setEmpleadoPOS(coinciden[0]); return true }
      set({ errorPIN: 'PIN incorrecto' })
      return false
    } catch (e) {
      console.error('verificarPIN', e)
      set({ errorPIN: 'No se pudo verificar el PIN' })
      return false
    }
  },
}))
