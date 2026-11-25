import { formatearPesos } from '../dinero'
import { UNIDAD_ABREVIADA, permiteDecimales } from '../../types/inventario'
import type { FilaRecepcion, RecepcionAbierta } from '../../store/recepcionStore'
import { numeroRecepcion } from './confirmacion'

// Reclamo al proveedor: una línea por diferencia (faltante, de más, no pedido, dañado,
// vencido, precio distinto). Lo usan el texto para WhatsApp y el PDF.

export interface LineaReclamo { tipo: 'falta' | 'demas' | 'no_pedido' | 'danado' | 'vencido' | 'precio'; texto: string }

const cant = (n: number, f: FilaRecepcion) =>
  `${n.toLocaleString('es-AR', { maximumFractionDigits: 3 })}${permiteDecimales(f.unidadMedida) ? ` ${UNIDAD_ABREVIADA[f.unidadMedida]}` : ''}`

export function lineasReclamo(r: RecepcionAbierta, filas: FilaRecepcion[]): LineaReclamo[] {
  const lineas: LineaReclamo[] = []
  const conOrden = r.ordenId !== null
  for (const f of filas) {
    if (conOrden && f.enOrden) {
      const llegado = f.yaRecibido + f.recibidoAhora
      const dif = Math.round((f.pedido - llegado) * 1000) / 1000
      if (dif > 0) lineas.push({ tipo: 'falta', texto: `${f.nombre}: faltaron ${cant(dif, f)} (pedimos ${cant(f.pedido, f)}, llegaron ${cant(llegado, f)}).` })
      if (dif < 0) lineas.push({ tipo: 'demas', texto: `${f.nombre}: llegaron ${cant(-dif, f)} de más.` })
    }
    if (conOrden && !f.enOrden && f.recibidoAhora > 0) {
      lineas.push({ tipo: 'no_pedido', texto: `${f.nombre}: no estaba en el pedido (llegaron ${cant(f.recibidoAhora, f)}).` })
    }
    const nota = f.notaProblema.trim() ? ` (${f.notaProblema.trim()})` : ''
    if (f.danado > 0) lineas.push({ tipo: 'danado', texto: `${f.nombre}: ${cant(f.danado, f)} dañado${f.danado === 1 ? '' : 's'}${nota}.` })
    if (f.vencido > 0) lineas.push({ tipo: 'vencido', texto: `${f.nombre}: ${cant(f.vencido, f)} vencido${f.vencido === 1 ? '' : 's'}${nota}.` })
    const ref = f.costoPactado ?? f.costoActual
    if (f.recibidoAhora > 0 && ref > 0 && f.costoCobrado !== ref) {
      const pct = ((f.costoCobrado - ref) / ref) * 100
      lineas.push({
        tipo: 'precio',
        texto: `${f.nombre}: nos cobraron ${formatearPesos(f.costoCobrado)} por unidad y ${f.costoPactado !== null ? 'lo pactado era' : 'el costo anterior era'} ${formatearPesos(ref)} (${pct > 0 ? '+' : ''}${pct.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%).`,
      })
    }
  }
  return lineas
}

/** Texto corto para WhatsApp. */
export function textoReclamo(r: RecepcionAbierta, lineas: LineaReclamo[], negocio: string): string {
  const orden = r.ordenNumero ? ` (Orden #${String(r.ordenNumero).padStart(4, '0')})` : ''
  return [
    `Hola ${r.proveedorNombre}, en la entrega de hoy${orden} notamos:`,
    ...lineas.map(l => `• ${l.texto}`),
    '',
    `${numeroRecepcion(r.numero)} · ${negocio}. ¡Gracias!`,
  ].join('\n')
}

/** Link de WhatsApp con el texto (solo dígitos del teléfono; sin código de país se asume Argentina). */
export function linkWhatsApp(telefono: string, texto: string): string | null {
  let digitos = telefono.replace(/\D/g, '')
  if (digitos.length < 8) return null
  if (digitos.startsWith('0')) digitos = digitos.slice(1)
  if (!digitos.startsWith('54')) digitos = '549' + digitos
  return `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}`
}
