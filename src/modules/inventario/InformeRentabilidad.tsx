import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useInventarioStore } from '../../store/inventarioStore'
import { FileSpreadsheet, ArrowUpDown, BarChart3 } from 'lucide-react'

type Col = 'productoNombre' | 'categoria' | 'precioCosto' | 'precioVenta' | 'margenUnitario' | 'margenPorcentaje' | 'unidadesVendidas' | 'margenAcumulado'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const InformeRentabilidad = () => {
  const { informe, categorias, cargarInformeRentabilidad } = useInventarioStore()
  const [filtroCat, setFiltroCat] = useState('Todas')
  const [orden, setOrden] = useState<{ col: Col; dir: 'asc' | 'desc' }>({ col: 'margenAcumulado', dir: 'desc' })

  useEffect(() => { cargarInformeRentabilidad() }, [cargarInformeRentabilidad])

  const filas = useMemo(() => {
    let arr = informe.filter(f => filtroCat === 'Todas' || f.categoria === filtroCat)
    arr = [...arr].sort((a, b) => {
      const va = a[orden.col], vb = b[orden.col]
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
      return orden.dir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [informe, filtroCat, orden])

  const totales = useMemo(() => ({
    unidades: filas.reduce((s, f) => s + f.unidadesVendidas, 0),
    margen: filas.reduce((s, f) => s + f.margenAcumulado, 0),
  }), [filas])

  const sort = (col: Col) => setOrden(o => o.col === col ? { col, dir: o.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' })

  const Th = ({ col, label, align = 'left' }: { col: Col; label: string; align?: 'left' | 'right' }) => (
    <th className={cn('font-medium px-3 py-2 cursor-pointer select-none', align === 'right' ? 'text-right' : 'text-left')} onClick={() => sort(col)}>
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        {label}<ArrowUpDown size={10} className={cn(orden.col === col ? 'text-white light:text-black' : 'text-[#606060]')} />
      </span>
    </th>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="w-48">
          <Select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
            <option value="Todas" className="bg-[#141414] light:bg-white">Todas las categorías</option>
            {categorias.map(c => <option key={c.id} value={c.nombre} className="bg-[#141414] light:bg-white">{c.nombre}</option>)}
          </Select>
        </div>
        <Button size="sm" variant="secondary" onClick={() => console.log('Exportar rentabilidad:', filas)}>
          <FileSpreadsheet size={14} className="mr-1.5" /> Excel
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><BarChart3 size={20} className="text-[#606060]" /></div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">Sin datos de rentabilidad</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                <Th col="productoNombre" label="Producto" />
                <Th col="categoria" label="Categoría" />
                <Th col="precioCosto" label="Costo" align="right" />
                <Th col="precioVenta" label="Venta" align="right" />
                <Th col="margenUnitario" label="Margen $" align="right" />
                <Th col="margenPorcentaje" label="Margen %" align="right" />
                <Th col="unidadesVendidas" label="Unid." align="right" />
                <Th col="margenAcumulado" label="Margen acum." align="right" />
              </tr>
            </thead>
            <tbody>
              {filas.map(f => (
                <tr key={f.productoId} className={cn('border-t border-[#2A2A2A] light:border-[#E4E4E4]', f.margenUnitario < 0 && 'bg-[#C0392B]/10')}>
                  <td className="px-3 py-2.5 text-white light:text-black font-medium">{f.productoNombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{f.categoria || '—'}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(f.precioCosto)}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(f.precioVenta)}</td>
                  <td className={cn('px-3 py-2.5 text-right font-medium', f.margenUnitario < 0 ? 'text-[#C0392B]' : 'text-[#4CAF7D]')}>{money(f.margenUnitario)}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{f.margenPorcentaje.toFixed(0)}%</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{f.unidadesVendidas}</td>
                  <td className={cn('px-3 py-2.5 text-right font-medium', f.margenAcumulado < 0 ? 'text-[#C0392B]' : 'text-white light:text-black')}>{money(f.margenAcumulado)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#2A2A2A] light:border-[#E4E4E4]">
                <td className="px-3 py-2.5 font-semibold text-white light:text-black" colSpan={6}>Totales</td>
                <td className="px-3 py-2.5 text-right font-semibold text-white light:text-black">{totales.unidades}</td>
                <td className="px-3 py-2.5 text-right font-semibold text-white light:text-black">{money(totales.margen)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
