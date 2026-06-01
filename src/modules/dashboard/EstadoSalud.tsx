import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useDashboardStore, type PeriodoSalud } from '../../store/dashboardStore'
import { CardMetrica } from './components/CardMetrica'
import { BarraProgreso } from './components/BarraProgreso'
import { ComparativoTabla } from './components/ComparativoTabla'
import { Button } from '../../components/ui/Button'
import { TrendingUp, TrendingDown, Wallet, CheckCircle2, XCircle, Receipt, Package, UserCheck, Star } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

const TABS: { id: PeriodoSalud; label: string }[] = [
  { id: 'mes_actual',    label: 'Mes actual' },
  { id: 'mes_anterior',  label: 'Mes anterior' },
  { id: 'personalizado', label: 'Personalizado' },
]

export const EstadoSalud = () => {
  const { salud, comparativo, loadingSalud, cargarEstadoSalud } = useDashboardStore()
  const [periodo, setPeriodo] = useState<PeriodoSalud>('mes_actual')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  useEffect(() => {
    if (periodo !== 'personalizado') cargarEstadoSalud(periodo)
  }, [periodo, cargarEstadoSalud])

  const calcularPersonalizado = () => {
    if (desde && hasta) cargarEstadoSalud('personalizado', desde, hasta)
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1 pb-4">
      {/* Selector de período */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex gap-1 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] p-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setPeriodo(t.id)}
              className={cn('px-3 py-1.5 text-[12px] rounded-[6px] transition-all',
                periodo === t.id
                  ? 'bg-white text-black light:bg-black light:text-white'
                  : 'text-[#A0A0A0] hover:text-white light:text-[#404040] light:hover:text-black')}>
              {t.label}
            </button>
          ))}
        </div>
        {periodo === 'personalizado' && (
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#606060]">Desde</label>
              <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
                className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-[#606060]">Hasta</label>
              <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
                className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
            </div>
            <Button size="sm" variant="secondary" onClick={calcularPersonalizado} disabled={!desde || !hasta}>Calcular</Button>
          </div>
        )}
        {salud && <span className="text-[11px] text-[#606060] ml-auto">{salud.periodo.label}</span>}
      </div>

      {loadingSalud || !salud ? (
        <div className="text-[13px] text-[#606060]">Calculando indicadores…</div>
      ) : (
        <>
          {/* Sección 1 — Financieras */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <CardMetrica titulo="Ingresos" valor={salud.ingresos} formato={money} subtitulo="del período" color="success" icono={<TrendingUp size={15} />} />
            <CardMetrica titulo="Egresos" valor={salud.egresos} formato={money} subtitulo="del período" color="error" icono={<TrendingDown size={15} />} />
            <div className="flex flex-col gap-1 rounded-card border border-l-[3px] p-4 border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white"
              style={{ borderLeftColor: salud.margenOperativo >= 0 ? '#4CAF7D' : '#C0392B' }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-[#606060]">Margen operativo</span>
                <Wallet size={15} className="text-[#606060]" />
              </div>
              <span className={cn('text-2xl font-bold tabular-nums leading-tight', salud.margenOperativo >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>
                {money(salud.margenOperativo)} <span className="text-sm">({salud.margenPorcentaje}%)</span>
              </span>
              <div className="mt-1.5">
                <BarraProgreso label="" valor={Math.max(0, salud.margenPorcentaje)} maximo={100}
                  color={salud.margenOperativo >= 0 ? '#4CAF7D' : '#C0392B'} />
              </div>
            </div>
          </div>

          {/* Sección 2 — Operaciones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="flex flex-col gap-3 rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-4">
              <span className="text-[11px] uppercase tracking-wider text-[#606060]">OTs del período</span>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#4CAF7D]" /><span className="text-[13px] text-white light:text-black">Completadas: <b>{salud.otsCompletadas}</b></span></div>
                <div className="flex items-center gap-2"><XCircle size={15} className="text-[#C0392B]" /><span className="text-[13px] text-white light:text-black">Canceladas: <b>{salud.otsCanceladas}</b> ({salud.tasaCancelacion}%)</span></div>
              </div>
              <BarraProgreso label="Tasa de cancelación" valor={salud.tasaCancelacion} maximo={100} color="#C0392B"
                sufijo={<span className="text-[11px] text-[#606060]">{salud.tasaCancelacion}%</span>} />
            </div>
            <CardMetrica titulo="Ticket promedio" valor={salud.ticketPromedio} formato={money} subtitulo="por cobro" icono={<Receipt size={15} />} />
          </div>

          {/* Sección 3 — Top performers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <TopCard icono={<Package size={15} />} titulo="Producto top"
              nombre={salud.productoMasVendido?.nombre ?? '—'} detalle={salud.productoMasVendido ? `${salud.productoMasVendido.unidades} unidades vendidas` : 'Sin ventas'} />
            <TopCard icono={<UserCheck size={15} />} titulo="Cliente más activo"
              nombre={salud.clienteMasActivo?.nombre ?? '—'} detalle={salud.clienteMasActivo ? `${salud.clienteMasActivo.ots} OTs` : 'Sin actividad'} />
            <TopCard icono={<Star size={15} />} titulo="Empleado destacado"
              nombre={salud.empleadoDestacado?.nombre ?? '—'} detalle={salud.empleadoDestacado ? `${salud.empleadoDestacado.ots} OTs cerradas` : 'Sin OTs cerradas'} />
          </div>

          {/* Sección 4 — Comparativo */}
          {comparativo && (
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2">
                Comparativo · {comparativo.actual.label} vs {comparativo.anterior.label}
              </h3>
              <ComparativoTabla periodoActual={comparativo.actual} periodoAnterior={comparativo.anterior} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

const TopCard = ({ icono, titulo, nombre, detalle }: { icono: React.ReactNode; titulo: string; nombre: string; detalle: string }) => (
  <div className="flex flex-col gap-1 rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-4">
    <div className="flex items-center gap-1.5 text-[#606060]">{icono}<span className="text-[11px] uppercase tracking-wider">{titulo}</span></div>
    <span className="text-base font-semibold text-white light:text-black truncate">{nombre}</span>
    <span className="text-[11px] text-[#606060]">{detalle}</span>
  </div>
)
