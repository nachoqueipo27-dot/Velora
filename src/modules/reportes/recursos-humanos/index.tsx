import { useEffect, useState } from 'react'
import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useReporteRRHHStore } from '../../../store/reporteRRHHStore'
import { useNegocio } from '../../../hooks/useNegocio'
import { usePDF } from '../../../hooks/usePDF'
import { CardMetrica } from '../../dashboard/components/CardMetrica'
import { Button } from '../../../components/ui/Button'
import { TIPOS_AUSENCIA } from '../../../types/empleados'
import { PDFReporteRRHH } from '../../../lib/pdf/documentos/PDFReporteRRHH'
import { Clock, Timer, CalendarX, Download, Check } from 'lucide-react'

const LABEL_AUSENCIA = Object.fromEntries(TIPOS_AUSENCIA.map(t => [t.value, t.label]))

const horas = (n: number) => `${n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`
const minutos = (m: number) => {
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return h > 0 ? `${h}h ${r}m` : `${r}m`
}
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

const RecursosHumanos = () => {
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const {
    cargando, totalHorasTrabajadas, rankingHoras,
    totalMinutosExtra, extrasPorTipo, rankingExtras,
    totalAusencias, ausenciasPorTipo, ausencias, fichajes, totalFichajes,
    cargarReporte, obtenerTodosLosFichajes,
  } = useReporteRRHHStore()

  const rangoInicial = calcularRango('mes')
  const [desde, setDesde] = useState(rangoInicial.desde)
  const [hasta, setHasta] = useState(rangoInicial.hasta)
  const [rangoActivo, setRangoActivo] = useState<RangoId | null>('mes')
  const [pagina, setPagina] = useState(0)
  const [ok, setOk] = useState(false)

  useEffect(() => { cargarReporte(desde, hasta, pagina) }, [desde, hasta, pagina, cargarReporte])

  const aplicarRango = (id: RangoId) => {
    const r = calcularRango(id)
    setRangoActivo(id)
    setDesde(r.desde); setHasta(r.hasta); setPagina(0)
  }

  const totalPaginas = Math.max(1, Math.ceil(totalFichajes / PAGE))

  const handleDescargar = async () => {
    const fichajesCompletos = await obtenerTodosLosFichajes(desde, hasta)
    const r = await descargar(
      <PDFReporteRRHH
        negocio={negocio}
        desde={desde} hasta={hasta}
        totalHorasTrabajadas={totalHorasTrabajadas}
        rankingHoras={rankingHoras}
        totalMinutosExtra={totalMinutosExtra}
        extrasPorTipo={extrasPorTipo}
        rankingExtras={rankingExtras}
        totalAusencias={totalAusencias}
        ausenciasPorTipo={ausenciasPorTipo}
        ausencias={ausencias}
        fichajes={fichajesCompletos}
        fecha={format(new Date(), 'dd/MM/yyyy HH:mm')}
      />,
      `Reporte-Recursos-Humanos-${desde}-a-${hasta}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Recursos humanos</h2>
          <p className="text-[12px] text-[#606060]">Horas trabajadas, horas extra y ausencias del período seleccionado.</p>
        </div>
        <Button onClick={handleDescargar} disabled={generando}>
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
              onChange={e => { setDesde(e.target.value); setRangoActivo(null); setPagina(0) }}
              className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#606060]">Hasta</label>
            <input type="date" value={hasta}
              onChange={e => { setHasta(e.target.value); setRangoActivo(null); setPagina(0) }}
              className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
        </div>
      </div>

      {/* Horas trabajadas */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Horas trabajadas</span>
        <div className="mb-3">
          <CardMetrica titulo="Total del período" valor={totalHorasTrabajadas} formato={horas}
            subtitulo="suma de todos los empleados" icono={<Clock size={15} />} />
        </div>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5 w-10">#</th>
              <th className="font-medium px-3 py-2.5">Empleado</th>
              <th className="font-medium px-3 py-2.5 text-right">Horas</th>
            </tr></thead>
            <tbody>
              {!cargando && rankingHoras.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[#606060]">Sin fichajes en el período</td></tr>
              )}
              {rankingHoras.map((r, i) => (
                <tr key={r.empleadoId} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-[#606060] tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5 text-white light:text-black">{r.empleadoNombre}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium tabular-nums">{horas(r.horas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Horas extra */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Horas extra</span>
        <div className="mb-3">
          <CardMetrica titulo="Total del período" valor={totalMinutosExtra} formato={minutos}
            subtitulo="suma de todos los empleados" icono={<Timer size={15} />} />
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {extrasPorTipo.map(t => (
            <span key={t.tipo} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] text-[12px]">
              <span className="text-[#A0A0A0] light:text-[#404040]">{t.label}</span>
              <span className="font-semibold text-white light:text-black tabular-nums">{minutos(t.minutos)}</span>
            </span>
          ))}
        </div>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5 w-10">#</th>
              <th className="font-medium px-3 py-2.5">Empleado</th>
              <th className="font-medium px-3 py-2.5 text-right">Horas extra</th>
            </tr></thead>
            <tbody>
              {!cargando && rankingExtras.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[#606060]">Sin horas extra en el período</td></tr>
              )}
              {rankingExtras.map((r, i) => (
                <tr key={r.empleadoId} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-[#606060] tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5 text-white light:text-black">{r.empleadoNombre}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium tabular-nums">{minutos(r.minutos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ausencias */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Ausencias</span>
        <div className="mb-3">
          <CardMetrica titulo="Total del período" valor={totalAusencias}
            subtitulo="solapadas con el rango seleccionado"
            color={totalAusencias > 0 ? 'warning' : 'default'} icono={<CalendarX size={15} />} />
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {ausenciasPorTipo.map(t => (
            <span key={t.tipo} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] text-[12px]">
              <span className="text-[#A0A0A0] light:text-[#404040]">{t.label}</span>
              <span className="font-semibold text-white light:text-black tabular-nums">{t.cantidad}</span>
            </span>
          ))}
        </div>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">Empleado</th>
              <th className="font-medium px-3 py-2.5">Tipo</th>
              <th className="font-medium px-3 py-2.5">Desde</th>
              <th className="font-medium px-3 py-2.5">Hasta</th>
            </tr></thead>
            <tbody>
              {!cargando && ausencias.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#606060]">Sin ausencias en el período</td></tr>
              )}
              {ausencias.map(a => (
                <tr key={a.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">{a.empleadoNombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{LABEL_AUSENCIA[a.tipo] ?? a.tipo}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(a.fechaInicio), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(a.fechaFin), 'dd/MM/yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle de fichajes */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Detalle de fichajes</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">Empleado</th>
              <th className="font-medium px-3 py-2.5">Fecha</th>
              <th className="font-medium px-3 py-2.5">Entrada</th>
              <th className="font-medium px-3 py-2.5">Salida</th>
              <th className="font-medium px-3 py-2.5 text-right">Horas</th>
            </tr></thead>
            <tbody>
              {!cargando && fichajes.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#606060]">Sin fichajes en el período</td></tr>
              )}
              {fichajes.map(f => (
                <tr key={f.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">{f.empleadoNombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(f.fecha), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{f.entrada ?? '—'}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{f.salida ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium tabular-nums">
                    {f.horasTrabajadas != null ? horas(f.horasTrabajadas) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-3 mt-3">
            <Button size="sm" variant="secondary" onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}>Anterior</Button>
            <span className="text-[12px] text-[#606060]">Página {pagina + 1} de {totalPaginas}</span>
            <Button size="sm" variant="secondary" onClick={() => setPagina(p => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1}>Siguiente</Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default RecursosHumanos
