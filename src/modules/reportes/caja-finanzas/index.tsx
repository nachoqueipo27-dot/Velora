import { useEffect, useState } from 'react'
import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '../../../lib/utils'
import { useReporteCajaFinanzasStore } from '../../../store/reporteCajaFinanzasStore'
import { useNegocio } from '../../../hooks/useNegocio'
import { usePDF } from '../../../hooks/usePDF'
import { CardMetrica } from '../../dashboard/components/CardMetrica'
import { Button } from '../../../components/ui/Button'
import { PDFReporteCajaFinanzas } from '../../../lib/pdf/documentos/PDFReporteCajaFinanzas'
import { DollarSign, Receipt, Scale, ClipboardCheck, Download, Check, Lock, Clock } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const hoyStr = () => format(new Date(), 'yyyy-MM-dd')

type RangoId = 'hoy' | 'semana' | 'mes' | 'mesAnterior'

const RANGOS_RAPIDOS: { id: RangoId; label: string }[] = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes', label: 'Este mes' },
  { id: 'mesAnterior', label: 'Mes anterior' },
]

function calcularRango(id: RangoId): { desde: string; hasta: string } {
  const ahora = new Date()
  if (id === 'hoy') return { desde: hoyStr(), hasta: hoyStr() }
  if (id === 'semana') return { desde: format(startOfWeek(ahora, { weekStartsOn: 1 }), 'yyyy-MM-dd'), hasta: hoyStr() }
  if (id === 'mes') return { desde: format(startOfMonth(ahora), 'yyyy-MM-dd'), hasta: hoyStr() }
  const anterior = subMonths(ahora, 1)
  return { desde: format(startOfMonth(anterior), 'yyyy-MM-dd'), hasta: format(endOfMonth(anterior), 'yyyy-MM-dd') }
}

const PAGE = 10

