import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useIngresoStore, numeroIngreso, resumenCantidades, type IngresoHistorial, type ItemIngresoHistorial } from '../../../store/ingresoStore'
import { UNIDAD_ABREVIADA, permiteDecimales, type UnidadMedida } from '../../../types/inventario'
import { toast } from '../../../store/toastStore'

const cant = (n: number, u: UnidadMedida) =>
  `${n.toLocaleString('es-AR', { maximumFractionDigits: 3 })}${permiteDecimales(u) ? ` ${UNIDAD_ABREVIADA[u]}` : ''}`

/** Inventario → Ingresos: los ingresos de stock confirmados. Cada uno se abre con su detalle. */
export const HistorialIngresos = () => {
  const { listarHistorial, detalleHistorial } = useIngresoStore()
  const [ingresos, setIngresos] = useState<IngresoHistorial[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState<{ ingreso: IngresoHistorial; items: ItemIngresoHistorial[] } | null>(null)

  useEffect(() => {
    listarHistorial()
      .then(setIngresos)
      .catch(e => { console.error('historial ingresos', e); toast.error('No se pudo cargar el historial de ingresos') })
      .finally(() => setCargando(false))
  }, [listarHistorial])

  const abrir = async (ingreso: IngresoHistorial) => {
    try { setAbierto({ ingreso, items: await detalleHistorial(ingreso.id) }) }
    catch (e) { console.error('detalle ingreso', e); toast.error('No se pudo abrir el ingreso') }
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden text-cuerpo text-texto">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Ingresos de stock</h2>
        <p className="text-[12px] text-[#606060]">Lo que se cargó con "Agregar stock". Un ingreso confirmado no se edita: para corregir, usá "Ajustar stock" en la ficha del producto.</p>
      </header>

      <section className="min-h-0 flex-1 overflow-auto rounded-panel border border-borde bg-superficie">
        {cargando ? (
          <div className="p-8 text-center text-texto-3">Cargando…</div>
        ) : ingresos.length === 0 ? (
          <div className="p-8 text-center text-texto-2">Todavía no hay ingresos confirmados.</div>
        ) : (
          <table className="w-full border-collapse text-seccion tabular-nums">
            <thead>
              <tr className="border-b border-borde text-left font-mono text-[11px] uppercase tracking-[0.06em] text-texto-3">
                <th className="px-[18px] py-3 font-normal">Número</th>
                <th className="px-2 py-3 font-normal">Fecha</th>
                <th className="px-2 py-3 font-normal">Usuario</th>
                <th className="px-2 py-3 text-right font-normal">Productos</th>
                <th className="px-[18px] py-3 text-right font-normal">Unidades</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map(g => (
                <tr key={g.id} onClick={() => void abrir(g)} tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter') void abrir(g) }}
                  className="cursor-pointer border-b border-borde last:border-0 hover:bg-superficie-suave">
                  <td className="px-[18px] py-3 font-mono font-medium">{numeroIngreso(g.numero)}</td>
                  <td className="px-2 py-3 text-texto-2">{format(new Date(g.confirmadoEn ?? g.creadoEn), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="px-2 py-3 text-texto-2">{g.empleadoNombre}</td>
                  <td className="px-2 py-3 text-right">{g.productos}</td>
                  <td className="px-[18px] py-3 text-right">{g.unidades.toLocaleString('es-AR', { maximumFractionDigits: 3 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {abierto && (
        <div className="fixed inset-0 z-[950] flex items-center justify-center bg-texto/30 p-6" onMouseDown={e => { if (e.target === e.currentTarget) setAbierto(null) }}>
          <div role="dialog" aria-modal="true" className="flex max-h-[80vh] w-[560px] max-w-full flex-col gap-4 overflow-hidden rounded-panel border border-borde bg-superficie p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-etiqueta uppercase text-texto-3">
                  {format(new Date(abierto.ingreso.confirmadoEn ?? abierto.ingreso.creadoEn), 'dd/MM/yyyy HH:mm')} · {abierto.ingreso.empleadoNombre}
                </div>
                <h3 className="mt-1 text-titulo font-semibold">{numeroIngreso(abierto.ingreso.numero)}</h3>
                <p className="mt-0.5 text-[13px] text-texto-2">
                  {abierto.items.length} producto{abierto.items.length === 1 ? '' : 's'} · +{resumenCantidades(abierto.items)}
                </p>
                {abierto.ingreso.notas && <p className="mt-1 text-[13px] text-texto-2">Notas: {abierto.ingreso.notas}</p>}
              </div>
              <button type="button" onClick={() => setAbierto(null)} aria-label="Cerrar"
                className="h-9 w-9 shrink-0 rounded-pastilla border border-borde-fuerte text-[16px] text-texto-2 hover:text-texto">×</button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-tarjeta border border-borde">
              <table className="w-full border-collapse text-cuerpo tabular-nums">
                <thead>
                  <tr className="border-b border-borde text-left font-mono text-[11px] uppercase tracking-[0.06em] text-texto-3">
                    <th className="px-3 py-2 font-normal">Producto</th>
                    <th className="px-2 py-2 text-right font-normal">Antes</th>
                    <th className="px-2 py-2 text-right font-normal">Ingresó</th>
                    <th className="px-3 py-2 text-right font-normal">Quedó en</th>
                  </tr>
                </thead>
                <tbody>
                  {abierto.items.map(it => (
                    <tr key={it.productoId} className="border-b border-borde last:border-0">
                      <td className="px-3 py-2 font-medium">{it.nombre}</td>
                      <td className="px-2 py-2 text-right text-texto-2">{it.stockAntes === null ? '—' : cant(it.stockAntes, it.unidadMedida)}</td>
                      <td className="px-2 py-2 text-right font-medium text-ok">+{cant(it.cantidad, it.unidadMedida)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{it.stockAntes === null ? '—' : cant(it.stockAntes + it.cantidad, it.unidadMedida)}</td>
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
