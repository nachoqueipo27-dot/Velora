import { useState } from 'react'
import { cn } from '../../lib/utils'
import { useProveedoresStore } from '../../store/proveedoresStore'
import type { OrdenCompra } from '../../types/proveedores'
import { ListadoProveedores } from './ListadoProveedores'
import { OrdenesCompra } from './OrdenesCompra'
import { RecepcionMercaderia } from './RecepcionMercaderia'
import { Truck, FileText, PackageCheck } from 'lucide-react'

type Seccion = 'registro' | 'ordenes' | 'recepcion'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'registro',  label: 'Registro de proveedores', icon: <Truck size={15} /> },
  { id: 'ordenes',   label: 'Órdenes de compra',       icon: <FileText size={15} /> },
  { id: 'recepcion', label: 'Recepción de mercadería', icon: <PackageCheck size={15} /> },
]

const Proveedores = () => {
  const { seleccionarOrden, ordenSeleccionada } = useProveedoresStore()
  const [seccion, setSeccion] = useState<Seccion>('registro')

  const verDetalle = (o: OrdenCompra) => {
    seleccionarOrden(o)
    setSeccion('recepcion')
  }

  const irA = (id: Seccion) => {
    if (id !== 'recepcion') seleccionarOrden(null)
    setSeccion(id)
  }

  const renderContenido = () => {
    switch (seccion) {
      case 'registro': return <ListadoProveedores />
      case 'ordenes':  return <OrdenesCompra onVerDetalle={verDetalle} />
      case 'recepcion':
        return ordenSeleccionada
          ? <RecepcionMercaderia onVolver={() => { seleccionarOrden(null); setSeccion('ordenes') }} />
          : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><PackageCheck size={20} className="text-[#606060]" /></div>
              <p className="text-sm text-[#A0A0A0] light:text-[#404040]">Seleccioná una orden para ver su detalle</p>
              <p className="text-[11px] text-[#606060]">Desde "Órdenes de compra", abrí el detalle de una orden.</p>
            </div>
          )
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Proveedores</span>
        <nav className="flex flex-col">
          {SUBMENU.map(item => {
            const activo = seccion === item.id
            return (
              <button key={item.id} onClick={() => irA(item.id)}
                className={cn('flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-all duration-150',
                  activo
                    ? 'border-l-2 border-white text-white pl-[14px] bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                    : 'border-l-2 border-transparent text-[#A0A0A0] hover:text-white hover:bg-white/[0.03] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.02]')}>
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

export default Proveedores
