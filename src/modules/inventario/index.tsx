import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useInventarioStore } from '../../store/inventarioStore'
import type { Producto } from '../../types/inventario'
import { ListadoProductos } from './ListadoProductos'
import { FichaProducto } from './FichaProducto'
import { ReporteRotacion } from './ReporteRotacion'
import { InformeRentabilidad } from './InformeRentabilidad'
import { Package, Boxes, TrendingUp, BarChart3 } from 'lucide-react'

type Seccion = 'productos' | 'conjuntos' | 'rotacion' | 'rentabilidad'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'productos',    label: 'Productos',              icon: <Package size={15} /> },
  { id: 'conjuntos',    label: 'Conjuntos',              icon: <Boxes size={15} /> },
  { id: 'rotacion',     label: 'Reporte de rotación',    icon: <TrendingUp size={15} /> },
  { id: 'rentabilidad', label: 'Informe de rentabilidad', icon: <BarChart3 size={15} /> },
]

const Inventario = () => {
  const { cargarProductos, cargarCategorias, productoSeleccionado, seleccionarProducto } = useInventarioStore()
  const [seccion, setSeccion] = useState<Seccion>('productos')

  useEffect(() => {
    cargarProductos()
    cargarCategorias()
  }, [cargarProductos, cargarCategorias])

  const verFicha = (p: Producto) => seleccionarProducto(p)

  const irA = (id: Seccion) => {
    seleccionarProducto(null)
    setSeccion(id)
  }

  const renderContenido = () => {
    if ((seccion === 'productos' || seccion === 'conjuntos') && productoSeleccionado) {
      return <FichaProducto onVolver={() => seleccionarProducto(null)} />
    }
    switch (seccion) {
      case 'productos':    return <ListadoProductos tipo="simple" onVer={verFicha} />
      case 'conjuntos':    return <ListadoProductos tipo="conjunto" onVer={verFicha} />
      case 'rotacion':     return <ReporteRotacion />
      case 'rentabilidad': return <InformeRentabilidad />
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Inventario</span>
        <nav className="flex flex-col">
          {SUBMENU.map(item => {
            const activo = seccion === item.id
            return (
              <button key={item.id} onClick={() => irA(item.id)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-all duration-150',
                  activo
                    ? 'border-l-2 border-white text-white pl-[14px] bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                    : 'border-l-2 border-transparent text-[#A0A0A0] hover:text-white hover:bg-white/[0.03] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.02]',
                )}>
                {item.icon}<span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>
      <section className="flex-1 overflow-hidden p-6">{renderContenido()}</section>
    </div>
  )
}

export default Inventario
