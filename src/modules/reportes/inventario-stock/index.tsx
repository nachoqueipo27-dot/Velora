import { useEffect, useState } from 'react'
import { format, startOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useReporteInventarioStore } from '../../../store/reporteInventarioStore'
import { useNegocio } from '../../../hooks/useNegocio'
import { usePDF } from '../../../hooks/usePDF'
import { CardMetrica } from '../../dashboard/components/CardMetrica'
import { Button } from '../../../components/ui/Button'
import { PDFReporteInventario } from '../../../lib/pdf/documentos/PDFReporteInventario'
import { UNIDADES_MEDIDA } from '../../../types/inventario'
import { PackageX, DollarSign, Clock, PackagePlus, PackageMinus, Download, Check } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const hoyStr = () => format(new Date(), 'yyyy-MM-dd')

const TIPO_LABEL: Record<string, string> = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' }
const LABEL_UNIDAD: Record<string, string> = Object.fromEntries(UNIDADES_MEDIDA.map(u => [u.value, u.label]))

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

const InventarioStock = () => {
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const {
    cargando, productosStockCritico, valorizacionInventario, productosStockEstancado,
    movimientosEntrada, movimientosSalida, movimientos, totalMovimientos,
    cargarReporte, obtenerTodosLosMovimientos,
  } = useReporteInventarioStore()

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

  const totalPaginas = Math.max(1, Math.ceil(totalMovimientos / PAGE))

  const handleDescargar = async () => {
    const movimientosCompletos = await obtenerTodosLosMovimientos(desde, hasta)
    const r = await descargar(
      <PDFReporteInventario
        negocio={negocio}
        desde={desde} hasta={hasta}
        productosStockCritico={productosStockCritico}
        valorizacionInventario={valorizacionInventario}
        productosStockEstancado={productosStockEstancado}
        movimientosEntrada={movimientosEntrada}
        movimientosSalida={movimientosSalida}
        movimientos={movimientosCompletos}
        fecha={format(new Date(), 'dd/MM/yyyy HH:mm')}
      />,
      `Reporte-Inventario-Stock-${desde}-a-${hasta}.pdf`,
    )
    if (r) { setOk(true); setTimeout(() => setOk(false), 2500) }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Inventario y stock</h2>
          <p className="text-[12px] text-[#606060]">Estado actual del inventario y movimientos de stock del período seleccionado.</p>
        </div>
        <Button onClick={handleDescargar} disabled={generando}>
          {ok ? <><Check size={15} className="mr-1.5" />Descargado</> : <><Download size={15} className="mr-1.5" />{generando ? 'Generando...' : 'Descargar PDF'}</>}
        </Button>
      </header>

      {/* Estado actual — foto de ahora mismo, sin filtro de fecha */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Estado actual</span>
        <div className="grid grid-cols-3 gap-3">
          <CardMetrica titulo="Stock crítico" valor={productosStockCritico} subtitulo="bajo el mínimo"
            color={productosStockCritico > 0 ? 'error' : 'default'} icono={<PackageX size={15} />} />
          <CardMetrica titulo="Valorización" valor={valorizacionInventario} formato={money} subtitulo="a precio de costo"
            icono={<DollarSign size={15} />} />
          <CardMetrica titulo="Stock estancado" valor={productosStockEstancado} subtitulo="sin movimiento en 90 días"
            color={productosStockEstancado > 0 ? 'warning' : 'default'} icono={<Clock size={15} />} />
        </div>
      </div>

      {/* Rango de fechas — aplica a los movimientos, no al estado actual */}
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

      {/* Movimientos del período */}
      <div>
        <span className="text-[11px] uppercase tracking-wider text-[#606060] mb-2 block">Movimientos del período</span>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <CardMetrica titulo="Entradas" valor={movimientosEntrada} icono={<PackagePlus size={15} />} />
          <CardMetrica titulo="Salidas" valor={movimientosSalida} icono={<PackageMinus size={15} />} />
        </div>
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-3 py-2.5">Fecha</th>
              <th className="font-medium px-3 py-2.5">Producto</th>
              <th className="font-medium px-3 py-2.5">Tipo</th>
              <th className="font-medium px-3 py-2.5 text-right">Cantidad</th>
              <th className="font-medium px-3 py-2.5">Motivo</th>
            </tr></thead>
            <tbody>
              {!cargando && movimientos.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#606060]">Sin movimientos en el período</td></tr>
              )}
              {movimientos.map(m => (
                <tr key={m.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-3 py-2.5 text-white light:text-black">{format(new Date(m.fecha), 'dd/MM/yyyy')}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{m.productoNombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                  <td className="px-3 py-2.5 text-right text-white light:text-black font-medium">{m.cantidad} {LABEL_UNIDAD[m.unidadMedida] ?? ''}</td>
                  <td className="px-3 py-2.5 text-[#606060] truncate max-w-[200px]">{m.motivo ?? '—'}</td>
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

export default InventarioStock
