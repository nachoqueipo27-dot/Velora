import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useInventarioStore } from '../../store/inventarioStore'
import { StockBadge } from './components/StockBadge'
import { FileSpreadsheet, TrendingUp } from 'lucide-react'

type Tab = 'masusados' | 'sinmov' | 'bajomin'

const PERIODOS = [
  { value: 30, label: 'Últimos 30 días' },
  { value: 90, label: 'Últimos 90 días' },
  { value: 0, label: 'Todo el historial' },
]

export const ReporteRotacion = () => {
  const { productos, obtenerSalidasPorProducto } = useInventarioStore()
  const [tab, setTab] = useState<Tab>('masusados')
  const [dias, setDias] = useState(30)
  const [salidas, setSalidas] = useState<Map<number, number>>(new Map())
  const [salidas30, setSalidas30] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    const desde = dias === 0 ? undefined : new Date(Date.now() - dias * 86400000).toISOString()
    obtenerSalidasPorProducto(desde).then(setSalidas)
  }, [dias, obtenerSalidasPorProducto])

  useEffect(() => {
    const desde = new Date(Date.now() - 30 * 86400000).toISOString()
    obtenerSalidasPorProducto(desde).then(setSalidas30)
  }, [obtenerSalidasPorProducto])

  const masUsados = useMemo(() =>
    productos
      .map(p => ({ p, total: salidas.get(p.id) ?? 0 }))
      .filter(x => x.total > 0)
      .sort((a, b) => b.total - a.total),
    [productos, salidas])

  const sinMovimiento = useMemo(() =>
    productos.filter(p => p.tipo === 'simple' && (salidas30.get(p.id) ?? 0) === 0),
    [productos, salidas30])

  const bajoMinimo = useMemo(() =>
    productos.filter(p => p.tipo === 'simple' && p.stock <= p.stockMinimo),
    [productos])

  const exportar = () => console.log('Exportar rotación:', { tab, masUsados, sinMovimiento, bajoMinimo })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
          {([['masusados', 'Más usados'], ['sinmov', 'Sin movimiento'], ['bajomin', 'Bajo mínimo']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('px-3 py-1.5 text-[13px] rounded-[6px] transition-all duration-150',
                tab === id ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040] light:hover:text-black')}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {tab === 'masusados' && (
            <div className="w-40"><Select value={dias} onChange={e => setDias(Number(e.target.value))}>
              {PERIODOS.map(p => <option key={p.value} value={p.value} className="bg-[#141414] light:bg-white">{p.label}</option>)}
            </Select></div>
          )}
          <Button size="sm" variant="secondary" onClick={exportar}><FileSpreadsheet size={14} className="mr-1.5" /> Excel</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'masusados' && (
          masUsados.length === 0 ? <Empty texto="Sin salidas registradas en el período" /> : (
            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                <th className="text-left font-medium px-3 py-2">#</th>
                <th className="text-left font-medium px-3 py-2">Producto</th>
                <th className="text-left font-medium px-3 py-2">Categoría</th>
                <th className="text-right font-medium px-3 py-2">Unidades salidas</th>
              </tr></thead>
              <tbody>
                {masUsados.map((x, i) => (
                  <tr key={x.p.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                    <td className="px-3 py-2.5 text-[#606060]">{i + 1}</td>
                    <td className="px-3 py-2.5 text-white light:text-black font-medium">{x.p.nombre}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{x.p.categoriaNombre || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-[#4CAF7D] font-medium">{x.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'sinmov' && (
          sinMovimiento.length === 0 ? <Empty texto="Todos los productos tuvieron movimiento" /> : (
            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                <th className="text-left font-medium px-3 py-2">Producto</th>
                <th className="text-left font-medium px-3 py-2">Categoría</th>
                <th className="text-right font-medium px-3 py-2">Stock</th>
              </tr></thead>
              <tbody>
                {sinMovimiento.map(p => (
                  <tr key={p.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                    <td className="px-3 py-2.5 text-white light:text-black font-medium">{p.nombre}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{p.categoriaNombre || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'bajomin' && (
          bajoMinimo.length === 0 ? <Empty texto="Ningún producto bajo el mínimo" /> : (
            <table className="w-full text-sm border-collapse">
              <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                <th className="text-left font-medium px-3 py-2">Producto</th>
                <th className="text-right font-medium px-3 py-2">Stock</th>
                <th className="text-right font-medium px-3 py-2">Mínimo</th>
                <th className="text-left font-medium px-3 py-2">Estado</th>
              </tr></thead>
              <tbody>
                {bajoMinimo.map(p => (
                  <tr key={p.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                    <td className="px-3 py-2.5 text-white light:text-black font-medium">{p.nombre}</td>
                    <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{p.stock}</td>
                    <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{p.stockMinimo}</td>
                    <td className="px-3 py-2.5"><StockBadge stock={p.stock} stockMinimo={p.stockMinimo} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}

const Empty = ({ texto }: { texto: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><TrendingUp size={20} className="text-[#606060]" /></div>
    <p className="text-sm text-[#A0A0A0] light:text-[#404040]">{texto}</p>
  </div>
)
