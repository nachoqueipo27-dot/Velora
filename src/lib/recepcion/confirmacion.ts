import { porCantidad } from '../dinero'
import type { FilaRecepcion, RecepcionAbierta, SubaDeCosto } from '../../store/recepcionStore'

// Script SQL de la confirmación de una recepción (función pura: se prueba sin la app).
// Va entero en un único execute (una conexión del pool = una transacción real).
// Solo lleva números validados, fechas ISO, el motivo armado acá y el usuario escapado.

export const numeroRecepcion = (n: number) => `Recepción #${String(n).padStart(4, '0')}`

/** Unidades que entran al stock (lo dañado o vencido no entra). */
export const cantidadOk = (f: FilaRecepcion) => Math.max(0, f.recibidoAhora - f.danado - f.vencido)

const textoSql = (s: string) => `'${s.replace(/'/g, "''")}'`
const seguro = (n: number, que: string) => {
  if (!Number.isFinite(n)) throw new Error(`Dato inválido en la recepción (${que}).`)
  return n
}

export interface ScriptConfirmacion {
  sql: string
  subas: SubaDeCosto[]
  totalCobrado: number
  estadoOrden: 'parcial' | 'recibida' | null
  /** Líneas de la orden con lo recibido actualizado (para "lo pendiente"). */
  lineas: { itemId: number; cantidad: number; recibido: number }[]
}

export function armarConfirmacion(r: RecepcionAbierta, filas: FilaRecepcion[], ahora: string, usuario: string): ScriptConfirmacion {
  const motivo = numeroRecepcion(r.numero)
  const sql: string[] = ['BEGIN;']
  const subas: SubaDeCosto[] = []
  let totalCobrado = 0
  // Copia: no se tocan las filas del estado hasta que la transacción salga bien.
  const lineasPorFila = new Map(filas.map(f => [f.productoId, f.lineas.map(l => ({ ...l }))]))

  for (const f of filas) {
    if (!(f.recibidoAhora > 0)) continue
    const pid = seguro(f.productoId, 'producto')
    const ok = seguro(cantidadOk(f), 'cantidad')
    const cobrado = Math.round(seguro(f.costoCobrado, 'costo'))
    totalCobrado += porCantidad(cobrado, f.recibidoAhora)

    if (ok > 0) {
      sql.push(
        `UPDATE productos SET stock = COALESCE(stock, 0) + ${ok}, actualizado_en = '${ahora}' WHERE id = ${pid};`,
        `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, referencia_id, fecha, creado_en)
           VALUES (${pid}, 'entrada', ${ok}, '${motivo}', ${seguro(r.id, 'recepción')}, '${ahora}', '${ahora}');`,
      )
    }

    // Costo: se actualiza al cobrado (no en productos con costo en USD: el proveedor cobra en pesos).
    if (f.monedaCosto === 'ARS' && cobrado > 0 && cobrado !== f.costoActual) {
      const pct = f.costoActual > 0 ? Math.round(((cobrado - f.costoActual) / f.costoActual) * 10000) / 100 : 'NULL'
      sql.push(
        `UPDATE productos SET precio_costo = ${cobrado}, actualizado_en = '${ahora}' WHERE id = ${pid};`,
        `INSERT INTO historial_precios (producto_id, precio_anterior, precio_nuevo, porcentaje, motivo, tipo, aplicado_por, fecha, creado_en)
           VALUES (${pid}, ${Math.round(seguro(f.costoActual, 'costo actual'))}, ${cobrado}, ${pct}, '${motivo}', 'costo', ${textoSql(usuario)}, '${ahora}', '${ahora}');`,
      )
      if (cobrado > f.costoActual && f.costoActual > 0 && f.precioVenta > 0) {
        subas.push({
          productoId: f.productoId, nombre: f.nombre, costoAntes: f.costoActual, costoNuevo: cobrado,
          precioVenta: f.precioVenta, sugerido: Math.round((f.precioVenta * cobrado) / f.costoActual),
        })
      }
    }

    // Orden: lo que entró OK se reparte entre las líneas del producto (lo dañado sigue pendiente).
    const lineas = lineasPorFila.get(f.productoId) ?? []
    let resto = ok
    lineas.forEach((l, i) => {
      const falta = Math.max(0, l.cantidad - l.recibido)
      const toma = i === lineas.length - 1 ? resto : Math.min(falta, resto)
      resto -= toma
      if (toma > 0) {
        l.recibido += toma
        sql.push(`UPDATE items_orden_compra SET recibido = ${seguro(l.recibido, 'recibido')} WHERE id = ${seguro(l.itemId, 'ítem')};`)
      }
    })
  }

  const lineas = [...lineasPorFila.values()].flat()
  let estadoOrden: 'parcial' | 'recibida' | null = null
  if (r.ordenId) {
    const oid = seguro(r.ordenId, 'orden')
    estadoOrden = lineas.every(l => l.recibido >= l.cantidad - 1e-9) ? 'recibida' : 'parcial'
    sql.push(estadoOrden === 'recibida'
      ? `UPDATE ordenes_compra SET estado = 'recibida', fecha_recepcion = '${ahora}', actualizado_en = '${ahora}' WHERE id = ${oid};`
      : `UPDATE ordenes_compra SET estado = 'parcial', actualizado_en = '${ahora}' WHERE id = ${oid};`)
  }
  sql.push(`UPDATE recepciones SET estado = 'confirmada', confirmado_en = '${ahora}', total_cobrado = ${totalCobrado} WHERE id = ${r.id} AND estado = 'abierta';`)
  sql.push('COMMIT;')
  return { sql: sql.join('\n'), subas, totalCobrado, estadoOrden, lineas }
}
