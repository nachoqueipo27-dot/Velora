import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useCajaStore } from '../../store/cajaStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { ResumenDia } from './components/ResumenDia'
import { Lock } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const hoyISO = () => new Date().toISOString().split('T')[0]
const fechaLarga = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

const DESGLOSE: { key: 'totalEfectivo' | 'totalTransferencia' | 'totalTarjeta'; label: string; color: string }[] = [
  { key: 'totalEfectivo',      label: 'Efectivo',      color: '#4CAF7D' },
  { key: 'totalTransferencia', label: 'Transferencia', color: '#4A7FA5' },
  { key: 'totalTarjeta',       label: 'Tarjeta',       color: '#D4921A' },
]

export const CierreCaja = () => {
  const { resumenHoy, diaYaCerrado, cerrarCaja, cierresCaja, cargarHistorialCierres } = useCajaStore()
  const [notas, setNotas] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [cerrando, setCerrando] = useState(false)

  useEffect(() => { cargarHistorialCierres() }, [cargarHistorialCierres])

  const cierreHoy = cierresCaja.find(c => c.fecha === hoyISO())

  if (!resumenHoy) return null

  const maxForma = Math.max(1, ...DESGLOSE.map(d => resumenHoy[d.key]))

  const confirmarCierre = async () => {
    setCerrando(true)
    await cerrarCaja(notas)
    await cargarHistorialCierres()
    setCerrando(false)
    setConfirmar(false)
  }

  return (
    <div className="h-full flex flex-col gap-5 overflow-y-auto pr-1 max-w-3xl">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Cierre de caja</h2>
          <p className="text-[12px] text-[#606060] capitalize">{fechaLarga(hoyISO())}</p>
        </div>
        {diaYaCerrado && (
          <Badge label={cierreHoy ? `Caja cerrada — ${new Date(cierreHoy.fecha + 'T00:00:00').toLocaleDateString('es-AR')}` : 'Caja cerrada'} variant="success" />
        )}
      </header>

      <ResumenDia resumen={resumenHoy} />

      {/* Desglose por forma de pago */}
      <div className="rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-4 flex flex-col gap-3">
        <span className="text-[11px] uppercase tracking-wider text-[#606060]">Desglose por forma de pago</span>
        {DESGLOSE.map(d => (
          <div key={d.key} className="flex items-center gap-3">
            <span className="w-28 text-[13px] text-[#A0A0A0] light:text-[#404040]">{d.label}</span>
            <div className="flex-1 h-2 rounded-full bg-[#1C1C1C] light:bg-[#F0F0F0] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(resumenHoy[d.key] / maxForma) * 100}%`, backgroundColor: d.color }} />
            </div>
            <span className="w-24 text-right text-[13px] font-medium text-white light:text-black tabular-nums">{money(resumenHoy[d.key])}</span>
          </div>
        ))}
      </div>

      {diaYaCerrado && cierreHoy ? (
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#4CAF7D]"><Lock size={14} /><span className="text-[13px] font-medium">Caja cerrada</span></div>
          <div className="grid grid-cols-2 gap-y-1 text-[13px]">
            <span className="text-[#606060]">Saldo neto</span>
            <span className="text-right text-white light:text-black tabular-nums">{money(cierreHoy.saldoNeto)}</span>
            <span className="text-[#606060]">Cerrado por</span>
            <span className="text-right text-[#A0A0A0] light:text-[#404040]">{cierreHoy.cerradoPor}</span>
            {cierreHoy.notas && <><span className="text-[#606060]">Notas</span><span className="text-right text-[#A0A0A0] light:text-[#404040]">{cierreHoy.notas}</span></>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#606060]">Notas del cierre (opcional)</label>
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Observaciones del día..."
              className="w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none resize-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setConfirmar(true)}><Lock size={14} className="mr-1.5" />Cerrar caja del día</Button>
          </div>
        </div>
      )}

      <Modal open={confirmar} onClose={() => setConfirmar(false)} title="Cerrar caja del día" maxWidth="max-w-md"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmar(false)} disabled={cerrando}>Cancelar</Button>
          <Button onClick={confirmarCierre} disabled={cerrando}>{cerrando ? 'Cerrando...' : 'Cerrar caja'}</Button>
        </>}>
        <div className="flex flex-col gap-3 pb-1">
          <p className="text-[13px] text-[#A0A0A0] light:text-[#404040]">
            ¿Cerrar la caja del día <span className="text-white light:text-black capitalize">{fechaLarga(hoyISO())}</span>?
          </p>
          <p className="text-[12px] text-[#D4921A]">Una vez cerrada no podrás modificar los registros de hoy.</p>
          <div className="flex items-center justify-between rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] px-3 py-2">
            <span className="text-[12px] text-[#606060]">Saldo neto</span>
            <span className={cn('text-base font-bold tabular-nums', resumenHoy.saldoNeto >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>{money(resumenHoy.saldoNeto)}</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}