const CajaFinanzas = () => {
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const {
    cargando, totalCobrado, totalGastos, balanceNeto, cantidadCierres, gastosPorCategoria,
    cierres, totalCierres, gastos, totalGastosDetalle, cierreMes, avanceMes,
    cargarReporte, obtenerTodosLosCierres, obtenerTodosLosGastos,
  } = useReporteCajaFinanzasStore()

  const rangoInicial = calcularRango('mes')
  const [desde, setDesde] = useState(rangoInicial.desde)
  const [hasta, setHasta] = useState(rangoInicial.hasta)
  const [rangoActivo, setRangoActivo] = useState<RangoId | null>('mes')
  const [paginaCierres, setPaginaCierres] = useState(0)
  const [paginaGastos, setPaginaGastos] = useState(0)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    cargarReporte(desde, hasta, paginaCierres, paginaGastos)
  }, [desde, hasta, paginaCierres, paginaGastos, cargarReporte])

  const aplicarRango = (id: RangoId) => {
    const r = calcularRango(id)
    setRangoActivo(id)
    setDesde(r.desde); setHasta(r.hasta); setPaginaCierres(0); setPaginaGastos(0)
  }

  const totalPaginasCierres = Math.max(1, Math.ceil(totalCierres / PAGE))
  const totalPaginasGastos = Math.max(1, Math.ceil(totalGastosDetalle / PAGE))

  const handleDescargar = async () => {
    const [cierresCompletos, gastosCompletos] = await Promise.all([
      obtenerTodosLosCierres(desde, hasta),
      obtenerTodosLosGastos(desde, hasta),
    ])
    const r = await descargar(
      <PDFReporteCajaFinanzas
        negocio={negocio}
        desde={desde} hasta={hasta}
        totalCobrado={totalCobrado} totalGastos={totalGastos} balanceNeto={balanceNeto} cantidadCierres={cantidadCierres}
        gastosPorCategoria={gastosPorCategoria}
        cierres={cierresCompletos}
        gastos={gastosCompletos}
        cierreMes={cierreMes}
        avanceMes={avanceMes}
        fecha={format(new Date(), 'dd/MM/yyyy HH:mm')}
      />,
      `Reporte-Caja-Finanzas-${desde}-a-${hasta}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  const sinDatos = totalCierres === 0 && totalGastosDetalle === 0 && totalCobrado === 0

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Caja y finanzas</h2>
          <p className="text-[12px] text-[#606060]">Cobros, gastos operativos y cierres de caja del período seleccionado.</p>
        </div>
        <Button onClick={handleDescargar} disabled={generando || sinDatos}>
          {ok ? <><Check size={15} className="mr-1.5" />Descargado</> : <><Download size={15} className="mr-1.5" />{generando ? 'Generando...' : 'Descargar PDF'}</>}
        </Button>
      </header>

      {/* Rango de fechas */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex gap-1.5">
          {RANGOS_RAPIDOS.map(r => (
            <button key={r.id} onClick={() => aplicarRango(r.id)}
              className={cn('px-3 py-1.5 text-[12px] rounded-input border transition-all',
                rangoActivo === r.id
                  ? 'border-white bg-white text-black light:border-black light:bg-black light:text-white'
                  : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-white light:border-[#E4E4E4] light:text-[#404040]')}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-end gap-2 ml-auto">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#606060]">Desde</label>
            <input type="date" value={desde}
              onChange={e => { setDesde(e.target.value); setRangoActivo(null); setPaginaCierres(0); setPaginaGastos(0) }}
              className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#606060]">Hasta</label>
            <input type="date" value={hasta}
              onChange={e => { setHasta(e.target.value); setRangoActivo(null); setPaginaCierres(0); setPaginaGastos(0) }}
              className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 gap-3">
        <CardMetrica titulo="Total cobrado" valor={totalCobrado} formato={money} icono={<DollarSign size={15} />} />
        <CardMetrica titulo="Gastos operativos" valor={totalGastos} formato={money} icono={<Receipt size={15} />} />
        <CardMetrica titulo="Balance neto" valor={balanceNeto} formato={money} color={balanceNeto >= 0 ? 'success' : 'error'} icono={<Scale size={15} />} />
        <CardMetrica titulo="Cierres de caja" valor={cantidadCierres} icono={<ClipboardCheck size={15} />} />
      </div>

      {/* Cierre de mes — dato oficial ya cerrado, separado de las métricas calculadas en tiempo real */}
      {cierreMes && (
        <div className="rounded-card border border-[#D4921A]/40 bg-[#D4921A]/[0.06] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-[#D4921A]" />
              <span className="text-[13px] font-semibold text-white light:text-black capitalize">
                Cierre de mes — {format(new Date(cierreMes.anio, cierreMes.mes - 1, 1), 'MMMM yyyy', { locale: es })}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D4921A] px-2 py-0.5 rounded-input border border-[#D4921A]/40">
              Oficial
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#606060]">Ingresos</span>
              <span className="text-[13px] font-medium text-white light:text-black">{money(cierreMes.totalIngresos)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#606060]">Gastos</span>
              <span className="text-[13px] font-medium text-white light:text-black">{money(cierreMes.totalGastos)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#606060]">Margen operativo</span>
              <span className={cn('text-[13px] font-medium', cierreMes.margenOperativo >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>
                {money(cierreMes.margenOperativo)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[#606060]">Cerrado por {cierreMes.cerradoPor}</span>
        </div>
      )}

      {/* Mes en curso — avance parcial (mismos totales del reporte), todavía sin cerrar oficialmente */}
      {!cierreMes && avanceMes && (
        <div className="rounded-card border border-[#4A7FA5]/40 bg-[#4A7FA5]/[0.06] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#4A7FA5]" />
              <span className="text-[13px] font-semibold text-white light:text-black capitalize">
                Cierre de mes — {format(new Date(avanceMes.anio, avanceMes.mes - 1, 1), 'MMMM yyyy', { locale: es })}
              </span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#4A7FA5] px-2 py-0.5 rounded-input border border-[#4A7FA5]/40">
              Mes en curso
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#606060]">Ingresos</span>
              <span className="text-[13px] font-medium text-white light:text-black">{money(avanceMes.totalIngresos)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#606060]">Gastos</span>
              <span className="text-[13px] font-medium text-white light:text-black">{money(avanceMes.totalGastos)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-[#606060]">Margen operativo</span>
              <span className={cn('text-[13px] font-medium', avanceMes.margenOperativo >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>
                {money(avanceMes.margenOperativo)}
              </span>
            </div>
          </div>
          <span className="text-[11px] text-[#606060]">Avance parcial hasta hoy — el mes todavía no se cerró</span>
        </div>
      )}

      {/* Gastos por categoría */}
      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        <div className="px-3 py-2 border-b border-[#2A2A2A] light:border-[#E4E4E4]">
          <span className="text-[11px] uppercase tracking-wider text-[#606060]">Gastos por categoría</span>
        </div>
        {gastosPorCategoria.length === 0 ? (
          <p className="text-[12px] text-[#606060] px-3 py-4 text-center">Sin gastos en el período</p>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {gastosPorCategoria.map(g => (
                <tr key={g.categoria} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2 text-white light:text-black">{g.categoria}</td>
                  <td className="px-3 py-2 text-right text-[#A0A0A0] light:text-[#404040]">{money(g.monto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cierres de caja */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Cierres de caja</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">Fecha</th>
              <th className="font-medium px-3 py-2.5 text-right">Cobrado</th>
              <th className="font-medium px-3 py-2.5 text-right">Gastos</th>
              <th className="font-medium px-3 py-2.5 text-right">Balance</th>
              <th className="font-medium px-3 py-2.5">Cerrado por</th>
            </tr></thead>
            <tbody>
              {!cargando && cierres.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#606060]">Sin cierres en el período</td></tr>
              )}
              {cierres.map(c => (
                <tr key={c.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">{format(new Date(c.fecha), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(c.totalIngresos)}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(c.totalGastos)}</td>
                  <td className={cn('px-3 py-2.5 text-right font-medium', c.saldoNeto >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>{money(c.saldoNeto)}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{c.cerradoPor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPaginasCierres > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <Button size="sm" variant="secondary" onClick={() => setPaginaCierres(p => Math.max(0, p - 1))} disabled={paginaCierres === 0}>Anterior</Button>
            <span className="text-[12px] text-[#606060]">Página {paginaCierres + 1} de {totalPaginasCierres}</span>
            <Button size="sm" variant="secondary" onClick={() => setPaginaCierres(p => Math.min(totalPaginasCierres - 1, p + 1))} disabled={paginaCierres >= totalPaginasCierres - 1}>Siguiente</Button>
          </div>
        )}
      </div>

      {/* Gastos operativos */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Gastos operativos</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">Fecha</th>
              <th className="font-medium px-3 py-2.5">Categoría</th>
              <th className="font-medium px-3 py-2.5 text-right">Monto</th>
              <th className="font-medium px-3 py-2.5">Descripción</th>
            </tr></thead>
            <tbody>
              {!cargando && gastos.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#606060]">Sin gastos en el período</td></tr>
              )}
              {gastos.map(g => (
                <tr key={g.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">{format(new Date(g.fecha), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{g.categoria}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium">{money(g.monto)}</td>
                  <td className="px-3 py-2.5 text-[#606060] truncate max-w-[200px]">{g.descripcion ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPaginasGastos > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <Button size="sm" variant="secondary" onClick={() => setPaginaGastos(p => Math.max(0, p - 1))} disabled={paginaGastos === 0}>Anterior</Button>
            <span className="text-[12px] text-[#606060]">Página {paginaGastos + 1} de {totalPaginasGastos}</span>
            <Button size="sm" variant="secondary" onClick={() => setPaginaGastos(p => Math.min(totalPaginasGastos - 1, p + 1))} disabled={paginaGastos >= totalPaginasGastos - 1}>Siguiente</Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default CajaFinanzas
