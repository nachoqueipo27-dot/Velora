import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useListaPreciosStore } from '../../store/listaPreciosStore'
import { Search, FileSpreadsheet, Tag } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const margenPct = (costo: number, venta: number) => (costo > 0 ? ((venta - costo) / costo) * 100 : 0)

export const PreciosActuales = () => {
  const { items, loading, cargarItems, editarPrecioIndividual } = useListaPreciosStore()
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState('Todas')
  const [editId, setEditId] = useState<number | null>(null)
  const [editValor, setEditValor] = useState('')
  const [flashId, setFlashId] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { cargarItems() }, [cargarItems])
  useEffect(() => { if (editId !== null) inputRef.current?.focus() }, [editId])

  const categorias = useMemo(() => Array.from(new Set(items.map(i => i.categoria).filter(Boolean))), [items])
  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items.filter(i =>
      (filtroCat === 'Todas' || i.categoria === filtroCat) &&
      (q === '' || i.nombre.toLowerCase().includes(q))
    )
  }, [items, busqueda, filtroCat])

  const abrirEdicion = (productoId: number, precio: number) => {
    setEditId(productoId)
    setEditValor(String(precio))
  }

  const confirmarEdicion = async (productoId: number) => {
    const nuevo = Number(editValor)
    setEditId(null)
    if (!isNaN(nuevo) && nuevo > 0) {
      await editarPrecioIndividual(productoId, nuevo)
      setFlashId(productoId)
      setTimeout(() => setFlashId(null), 800)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input className={cn('w-full pl-9 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none',
            'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
            'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')}
            placeholder="Buscar por nombre..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="w-44"><Select value={filtroCat} onChange={e => setFiltroCat(e.target.value)}>
          <option value="Todas" className="bg-[#141414] light:bg-white">Todas las categorías</option>
          {categorias.map(c => <option key={c} value={c} className="bg-[#141414] light:bg-white">{c}</option>)}
        </Select></div>
        <div className="flex-1" />
        <Button size="sm" variant="secondary" onClick={() => console.log('Exportar precios:', filtrados)}>
          <FileSpreadsheet size={14} className="mr-1.5" /> Excel
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex flex-col gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-input animate-shimmer" />)}</div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><Tag size={20} className="text-[#606060]" /></div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">No hay productos que coincidan</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
              <th className="text-left font-medium px-3 py-2">Producto</th>
              <th className="text-left font-medium px-3 py-2">Categoría</th>
              <th className="text-left font-medium px-3 py-2">Tipo</th>
              <th className="text-right font-medium px-3 py-2">Costo</th>
              <th className="text-right font-medium px-3 py-2">Precio actual</th>
              <th className="text-right font-medium px-3 py-2">Margen %</th>
            </tr></thead>
            <tbody>
              {filtrados.map(i => {
                const m = margenPct(i.precioCosto, i.precioActual)
                const negativo = m <= 0
                return (
                  <tr key={i.productoId} className={cn('border-t transition-colors duration-700',
                    'border-[#2A2A2A] light:border-[#E4E4E4]',
                    negativo && 'bg-[#C0392B]/10',
                    flashId === i.productoId && 'bg-[#4CAF7D]/25')}>
                    <td className="px-3 py-2.5 font-medium text-white light:text-black">{i.nombre}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{i.categoria || '—'}</td>
                    <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{i.tipo === 'conjunto' ? 'Conjunto' : 'Simple'}</td>
                    <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(i.precioCosto)}</td>
                    <td className="px-3 py-2.5 text-right">
                      {editId === i.productoId ? (
                        <input
                          ref={inputRef}
                          type="number"
                          value={editValor}
                          onChange={e => setEditValor(e.target.value)}
                          onBlur={() => confirmarEdicion(i.productoId)}
                          onKeyDown={e => { if (e.key === 'Enter') confirmarEdicion(i.productoId); if (e.key === 'Escape') setEditId(null) }}
                          className="w-24 px-2 py-1 text-sm text-right rounded-input border bg-transparent outline-none border-white text-white light:border-black light:text-black"
                        />
                      ) : (
                        <button onClick={() => abrirEdicion(i.productoId, i.precioActual)}
                          className="text-white light:text-black hover:underline decoration-dotted underline-offset-2">
                          {money(i.precioActual)}
                        </button>
                      )}
                    </td>
                    <td className={cn('px-3 py-2.5 text-right font-medium', negativo ? 'text-[#C0392B]' : 'text-[#4CAF7D]')}>{m.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
