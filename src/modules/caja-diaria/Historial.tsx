import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useCajaStore } from '../../store/cajaStore'
import { Button } from '../../components/ui/Button'
import { usePDF } from '../../hooks/usePDF'
import { useNegocio } from '../../hooks/useNegocio'
import { PDFCierreMes } from '../../lib/pdf/documentos/PDFCierreMes'
import { MESES } from '../../types/caja'
import { FileDown, FileSpreadsheet } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const fechaCorta = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

type Tab = 'diarios' | 'mensuales'

export const Historial = () => {
  const { cierresCaja, cierresMes, cargarHistorialCierres, cargarCierresMes } = useCajaStore()
  const negocio = useNegocio()
  const { descargar } = usePDF()
  const [tab, setTab] = useState<Tab>('diarios')

  useEffect(() => { cargarHistorialCierres(); cargarCierresMes() }, [cargarHistorialCierres, cargarCierresMes])

  return (
    <div className="h-full flex flex-col gap-5 overflow-hidden">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Historial de cierres</h2>
          <p className="text-[12px] text-[#606060]">Registro de cierres diarios y mensuales</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => console.log(`[Excel placeholder] Exportar cierres ${tab}`, tab === 'diarios' ? cierresCaja : cierresMes)}>
          <FileSpreadsheet size={14} className="mr-1.5" />Exportar Excel
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2A2A2A] light:border-[#E4E4E4]">
        {([['diarios', 'Cierres diarios'], ['mensuales', 'Cierres mensuales']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-4 py-2 text-[13px] -mb-px border-b-2 transition-all',
              tab === id ? 'border-white text-white light:border-black light:text-black'
                : 'border-transparent text-[#606060] hover:text-[#A0A0A0]')}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {tab === 'diarios' ? (
          <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
                  <th className="font-medium px-3 py-2.5">Fecha</th>
                  <th className="font-medium px-3 py-2.5 text-right">Efectivo</th>
                  <th className="font-medium px-3 py-2.5 text-right">Transferencia</th>
                  <th className="font-medium px-3 py-2.5 text-right">Tarjeta</th>
                  <th className="font-medium px-3 py-2.5 text-right">Ingresos</th>
                  <th className="font-medium px-3 py-2.5 text-right">Gastos</th>
                  <th className="font-medium px-3 py-2.5 text-right">Neto</th>
                  <th className="font-medium px-3 py-2.5">Cerrado por</th>
                </tr>
              </thead>
              <tbody>
                {cierresCaja.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#606060]">Sin cierres diarios registrados</td></tr>
                )}
                {cierresCaja.map(c => (
                  <tr key={c.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0 hover:bg-white/[0.02] light:hover:bg-black/[0.02]">
                    <td className="px-3 py-2.5 text-white light:text-black tabular-nums">{fechaCorta(c.fecha)}</td>
                    <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040] tabular-nums">{money(c.totalEfectivo)}</td>
                    <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040] tabular-nums">{money(c.totalTransferencia)}</td>
                    <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040] tabular-nums">{money(c.totalTarjeta)}</td>
                    <td className="px-3 py-2.5 text-right text-[#4CAF7D] tabular-nums">{money(c.totalIngresos)}</td>
                    <td className="px-3 py-2.5 text-right text-[#C0392B] tabular-nums">{money(c.totalGastos)}</td>
                    <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', c.saldoNeto >= 0 ? 'text-white light:text-black' : 'text-[#C0392B]')}>{money(c.saldoNeto)}</td>
                    <td className="px-3 py-2.5 text-[#606060]">{c.cerradoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
                  <th className="font-medium px-3 py-2.5">Mes / Año</th>
                  <th className="font-medium px-3 py-2.5 text-right">Ingresos</th>
                  <th className="font-medium px-3 py-2.5 text-right">Gastos</th>
                  <th className="font-medium px-3 py-2.5 text-right">Margen</th>
                  <th className="font-medium px-3 py-2.5 text-center">OTs</th>
                  <th className="font-medium px-3 py-2.5">Producto top</th>
                  <th className="font-medium px-3 py-2.5">Empleado top</th>
                  <th className="font-medium px-3 py-2.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {cierresMes.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-[#606060]">Sin cierres mensuales registrados</td></tr>
                )}
                {cierresMes.map(c => (
                  <tr key={c.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0 hover:bg-white/[0.02] light:hover:bg-black/[0.02]">
                    <td className="px-3 py-2.5 text-white light:text-black">{MESES[c.mes - 1]} {c.anio}</td>
                    <td className="px-3 py-2.5 text-right text-[#4CAF7D] tabular-nums">{money(c.totalIngresos)}</td>
                    <td className="px-3 py-2.5 text-right text-[#C0392B] tabular-nums">{money(c.totalGastos)}</td>
                    <td className={cn('px-3 py-2.5 text-right font-semibold tabular-nums', c.margenOperativo >= 0 ? 'text-white light:text-black' : 'text-[#C0392B]')}>{money(c.margenOperativo)}</td>
                    <td className="px-3 py-2.5 text-center text-[#A0A0A0] light:text-[#404040] tabular-nums">{c.otsCompletadas} / {c.otsCanceladas}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{c.productoMasVendido ?? '—'}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{c.empleadoDestacado ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => descargar(<PDFCierreMes cierre={c} negocio={negocio} />, `CierreMes-${c.anio}-${String(c.mes).padStart(2, '0')}.pdf`)}
                        className="p-1 rounded text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all" title="Descargar PDF">
                        <FileDown size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
