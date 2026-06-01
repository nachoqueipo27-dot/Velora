import { useState } from 'react'
import { useConfigStore } from '../../store/configStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { DollarSign } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const Multimoneda = () => {
  const { tipoCambioActual, historialTC, actualizarTipoCambio } = useConfigStore()
  const [valor, setValor] = useState(String(tipoCambioActual || ''))
  const [confirmar, setConfirmar] = useState(false)
  const [procesando, setProcesando] = useState(false)

  const nuevoValor = Number(valor) || 0
  const aplicar = async (recalcular: boolean) => {
    if (nuevoValor <= 0) return
    setProcesando(true)
    await actualizarTipoCambio(nuevoValor, recalcular)
    setProcesando(false); setConfirmar(false)
  }

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Multimoneda</h2>
        <p className="text-[12px] text-[#606060]">Tipo de cambio USD → ARS para costos y recálculo de precios.</p>
      </header>

      <div className="rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-4 flex flex-col gap-3">
        <span className="text-[11px] uppercase tracking-wider text-[#606060]">Tipo de cambio actual</span>
        <div className="text-3xl font-bold text-white light:text-black tabular-nums">{money(tipoCambioActual)}</div>
        <div className="flex items-end gap-2 pt-1">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-[#606060]">Nuevo valor (ARS por USD)</label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606060]" />
              <input type="number" min={0} value={valor} onChange={e => setValor(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
            </div>
          </div>
          <Button onClick={() => setConfirmar(true)} disabled={nuevoValor <= 0}>Actualizar</Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Historial</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-4 py-2">Fecha</th><th className="font-medium px-4 py-2 text-right">Valor</th><th className="font-medium px-4 py-2">Actualizado por</th>
            </tr></thead>
            <tbody>
              {historialTC.map(tc => (
                <tr key={tc.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-4 py-2 text-[#A0A0A0] light:text-[#404040]">{format(new Date(tc.fecha), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="px-4 py-2 text-right text-white light:text-black tabular-nums">{money(tc.valor)}</td>
                  <td className="px-4 py-2 text-[#606060]">{tc.creadoPor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={confirmar} onClose={() => setConfirmar(false)} title="Actualizar tipo de cambio" maxWidth="max-w-md"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmar(false)} disabled={procesando}>Cancelar</Button>
          <Button variant="secondary" onClick={() => aplicar(false)} disabled={procesando}>Solo actualizar</Button>
          <Button onClick={() => aplicar(true)} disabled={procesando}>{procesando ? '...' : 'Actualizar y recalcular'}</Button>
        </>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-1">¿Actualizar el tipo de cambio a <b className="text-white light:text-black">{money(nuevoValor)}</b>?</p>
        <p className="text-[12px] text-[#606060]">«Actualizar y recalcular» actualiza el precio de venta de todos los productos con costo en USD (costo × {money(nuevoValor)}) y lo registra en el historial de precios.</p>
      </Modal>
    </div>
  )
}
