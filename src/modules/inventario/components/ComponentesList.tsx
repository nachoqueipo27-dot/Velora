import { useMemo, useState } from 'react'
import { cn } from '../../../lib/utils'
import { permiteDecimales, type Producto } from '../../../types/inventario'
import type { ComponenteInput } from '../../../store/inventarioStore'
import { Search, Plus, Minus, X, AlertTriangle } from 'lucide-react'

interface ComponentesListProps {
  productosSimples: Producto[]
  value: ComponenteInput[]
  onChange: (next: ComponenteInput[]) => void
}

export const ComponentesList = ({ productosSimples, value, onChange }: ComponentesListProps) => {
  const [busqueda, setBusqueda] = useState('')

  const prodById = useMemo(() => {
    const m = new Map<number, Producto>()
    productosSimples.forEach(p => m.set(p.id, p))
    return m
  }, [productosSimples])

  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const yaAgregados = new Set(value.map(v => v.componenteId))
    return productosSimples
      .filter(p => !yaAgregados.has(p.id) && (q === '' || p.nombre.toLowerCase().includes(q)))
      .slice(0, 6)
  }, [productosSimples, value, busqueda])

  const agregar = (id: number) => {
    onChange([...value, { componenteId: id, cantidad: 1 }])
    setBusqueda('')
  }
  const quitar = (id: number) => onChange(value.filter(v => v.componenteId !== id))
  // El mínimo y el redondeo dependen de la unidad de medida del componente: si no admite
  // decimales (Unidad/Caja) se fuerza a entero, igual que en el formulario de producto.
  const setCant = (id: number, cant: number, permite: boolean) =>
    onChange(value.map(v => (v.componenteId === id
      ? { ...v, cantidad: permite ? Math.max(0.01, cant) : Math.max(1, Math.round(cant)) }
      : v)))

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Componentes del conjunto</span>

      {/* Buscador */}
      <div className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606060]" />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar producto simple para agregar..."
          className={cn(
            'w-full pl-8 pr-3 py-1.5 text-[13px] rounded-input border bg-transparent outline-none',
            'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
            'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]',
          )}
        />
        {busqueda && disponibles.length > 0 && (
          <div className={cn('absolute z-10 mt-1 w-full rounded-card border shadow-lg overflow-hidden', 'border-[#2A2A2A] bg-[#1C1C1C] light:border-[#E4E4E4] light:bg-white')}>
            {disponibles.map(p => (
              <button key={p.id} type="button" onClick={() => agregar(p.id)}
                className="w-full text-left px-3 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-white/[0.06] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.04] transition-colors">
                {p.nombre} <span className="text-[11px] text-[#606060]">· stock {p.stock}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista agregados */}
      {value.length === 0 ? (
        <p className="text-[11px] text-[#606060] py-2">Agregá al menos un componente.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {value.map(v => {
            const p = prodById.get(v.componenteId)
            const bajo = p ? p.stock <= p.stockMinimo : false
            const permite = p ? permiteDecimales(p.unidadMedida) : false
            const minCant = permite ? 0.01 : 1
            return (
              <div key={v.componenteId} className={cn('flex items-center gap-2 rounded-input border px-2 py-1.5', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={v.cantidad <= minCant} onClick={() => setCant(v.componenteId, v.cantidad - 1, permite)}
                    className="w-5 h-5 rounded flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-white/10 disabled:opacity-30 light:hover:text-black light:hover:bg-black/5">
                    <Minus size={12} />
                  </button>
                  <input
                    type="number" step={permite ? '0.01' : '1'} min={minCant} value={v.cantidad}
                    onChange={e => setCant(v.componenteId, Number(e.target.value), permite)}
                    className="w-12 text-center text-[13px] bg-transparent outline-none text-white light:text-black"
                  />
                  <button type="button" onClick={() => setCant(v.componenteId, v.cantidad + 1, permite)}
                    className="w-5 h-5 rounded flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5">
                    <Plus size={12} />
                  </button>
                </div>
                <span className="flex-1 text-[13px] text-white light:text-black truncate">{p?.nombre ?? `#${v.componenteId}`}</span>
                {bajo && (
                  <span title="Stock bajo" className="text-[#D4921A]"><AlertTriangle size={13} /></span>
                )}
                <button type="button" onClick={() => quitar(v.componenteId)}
                  className="w-5 h-5 rounded flex items-center justify-center text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10">
                  <X size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
