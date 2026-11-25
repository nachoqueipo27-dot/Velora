import { Fragment, useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useCajaStore, itemsDeVentas } from '../../store/cajaStore'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { FORMAS_PAGO_CAJA, type CobroCaja, type FormaPago, type ItemVentaCaja } from '../../types/caja'
import { UNIDAD_ABREVIADA } from '../../types/inventario'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { aCentavos, formatearPesos } from '../../lib/dinero'
import { useEdicion } from '../../lib/permisos'

// Montos en centavos → "$ 1.234,56"
const money = formatearPesos
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

// Cantidad legible: "× 2" para unidades, "0,5 kg" para lo fraccionable.
const cantidadDe = (i: ItemVentaCaja) => {
  const n = i.cantidad.toLocaleString('es-AR', { maximumFractionDigits: 3 })
  return i.unidadMedida === 'unidad' ? `× ${n}` : `${n} ${UNIDAD_ABREVIADA[i.unidadMedida]}`
}

// Lo que se vendió, en una línea: "Pan 0,5 kg, Coca 500 × 2 y 3 más".
const resumenVenta = (items: ItemVentaCaja[] | undefined) => {
  if (!items) return '…'
  if (items.length === 0) return 'Venta sin detalle'
  const partes = items.slice(0, 2).map(i => `${i.nombre} ${cantidadDe(i)}`).join(', ')
  return items.length > 2 ? `${partes} y ${items.length - 2} más` : partes
}

const origenDe = (c: CobroCaja): { label: string; variant: 'default' | 'success' | 'info' } => {
  if (c.otId != null) return { label: 'OT', variant: 'info' }
  if (c.ventaPosId != null) return { label: 'POS', variant: 'success' }
  return { label: 'Manual', variant: 'default' }
}

