import { useEffect, useState } from 'react'
import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useReporteOTPresupuestosStore } from '../../../store/reporteOTPresupuestosStore'
import { useNegocio } from '../../../hooks/useNegocio'
import { usePDF } from '../../../hooks/usePDF'
import { CardMetrica } from '../../dashboard/components/CardMetrica'
import { Button } from '../../../components/ui/Button'
import { EstadoBadgeOT } from '../../ordenes-trabajo/components/EstadoBadgeOT'
import { PDFReporteOTPresupuestos } from '../../../lib/pdf/documentos/PDFReporteOTPresupuestos'
import { ClipboardList, DollarSign, FileText, Percent, Download, Check } from 'lucide-react'

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

const OTPresupuestos = () => {
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const {
    cargando, otsPorEstado, otsCompletadas, facturacionOTs,
    presupuestosCreados, presupuestosAprobados, tasaAprobacion, montoPresupuestado, montoAprobado,
    otsDetalle, totalOTs,
    cargarReporte, obtenerTodasLasOTs,
  } = useReporteOTPresupuestosStore()

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

  const totalPaginas = Math.max(1, Math.ceil(totalOTs / PAGE))

  const handleDescargar = async () => {
    const otsCompletas = await obtenerTodasLasOTs(desde, hasta)
    const r = await descargar(
      <PDFReporteOTPresupuestos
        negocio={negocio}
        desde={desde} hasta={hasta}
        otsPorEstado={otsPorEstado}
        otsCompletadas={otsCompletadas}
        facturacionOTs={facturacionOTs}
        presupuestosCreados={presupuestosCreados}
        presupuestosAprobados={presupuestosAprobados}
        tasaAprobacion={tasaAprobacion}
        montoPresupuestado={montoPresupuestado}
        montoAprobado={montoAprobado}
        otsDetalle={otsCompletas}
        fecha={format(new Date(), 'dd/MM/yyyy HH:mm')}
      />,
      `Reporte-OT-Presupuestos-${desde}-a-${hasta}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Órdenes de trabajo y presupuestos</h2>
          <p className="text-[12px] text-[#606060]">Actividad de OTs y presupuestos del período seleccionado.</p>
        </div>
        <Button onClick={handleDescargar} disabled={generando}>
          {ok ? <><Check size={15} className="mr-1.5" />Descargado</> : <><Download size={15} className="mr-1.5" />{generando ? 'Generando...' : 'Descargar PDF'}</>}
        </Button>
      </header>

      {/* Rango de fechas — aplica a fecha de creación de OTs y presupuestos */}
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

      {/* Órdenes de trabajo del período */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Órdenes de trabajo del período</span>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <CardMetrica titulo="OTs completadas" valor={otsCompletadas} subtitulo="finalizadas o entregadas" icono={<ClipboardList size={15} />} />
          <CardMetrica titulo="Facturación" valor={facturacionOTs} formato={money} subtitulo="de OTs completadas" icono={<DollarSign size={15} />} />
        </div>
        <div className="flex flex-wrap gap-2">
          {otsPorEstado.map(e => (
            <span key={e.estado} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] text-[12px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
              <span className="text-[#A0A0A0] light:text-[#404040]">{e.label}</span>
              <span className="font-semibold text-white light:text-black">{e.cantidad}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Presupuestos del período */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Presupuestos del período</span>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <CardMetrica titulo="Creados" valor={presupuestosCreados} icono={<FileText size={15} />} />
          <CardMetrica titulo="Tasa de aprobación" valor={tasaAprobacion} formato={(n) => `${Math.round(n)}%`}
            subtitulo={`${presupuestosAprobados} de ${presupuestosCreados} aprobados`} icono={<Percent size={15} />} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CardMetrica titulo="Monto presupuestado" valor={montoPresupuestado} formato={money} icono={<DollarSign size={15} />} />
          <CardMetrica titulo="Monto aprobado" valor={montoAprobado} formato={money} icono={<DollarSign size={15} />} />
        </div>
      </div>

      {/* Detalle de OTs del período */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Detalle de órdenes de trabajo</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">Fecha</th>
              <th className="font-medium px-3 py-2.5">N°</th>
              <th className="font-medium px-3 py-2.5">Cliente</th>
              <th className="font-medium px-3 py-2.5">Estado</th>
              <th className="font-medium px-3 py-2.5 text-right">Monto</th>
            </tr></thead>
            <tbody>
              {!cargando && otsDetalle.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#606060]">Sin órdenes de trabajo en el período</td></tr>
              )}
              {otsDetalle.map(o => (
                <tr key={o.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">{format(new Date(o.fecha), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">#{String(o.numero).padStart(3, '0')}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{o.clienteNombre}</td>
                  <td className="px-3 py-2.5"><EstadoBadgeOT estado={o.estado} /></td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium">{money(o.totalFinal)}</td>
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

export default OTPresupuestos
