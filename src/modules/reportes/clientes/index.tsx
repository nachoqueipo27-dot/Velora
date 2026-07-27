import { useEffect, useState } from 'react'
import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useReporteClientesStore } from '../../../store/reporteClientesStore'
import { useNegocio } from '../../../hooks/useNegocio'
import { usePDF } from '../../../hooks/usePDF'
import { CardMetrica } from '../../dashboard/components/CardMetrica'
import { Button } from '../../../components/ui/Button'
import { PDFReporteClientes } from '../../../lib/pdf/documentos/PDFReporteClientes'
import { UserPlus, DollarSign, UserX, Download, Check } from 'lucide-react'

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

const Clientes = () => {
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const {
    cargando, clientesNuevos, totalFacturado, ranking, inactivos, clientes, totalClientes,
    cargarReporte, obtenerTodosLosClientes,
  } = useReporteClientesStore()

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

  const totalPaginas = Math.max(1, Math.ceil(totalClientes / PAGE))

  const handleDescargar = async () => {
    const clientesCompletos = await obtenerTodosLosClientes(desde, hasta)
    const r = await descargar(
      <PDFReporteClientes
        negocio={negocio}
        desde={desde} hasta={hasta}
        clientesNuevos={clientesNuevos}
        totalFacturado={totalFacturado}
        ranking={ranking}
        inactivos={inactivos}
        clientes={clientesCompletos}
        fecha={format(new Date(), 'dd/MM/yyyy HH:mm')}
      />,
      `Reporte-Clientes-${desde}-a-${hasta}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Clientes</h2>
          <p className="text-[12px] text-[#606060]">Altas, facturación por cliente e inactividad.</p>
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

      {/* Clientes nuevos + facturación del período */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Clientes nuevos</span>
        <div className="grid grid-cols-2 gap-3">
          <CardMetrica titulo="Altas del período" valor={clientesNuevos} subtitulo="clientes dados de alta" icono={<UserPlus size={15} />} />
          <CardMetrica titulo="Facturado" valor={totalFacturado} formato={money} subtitulo="atribuible a clientes" icono={<DollarSign size={15} />} />
        </div>
      </div>

      {/* Ranking */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Ranking de clientes</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5 w-10">#</th>
              <th className="font-medium px-3 py-2.5">Cliente</th>
              <th className="font-medium px-3 py-2.5 text-right">Operaciones</th>
              <th className="font-medium px-3 py-2.5 text-right">Facturación</th>
            </tr></thead>
            <tbody>
              {!cargando && ranking.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#606060]">Sin facturación en el período</td></tr>
              )}
              {ranking.map((r, i) => (
                <tr key={r.clienteId} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-[#606060] tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2.5 text-white light:text-black">{r.nombre}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040] tabular-nums">{r.operaciones}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium tabular-nums">{money(r.facturacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[#606060] mt-2">
          Incluye OTs finalizadas o entregadas y presupuestos convertidos sin OT asociada. Las ventas de mostrador no se
          pueden atribuir a un cliente porque la tabla no registra cliente.
        </p>
      </div>

      {/* Clientes inactivos */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Clientes inactivos</span>
        <div className="mb-3">
          <CardMetrica titulo="Sin operaciones" valor={inactivos.length} subtitulo="en los últimos 90 días"
            color={inactivos.length > 0 ? 'warning' : 'default'} icono={<UserX size={15} />} />
        </div>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">Cliente</th>
              <th className="font-medium px-3 py-2.5">Teléfono</th>
              <th className="font-medium px-3 py-2.5">Email</th>
              <th className="font-medium px-3 py-2.5">Última operación</th>
            </tr></thead>
            <tbody>
              {!cargando && inactivos.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#606060]">No hay clientes inactivos</td></tr>
              )}
              {inactivos.map(c => (
                <tr key={c.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">{c.nombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{c.telefono ?? '—'}</td>
                  <td className="px-3 py-2.5 text-[#606060] truncate max-w-[200px]">{c.email ?? '—'}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">
                    {c.ultimaOperacion ? format(new Date(c.ultimaOperacion), 'dd/MM/yyyy') : 'Nunca'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle de clientes del período */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Detalle de clientes del período</span>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">Cliente</th>
              <th className="font-medium px-3 py-2.5">Categoría</th>
              <th className="font-medium px-3 py-2.5">Alta</th>
              <th className="font-medium px-3 py-2.5 text-right">Facturación</th>
            </tr></thead>
            <tbody>
              {!cargando && clientes.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[#606060]">Sin clientes en el período</td></tr>
              )}
              {clientes.map(c => (
                <tr key={c.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">{c.nombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{c.categoria ?? '—'}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(c.creadoEn), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium tabular-nums">{money(c.facturacion)}</td>
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

export default Clientes