export const RegistroCobros = () => {
  const { cobrosHoy, resumenHoy, diaYaCerrado, agregarCobro, eliminarCobro } = useCajaStore()
  const ed = useEdicion('caja-diaria')
  const [monto, setMonto] = useState('')
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo')
  const [concepto, setConcepto] = useState('')
  const [aEliminar, setAEliminar] = useState<CobroCaja | null>(null)
  const [itemsPorVenta, setItemsPorVenta] = useState<Record<number, ItemVentaCaja[]>>({})
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set())

  // Qué se vendió en cada cobro del POS (se despliega tocando la fila).
  useEffect(() => {
    let vigente = true
    const ids = cobrosHoy.map(c => c.ventaPosId).filter((id): id is number => id != null)
    itemsDeVentas(ids)
      .then(items => { if (vigente) setItemsPorVenta(items) })
      .catch(e => console.error('caja: no se pudieron leer los ítems de las ventas', e))
    return () => { vigente = false }
  }, [cobrosHoy])

  const alternar = (id: number) => setAbiertos(prev => {
    const s = new Set(prev)
    if (s.has(id)) s.delete(id); else s.add(id)
    return s
  })

  const montoNum = aCentavos(Number(monto) || 0) // el input es en pesos; se guarda en centavos
  const valido = montoNum > 0 && !diaYaCerrado && !ed.disabled

  const registrar = async () => {
    if (!valido) return
    await agregarCobro({ monto: montoNum, formaPago, concepto })
    setMonto(''); setConcepto(''); setFormaPago('efectivo')
  }

  return (
    <div className="h-full flex flex-col gap-5 overflow-y-auto pr-1">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Registro de cobros</h2>
          <p className="text-[12px] text-[#606060]">Ingresos del día — OT, punto de venta y cobros manuales</p>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-wider text-[#606060]">Saldo acumulado</div>
          <div className={cn('text-2xl font-bold tabular-nums', (resumenHoy?.saldoNeto ?? 0) >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>
            {money(resumenHoy?.saldoNeto ?? 0)}
          </div>
        </div>
      </header>

      {/* Formulario inline */}
      {diaYaCerrado ? (
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] p-3 text-[12px] text-[#606060]">
          La caja del día ya fue cerrada. No se pueden registrar nuevos cobros.
        </div>
      ) : (
        <div className="flex items-end gap-2 rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-3">
          <div className="flex flex-col gap-1 w-32">
            <label className="text-[11px] text-[#606060]">Monto</label>
            <input type="number" min={0} value={monto} onChange={e => setMonto(e.target.value)} placeholder="0"
              onKeyDown={e => e.key === 'Enter' && registrar()}
              className="px-2.5 py-1.5 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
          <div className="flex flex-col gap-1 w-40">
            <label className="text-[11px] text-[#606060]">Forma de pago</label>
            <select value={formaPago} onChange={e => setFormaPago(e.target.value as FormaPago)}
              className="px-2.5 py-1.5 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black">
              {FORMAS_PAGO_CAJA.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-[#606060]">Concepto</label>
            <input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Detalle del cobro"
              onKeyDown={e => e.key === 'Enter' && registrar()}
              className="px-2.5 py-1.5 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
          <Button size="sm" onClick={registrar} disabled={!valido} {...ed}><Plus size={14} className="mr-1" />Registrar</Button>
        </div>
      )}

      {/* Tabla */}
      <div className="shrink-0 rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-4 py-2.5">Hora</th>
              <th className="font-medium px-4 py-2.5">Concepto</th>
              <th className="font-medium px-4 py-2.5">Forma de pago</th>
              <th className="font-medium px-4 py-2.5">Origen</th>
              <th className="font-medium px-4 py-2.5 text-right">Monto</th>
              <th className="font-medium px-4 py-2.5 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {cobrosHoy.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#606060]">Sin cobros registrados hoy</td></tr>
            )}
            {cobrosHoy.map(c => {
              const o = origenDe(c)
              const manual = c.otId == null && c.ventaPosId == null
              const venta = c.ventaPosId != null
              const items = venta ? itemsPorVenta[c.ventaPosId!] : undefined
              const abierto = venta && abiertos.has(c.id)
              return (
                <Fragment key={c.id}>
                <tr onClick={venta ? () => alternar(c.id) : undefined}
                  className={cn('border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0 hover:bg-white/[0.02] light:hover:bg-black/[0.02]',
                    venta && 'cursor-pointer')}>
                  <td className="px-4 py-2.5 text-[#A0A0A0] light:text-[#404040] tabular-nums">{hora(c.fecha)}</td>
                  <td className="px-4 py-2.5 text-white light:text-black">
                    {venta ? (
                      <button type="button" aria-expanded={abierto} title={abierto ? 'Ocultar lo vendido' : 'Ver lo vendido'}
                        className="flex items-center gap-1.5 text-left">
                        {abierto ? <ChevronDown size={14} className="shrink-0 text-[#606060]" /> : <ChevronRight size={14} className="shrink-0 text-[#606060]" />}
                        <span className="line-clamp-1">{resumenVenta(items)}</span>
                      </button>
                    ) : (c.concepto || '—')}
                  </td>
                  <td className="px-4 py-2.5 text-[#A0A0A0] light:text-[#404040] capitalize">{c.formaPago}</td>
                  <td className="px-4 py-2.5"><Badge label={o.label} variant={o.variant} /></td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#4CAF7D] tabular-nums">{money(c.monto)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {manual && !diaYaCerrado && (
                      <button onClick={() => setAEliminar(c)} {...ed} className="disabled:opacity-40 disabled:cursor-not-allowed p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10 transition-all">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
                {abierto && (
                  <tr className="border-b border-[#1C1C1C] light:border-[#F0F0F0] bg-white/[0.02] light:bg-black/[0.02]">
                    <td></td>
                    <td colSpan={5} className="px-4 pb-3 pt-1">
                      {!items ? (
                        <span className="text-[12px] text-[#606060]">Cargando…</span>
                      ) : items.length === 0 ? (
                        <span className="text-[12px] text-[#606060]">Esta venta no tiene ítems guardados.</span>
                      ) : (
                        <table className="w-full text-[12px]">
                          <thead>
                            <tr className="text-left text-[10px] uppercase tracking-wider text-[#606060]">
                              <th className="font-medium py-1.5">Producto</th>
                              <th className="font-medium py-1.5 text-right">Cantidad</th>
                              <th className="font-medium py-1.5 text-right">Precio unit.</th>
                              <th className="font-medium py-1.5 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(i => (
                              <tr key={i.id}>
                                <td className="py-1 text-white light:text-black">
                                  {i.nombre}
                                  {i.libre && <span className="ml-2 text-[11px] text-[#606060]">Producto X{i.codigo ? ` · ${i.codigo}` : ''}</span>}
                                </td>
                                <td className="py-1 text-right tabular-nums text-[#A0A0A0] light:text-[#404040]">{cantidadDe(i)}</td>
                                <td className="py-1 text-right tabular-nums text-[#A0A0A0] light:text-[#404040]">{money(i.precioUnitario)}</td>
                                <td className="py-1 text-right tabular-nums text-white light:text-black">{money(i.subtotal)}</td>
                              </tr>
                            ))}
                            {(() => {
                              // Descuento general de la venta: lo que no llegó al cobro.
                              const descuento = items.reduce((t, i) => t + i.subtotal, 0) - c.monto
                              return descuento > 0 && (
                                <tr>
                                  <td colSpan={3} className="py-1 text-[#606060]">Descuento</td>
                                  <td className="py-1 text-right tabular-nums text-[#A0A0A0] light:text-[#404040]">− {money(descuento)}</td>
                                </tr>
                              )
                            })()}
                          </tbody>
                        </table>
                      )}
                    </td>
                  </tr>
                )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={aEliminar !== null} onClose={() => setAEliminar(null)} title="Eliminar cobro" maxWidth="max-w-sm"
        footer={<>
          <Button variant="ghost" onClick={() => setAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={async () => { if (aEliminar) await eliminarCobro(aEliminar.id); setAEliminar(null) }}>Eliminar</Button>
        </>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-2">
          ¿Eliminar el cobro manual <span className="text-white light:text-black">{aEliminar?.concepto || ''}</span> por {money(aEliminar?.monto ?? 0)}?
        </p>
      </Modal>
    </div>
  )
}
