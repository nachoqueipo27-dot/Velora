import { useEffect, useState } from 'react'
import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useReporteVentasStore } from '../../../store/reporteVentasStore'
import { useNegocio } from '../../../hooks/useNegocio'
import { usePDF } from '../../../hooks/usePDF'
import { CardMetrica } from '../../dashboard/components/CardMetrica'
import { Button } from '../../../components/ui/Button'
import { PDFReporteVentas } from '../../../lib/pdf/documentos/PDFReporteVentas'
import type { ProductoTop } from '../../../store/reporteVentasStore'
import { UNIDAD_ABREVIADA } from '../../../types/inventario'
import { DollarSign, ShoppingCart, Receipt, Download, Check } from 'lucide-react'

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

const Ventas = () => {
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const {
    cargando, totalFacturado, cantidadVentas, ticketPromedio,
    topPorCantidad, topPorFacturacion, ventas, totalVentas, cargarReporte, obtenerTodasLasVentas,
  } = useReporteVentasStore()

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

  const totalPaginas = Math.max(1, Math.ceil(totalVentas / PAGE))

  const handleDescargar = async () => {
    const ventasCompletas = await obtenerTodasLasVentas(desde, hasta)
    const r = await descargar(
      <PDFReporteVentas
        negocio={negocio}
        desde={desde} hasta={hasta}
        totalFacturado={totalFacturado} cantidadVentas={cantidadVentas} ticketPromedio={ticketPromedio}
        topPorCantidad={topPorCantidad} topPorFacturacion={topPorFacturacion}
        ventas={ventasCompletas}
        fecha={format(new Date(), 'dd/MM/yyyy HH:mm')}
      />,
      `Reporte-Ventas-${desde}-a-${hasta}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Reporte de ventas</h2>
          <p className="text-[12px] text-[#606060]">Métricas y detalle de ventas del Punto de Venta en el período seleccionado.</p>
        </div>
        <Button onClick={handleDescargar} disabled={generando || cantidadVentas === 0}>
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

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <CardMetrica titulo="Total facturado" valor={totalFacturado} formato={money} icono={<DollarSign size={15} />} />
        <CardMetrica titulo="Ventas realizadas" valor={cantidadVentas} icono={<ShoppingCart size={15} />} />
        <CardMetrica titulo="Ticket promedio" valor={ticketPromedio} formato={money} icono={<Receipt size={15} />} />
      </div>

      {/* Top 5 */}
      <div className="grid grid-cols-2 gap-4">
        <TopTabla titulo="Top 5 — Más vendidos" items={topPorCantidad} valor={i => `${i.cantidad} ${UNIDAD_ABREVIADA[i.unidadMedida]}`} />
        <TopTabla titulo="Top 5 — Mayor facturación" items={topPorFacturacion} valor={i => money(i.facturacion)} />
      </div>

      {/* Detalle */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Detalle de ventas</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">N°</th>
              <th className="font-medium px-3 py-2.5">Fecha</th>
              <th className="font-medium px-3 py-2.5 text-right">Ítems</th>
              <th className="font-medium px-3 py-2.5 text-right">Total</th>
            </tr></thead>
            <tbody>
              {!cargando && ventas.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#606060]">Sin ventas en el período</td></tr>
              )}
              {ventas.map(v => (
                <tr key={v.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">#{String(v.numero).padStart(3, '0')}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(v.fecha), 'dd/MM/yyyy HH:mm')}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{v.cantidadItems}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium">{money(v.totalFinal)}</td>
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

const TopTabla = ({ titulo, items, valor }: {
  titulo: string
  items: ProductoTop[]
  valor: (i: ProductoTop) => string
}) => (
  <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
    <div className="px-3 py-2 border-b border-[#2A2A2A] light:border-[#E4E4E4]">
      <span className="text-[11px] uppercase tracking-wider text-[#606060]">{titulo}</span>
    </div>
    {items.length === 0 ? (
      <p className="text-[12px] text-[#606060] px-3 py-4 text-center">Sin datos en el período</p>
    ) : (
      <table className="w-full text-[13px]">
        <tbody>
          {items.map((it, i) => (
            <tr key={it.productoNombre} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
              <td className="px-3 py-2 text-[#606060] w-6">{i + 1}</td>
              <td className="px-3 py-2 text-white light:text-black truncate">{it.productoNombre}</td>
              <td className="px-3 py-2 text-right text-[#A0A0A0] light:text-[#404040]">{valor(it)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
)

export default Ventas
