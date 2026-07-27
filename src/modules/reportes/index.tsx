import { useState } from 'react'
import { cn } from '../../lib/utils'
import Ventas from './ventas'
import CajaFinanzas from './caja-finanzas'
import InventarioStock from './inventario-stock'
import OTPresupuestos from './ot-presupuestos'
import RecursosHumanos from './recursos-humanos'
import { TrendingUp, Wallet, Boxes, ClipboardList, Users } from 'lucide-react'

type Seccion = 'ventas' | 'caja-finanzas' | 'inventario-stock' | 'ot-presupuestos' | 'recursos-humanos'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'ventas', label: 'Ventas', icon: <TrendingUp size={15} /> },
  { id: 'caja-finanzas', label: 'Caja y Finanzas', icon: <Wallet size={15} /> },
  { id: 'inventario-stock', label: 'Inventario y Stock', icon: <Boxes size={15} /> },
  { id: 'ot-presupuestos', label: 'OT y Presupuestos', icon: <ClipboardList size={15} /> },
  { id: 'recursos-humanos', label: 'Recursos Humanos', icon: <Users size={15} /> },
]

const Reportes = () => {
  const [seccion, setSeccion] = useState<Seccion>('ventas')

  const renderContenido = () => {
    switch (seccion) {
      case 'ventas': return <Ventas />
      case 'caja-finanzas': return <CajaFinanzas />
      case 'inventario-stock': return <InventarioStock />
      case 'ot-presupuestos': return <OTPresupuestos />
      case 'recursos-humanos': return <RecursosHumanos />
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Reportes</span>
        <nav className="flex flex-col">
          {SUBMENU.map(item => {
            const activo = seccion === item.id
            return (
              <button key={item.id} onClick={() => setSeccion(item.id)}
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
      <section className="flex-1 overflow-y-auto p-6">{renderContenido()}</section>
    </div>
  )
}

export default Reportes
