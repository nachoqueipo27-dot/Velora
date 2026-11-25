import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { openUrl } from '@tauri-apps/plugin-opener'
import { cn } from '../../../lib/utils'
import { useRecepcionStore, numeroOrden, numeroRecepcion, cantidadOk, type ResultadoRecepcion } from '../../../store/recepcionStore'
import { useProveedoresStore } from '../../../store/proveedoresStore'
import { useEtiquetasStore } from '../../../store/etiquetasStore'
import { useNavigationStore } from '../../../store/navigationStore'
import { usePermiso } from '../../../lib/permisos'
import { useNegocio } from '../../../hooks/useNegocio'
import { formatearPesos } from '../../../lib/dinero'
import { lineasReclamo, linkWhatsApp, textoReclamo } from '../../../lib/recepcion/reclamo'
import { PREFIJO_INTERNO } from '../../../lib/codigosInternos'
import { generarYAbrirPDF } from '../../../lib/pdf/generarPDF'
import { PDFReclamo } from '../../../lib/pdf/documentos/PDFReclamo'
import { toast } from '../../../store/toastStore'
import { permiteDecimales } from '../../../types/inventario'

const bloque = 'flex flex-col gap-3 rounded-panel border border-borde bg-superficie p-5'

/** Después de confirmar una recepción: precios, reclamo, pendiente a orden nueva y etiquetas. */
export const CierreRecepcion = ({ resultado, onSalir }: { resultado: ResultadoRecepcion; onSalir: () => void }) => {
  const { recepcion: r, filas, estadoOrden, totalCobrado, subas } = resultado
  const negocio = useNegocio()
  const actualizarPreciosVenta = useRecepcionStore(s => s.actualizarPreciosVenta)
  const pasarPendiente = useProveedoresStore(s => s.pasarPendienteANuevaOrden)
  const pedirEtiquetas = useEtiquetasStore(s => s.pedirEtiquetas)
  const setModule = useNavigationStore(s => s.setModule)
  const puedePrecios = usePermiso('lista-precios') === 'editar'

  // ─── Precio de venta manteniendo el margen ────────────────────────────
  const [marcados, setMarcados] = useState<Set<number>>(new Set(subas.map(s => s.productoId)))
  const [preciosHechos, setPreciosHechos] = useState(false)
  const actualizarPrecios = async () => {
    try {
      await actualizarPreciosVenta(subas.filter(s => marcados.has(s.productoId)).map(s => ({ productoId: s.productoId, precioNuevo: s.sugerido })), r.numero)
      setPreciosHechos(true)
      toast.success('Precios de venta actualizados')
    } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudieron actualizar los precios') }
  }

  // ─── Reclamo ──────────────────────────────────────────────────────────
  const lineas = useMemo(() => lineasReclamo(r, filas), [r, filas])
  const texto = useMemo(() => textoReclamo(r, lineas, negocio.nombre), [r, lineas, negocio.nombre])
  const wa = linkWhatsApp(r.proveedorTelefono, texto)
  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); toast.success('Texto copiado: pegalo en WhatsApp') }
    catch { toast.error('No se pudo copiar el texto') }
  }
  const pdfReclamo = async () => {
    const ok = await generarYAbrirPDF(
      <PDFReclamo negocio={negocio} numero={numeroRecepcion(r.numero)} proveedor={r.proveedorNombre}
        orden={r.ordenNumero ? numeroOrden(r.ordenNumero) : null} fecha={format(new Date(), 'dd/MM/yyyy')} lineas={lineas} />,
      `Reclamo-${numeroRecepcion(r.numero).replace(/\W+/g, '-')}.pdf`)
    if (!ok) toast.error('No se pudo generar el PDF')
  }

  // ─── Pendiente a una orden nueva ──────────────────────────────────────
  const [ordenNueva, setOrdenNueva] = useState<number | null>(null)
  const pasar = async () => {
    if (!r.ordenId) return
    try { setOrdenNueva(await pasarPendiente(r.ordenId)) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo crear la orden') }
  }

  // ─── Etiquetas: productos sin código o recién dados de alta con código interno ───
  const paraEtiquetar = filas.filter(f => cantidadOk(f) > 0 && (f.codigo === null || (f.nuevo && f.codigo.startsWith(PREFIJO_INTERNO))))
  const imprimirEtiquetas = () => {
    pedirEtiquetas(paraEtiquetar.map(f => ({
      productoId: f.productoId, copias: permiteDecimales(f.unidadMedida) ? 1 : Math.round(cantidadOk(f)),
    })))
    setModule('inventario')
  }

  const recibidos = filas.filter(f => f.recibidoAhora > 0)

  return (
    <div className="h-full overflow-y-auto bg-fondo p-6 text-cuerpo text-texto">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <div>
          <div className="font-mono text-etiqueta uppercase text-ok">Stock y costos actualizados</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">{numeroRecepcion(r.numero)} confirmada</h1>
          <p className="mt-1 text-seccion text-texto-2">
            {r.proveedorNombre} · {recibidos.length} producto{recibidos.length === 1 ? '' : 's'} · {formatearPesos(totalCobrado)}
            {r.ordenNumero && estadoOrden && ` · ${numeroOrden(r.ordenNumero)} ${estadoOrden === 'recibida' ? 'recibida completa' : 'parcial: lo que falta sigue pendiente'}`}
          </p>
        </div>

        {subas.length > 0 && (
          <section className={bloque}>
            <div>
              <h2 className="text-titulo font-semibold">Actualizar precio de venta manteniendo el margen</h2>
              <p className="mt-0.5 text-[13px] text-texto-2">Estos productos llegaron más caros. El sugerido mantiene el mismo margen % que tenían.</p>
            </div>
            <table className="w-full border-collapse text-cuerpo tabular-nums">
              <thead><tr className="border-b border-borde text-left font-mono text-[11px] uppercase text-texto-3">
                <th className="w-8 py-2" /><th className="py-2 font-normal">Producto</th><th className="py-2 text-right font-normal">Costo</th>
                <th className="py-2 text-right font-normal">Precio actual</th><th className="py-2 text-right font-normal">Sugerido</th>
              </tr></thead>
              <tbody>
                {subas.map(s => (
                  <tr key={s.productoId} className="border-b border-borde last:border-0">
                    <td className="py-2"><input type="checkbox" className="accent-acento" disabled={preciosHechos}
                      checked={marcados.has(s.productoId)} aria-label={`Actualizar ${s.nombre}`}
                      onChange={() => setMarcados(m => { const n = new Set(m); if (n.has(s.productoId)) n.delete(s.productoId); else n.add(s.productoId); return n })} /></td>
                    <td className="py-2 font-medium">{s.nombre}</td>
                    <td className="py-2 text-right text-alerta">{formatearPesos(s.costoAntes)} → {formatearPesos(s.costoNuevo)}</td>
                    <td className="py-2 text-right text-texto-2">{formatearPesos(s.precioVenta)}</td>
                    <td className="py-2 text-right font-semibold">{formatearPesos(s.sugerido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {puedePrecios ? (
              <button type="button" onClick={() => void actualizarPrecios()} disabled={preciosHechos || marcados.size === 0}
                className="self-start h-10 rounded-pastilla bg-texto px-4 font-medium text-superficie hover:opacity-90 disabled:opacity-40">
                {preciosHechos ? 'Precios actualizados' : `Actualizar ${marcados.size} precio${marcados.size === 1 ? '' : 's'}`}
              </button>
            ) : <p className="text-[13px] text-texto-3">Tu rol no puede cambiar precios: avisale al encargado.</p>}
          </section>
        )}

        {lineas.length > 0 && (
          <section className={bloque}>
            <div>
              <h2 className="text-titulo font-semibold">Reclamo al proveedor</h2>
              <p className="mt-0.5 text-[13px] text-texto-2">Hubo {lineas.length} diferencia{lineas.length === 1 ? '' : 's'} con lo pedido o lo pactado.</p>
            </div>
            <pre className="whitespace-pre-wrap rounded-control bg-fondo p-3 font-sans text-[13px] text-texto">{texto}</pre>
            <div className="flex flex-wrap gap-2">
              {wa && (
                <button type="button" onClick={() => openUrl(wa).catch(() => toast.error('No se pudo abrir WhatsApp'))}
                  className="h-10 rounded-pastilla bg-ok px-4 font-medium text-superficie hover:opacity-90">Abrir WhatsApp</button>
              )}
              <button type="button" onClick={() => void copiar()} className="h-10 rounded-pastilla border border-borde-fuerte px-4 hover:bg-superficie-suave">Copiar texto para WhatsApp</button>
              <button type="button" onClick={() => void pdfReclamo()} className="h-10 rounded-pastilla border border-borde-fuerte px-4 hover:bg-superficie-suave">PDF</button>
            </div>
            {!wa && <p className="text-[12px] text-texto-3">El proveedor no tiene teléfono cargado: copiá el texto y mandalo vos.</p>}
          </section>
        )}

        {estadoOrden === 'parcial' && r.ordenId && (
          <section className={bloque}>
            <h2 className="text-titulo font-semibold">Quedó mercadería pendiente</h2>
            <p className="-mt-2 text-[13px] text-texto-2">
              La orden queda parcial y lo que falta sigue abierto para la próxima entrega. Si no va a llegar con esta orden, pasalo a una nueva.
            </p>
            {ordenNueva ? (
              <p className={cn('text-seccion font-medium text-ok')}>Listo: lo pendiente está en la {numeroOrden(ordenNueva)} (borrador).</p>
            ) : (
              <button type="button" onClick={() => void pasar()}
                className="self-start h-10 rounded-pastilla border border-borde-fuerte px-4 hover:bg-superficie-suave">Pasar lo pendiente a una orden nueva</button>
            )}
          </section>
        )}

        {paraEtiquetar.length > 0 && (
          <section className={bloque}>
            <h2 className="text-titulo font-semibold">¿Imprimir etiquetas de {paraEtiquetar.length} producto{paraEtiquetar.length === 1 ? '' : 's'}?</h2>
            <p className="-mt-2 text-[13px] text-texto-2">Entraron productos sin código o con un código interno nuevo. Las copias salen de la cantidad recibida.</p>
            <button type="button" onClick={imprimirEtiquetas}
              className="self-start h-10 rounded-pastilla bg-texto px-4 font-medium text-superficie hover:opacity-90">Imprimir etiquetas</button>
          </section>
        )}

        <button type="button" onClick={onSalir} className="self-start h-10 rounded-pastilla border border-borde-fuerte bg-superficie px-4 hover:bg-superficie-suave">
          Volver a Proveedores
        </button>
      </div>
    </div>
  )
}
