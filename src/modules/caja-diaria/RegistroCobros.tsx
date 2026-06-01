import { useState } from 'react'
import { cn } from '../../lib/utils'
import { useCajaStore } from '../../store/cajaStore'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { FORMAS_PAGO_CAJA, type CobroCaja, type FormaPago } from '../../types/caja'
import { Plus, Trash2 } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

const origenDe = (c: CobroCaja): { label: string; variant: 'default' | 'success' | 'info' } => {
  if (c.otId != null) return { label: 'OT', variant: 'info' }
  if (c.ventaPosId != null) return { label: 'POS', variant: 'success' }
  return { label: 'Manual', variant: 'default' }
}

export const RegistroCobros = () => {
  const { cobrosHoy, resumenHoy, diaYaCerrado, agregarCobro, eliminarCobro } = useCajaStore()
  const [monto, setMonto] = useState('')
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo')
  const [concepto, setConcepto] = useState('')
  const [aEliminar, setAEliminar] = useState<CobroCaja | null>(null)

  const montoNum = Number(monto) || 0
  const valido = montoNum > 0 && !diaYaCerrado

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
          <Button size="sm" onClick={registrar} disabled={!valido}><Plus size={14} className="mr-1" />Registrar</Button>
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
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
              return (
                <tr key={c.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0 hover:bg-white/[0.02] light:hover:bg-black/[0.02]">
                  <td className="px-4 py-2.5 text-[#A0A0A0] light:text-[#404040] tabular-nums">{hora(c.fecha)}</td>
                  <td className="px-4 py-2.5 text-white light:text-black">{c.concepto || '—'}</td>
                  <td className="px-4 py-2.5 text-[#A0A0A0] light:text-[#404040] capitalize">{c.formaPago}</td>
                  <td className="px-4 py-2.5"><Badge label={o.label} variant={o.variant} /></td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#4CAF7D] tabular-nums">{money(c.monto)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {manual && !diaYaCerrado && (
                      <button onClick={() => setAEliminar(c)} className="p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10 transition-all">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
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
