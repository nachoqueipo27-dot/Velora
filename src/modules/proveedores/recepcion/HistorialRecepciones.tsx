import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useRecepcionStore, numeroOrden, numeroRecepcion, type ItemRecepcionHistorial, type RecepcionHistorial } from '../../../store/recepcionStore'
import { formatearPesos } from '../../../lib/dinero'
import { toast } from '../../../store/toastStore'
import { UNIDAD_ABREVIADA, permiteDecimales, type UnidadMedida } from '../../../types/inventario'

const cant = (n: number, u: UnidadMedida) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 3 })}${permiteDecimales(u) ? ` ${UNIDAD_ABREVIADA[u]}` : ''}`
const ESTADO: Record<ItemRecepcionHistorial['estado'], { t: string; c: string }> = {
  ok: { t: 'Entró al stock', c: 'bg-ok-suave text-ok' },
  danado: { t: 'Dañado · para devolver', c: 'bg-error/10 text-error' },
  vencido: { t: 'Vencido · para devolver', c: 'bg-error/10 text-error' },
}

/** Proveedores → Recepciones: las confirmadas; cada una se abre con su detalle. No se editan. */
export const HistorialRecepciones = () => {
  const { listarHistorial, detalleHistorial } = useRecepcionStore()
  const [lista, setLista] = useState<RecepcionHistorial[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierta, setAbierta] = useState<{ r: RecepcionHistorial; items: ItemRecepcionHistorial[] } | null>(null)

  useEffect(() => {
    listarHistorial().then(setLista)
      .catch(e => { console.error('historial recepciones', e); toast.error('No se pudo cargar el historial') })
      .finally(() => setCargando(false))
  }, [listarHistorial])

  const abrir = async (r: RecepcionHistorial) => {
    try { setAbierta({ r, items: await detalleHistorial(r.id) }) }
    catch (e) { console.error('detalle recepción', e); toast.error('No se pudo abrir la recepción') }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden text-cuerpo text-texto">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Recepciones</h2>
        <p className="text-[12px] text-[#606060]">Cada entrega confirmada. No se editan: para corregir stock usá "Ajustar stock" en Inventario.</p>
      </header>
      <section className="min-h-0 flex-1 overflow-auto rounded-panel border border-borde bg-superficie">
        {cargando ? <div className="p-8 text-center text-texto-3">Cargando…</div> : lista.length === 0 ? (
          <div className="p-8 text-center text-texto-2">Todavía no hay recepciones confirmadas.</div>
        ) : (
          <table className="w-full border-collapse text-seccion tabular-nums">
            <thead><tr className="border-b border-borde text-left font-mono text-[11px] uppercase tracking-[0.06em] text-texto-3">
              <th className="px-[18px] py-3 font-normal">Número</th><th className="px-2 py-3 font-normal">Fecha</th>
              <th className="px-2 py-3 font-normal">Proveedor</th><th className="px-2 py-3 font-normal">Orden</th>
              <th className="px-2 py-3 text-right font-normal">Productos</th><th className="px-[18px] py-3 text-right font-normal">Total</th>
            </tr></thead>
            <tbody>
              {lista.map(r => (
                <tr key={r.id} tabIndex={0} onClick={() => void abrir(r)} onKeyDown={e => { if (e.key === 'Enter') void abrir(r) }}
                  className="cursor-pointer border-b border-borde last:border-0 hover:bg-superficie-suave">
                  <td className="px-[18px] py-3 font-mono font-medium">{numeroRecepcion(r.numero)}</td>
                  <td className="px-2 py-3 text-texto-2">{format(new Date(r.confirmadoEn), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="px-2 py-3">{r.proveedorNombre}</td>
                  <td className="px-2 py-3 text-texto-2">{r.ordenNumero ? numeroOrden(r.ordenNumero) : 'Directa'}</td>
                  <td className="px-2 py-3 text-right">{r.productos}</td>
                  <td className="px-[18px] py-3 text-right font-medium">{formatearPesos(r.totalCobrado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {abierta && (
        <div className="fixed inset-0 z-[950] flex items-center justify-center bg-texto/30 p-6" onMouseDown={e => { if (e.target === e.currentTarget) setAbierta(null) }}>
          <div role="dialog" aria-modal="true" className="flex max-h-[80vh] w-[680px] max-w-full flex-col gap-4 overflow-hidden rounded-panel border border-borde bg-superficie p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-etiqueta uppercase text-texto-3">
                  {format(new Date(abierta.r.confirmadoEn), 'dd/MM/yyyy HH:mm')} · {abierta.r.empleadoNombre}
                  {abierta.r.ordenNumero ? ` · ${numeroOrden(abierta.r.ordenNumero)}` : ' · Directa'}
                </div>
                <h3 className="mt-1 text-titulo font-semibold">{numeroRecepcion(abierta.r.numero)} · {abierta.r.proveedorNombre}</h3>
                <p className="mt-0.5 text-[13px] text-texto-2">Total cobrado {formatearPesos(abierta.r.totalCobrado)}{abierta.r.notas ? ` · ${abierta.r.notas}` : ''}</p>
              </div>
              <button type="button" onClick={() => setAbierta(null)} aria-label="Cerrar"
                className="h-9 w-9 shrink-0 rounded-pastilla border border-borde-fuerte text-[16px] text-texto-2 hover:text-texto">×</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-tarjeta border border-borde">
              <table className="w-full border-collapse text-cuerpo tabular-nums">
                <thead><tr className="border-b border-borde text-left font-mono text-[11px] uppercase text-texto-3">
                  <th className="px-3 py-2 font-normal">Producto</th><th className="px-2 py-2 text-right font-normal">Cantidad</th>
                  <th className="px-2 py-2 font-normal">Estado</th><th className="px-3 py-2 text-right font-normal">Costo</th>
                </tr></thead>
                <tbody>
                  {abierta.items.map((it, i) => (
                    <tr key={i} className="border-b border-borde last:border-0 align-top">
                      <td className="px-3 py-2 font-medium">{it.nombre}{it.nota && <div className="text-[12px] font-normal text-texto-3">{it.nota}</div>}</td>
                      <td className="px-2 py-2 text-right">{cant(it.cantidad, it.unidadMedida)}</td>
                      <td className="px-2 py-2"><span className={cn('rounded-pastilla px-2 py-0.5 text-[11px] font-medium', ESTADO[it.estado].c)}>{ESTADO[it.estado].t}</span></td>
                      <td className="px-3 py-2 text-right">
                        {it.costoCobrado !== null ? formatearPesos(it.costoCobrado) : '—'}
                        {it.costoPactado !== null && it.costoCobrado !== null && it.costoPactado !== it.costoCobrado && (
                          <div className="text-[11px] text-texto-3">pactado {formatearPesos(it.costoPactado)}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
