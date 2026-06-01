import { useState } from 'react'
import { cn } from '../../lib/utils'
import { UsoDashboard } from './contenido/UsoDashboard'
import { UsoClientes } from './contenido/UsoClientes'
import { UsoEmpleados } from './contenido/UsoEmpleados'
import { UsoInventario } from './contenido/UsoInventario'
import { UsoProveedores } from './contenido/UsoProveedores'
import { UsoListaPrecios } from './contenido/UsoListaPrecios'
import { UsoPresupuestos } from './contenido/UsoPresupuestos'
import { UsoOrdenesTrabajo } from './contenido/UsoOrdenesTrabajo'
import { UsoAgenda } from './contenido/UsoAgenda'
import { UsoPuntoVenta } from './contenido/UsoPuntoVenta'
import { UsoCajaDiaria } from './contenido/UsoCajaDiaria'
import { UsoPDFs } from './contenido/UsoPDFs'
import { UsoConfiguracion } from './contenido/UsoConfiguracion'
import {
  LayoutDashboard, Users, UserCog, Package, Truck, Tags, FileText,
  ClipboardList, CalendarDays, ShoppingCart, Wallet, FileDown, Settings,
} from 'lucide-react'

type Seccion =
  | 'dashboard' | 'clientes' | 'empleados' | 'inventario' | 'proveedores' | 'lista-precios'
  | 'presupuestos' | 'ordenes-trabajo' | 'agenda' | 'punto-venta' | 'caja-diaria' | 'pdfs' | 'configuracion'

const MENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',       label: 'Dashboard',          icon: <LayoutDashboard size={15} /> },
  { id: 'clientes',        label: 'Clientes',           icon: <Users size={15} /> },
  { id: 'empleados',       label: 'Empleados',          icon: <UserCog size={15} /> },
  { id: 'inventario',      label: 'Inventario',         icon: <Package size={15} /> },
  { id: 'proveedores',     label: 'Proveedores',        icon: <Truck size={15} /> },
  { id: 'lista-precios',   label: 'Lista de Precios',   icon: <Tags size={15} /> },
  { id: 'presupuestos',    label: 'Presupuestos',       icon: <FileText size={15} /> },
  { id: 'ordenes-trabajo', label: 'Órdenes de Trabajo', icon: <ClipboardList size={15} /> },
  { id: 'agenda',          label: 'Agenda',             icon: <CalendarDays size={15} /> },
  { id: 'punto-venta',     label: 'Punto de Venta',     icon: <ShoppingCart size={15} /> },
  { id: 'caja-diaria',     label: 'Caja Diaria',        icon: <Wallet size={15} /> },
  { id: 'pdfs',            label: 'PDFs',               icon: <FileDown size={15} /> },
  { id: 'configuracion',   label: 'Configuración',      icon: <Settings size={15} /> },
]

const CONTENIDO: Record<Seccion, React.ReactNode> = {
  'dashboard': <UsoDashboard />,
  'clientes': <UsoClientes />,
  'empleados': <UsoEmpleados />,
  'inventario': <UsoInventario />,
  'proveedores': <UsoProveedores />,
  'lista-precios': <UsoListaPrecios />,
  'presupuestos': <UsoPresupuestos />,
  'ordenes-trabajo': <UsoOrdenesTrabajo />,
  'agenda': <UsoAgenda />,
  'punto-venta': <UsoPuntoVenta />,
  'caja-diaria': <UsoCajaDiaria />,
  'pdfs': <UsoPDFs />,
  'configuracion': <UsoConfiguracion />,
}

const Uso = () => {
  const [seccion, setSeccion] = useState<Seccion>('dashboard')
  const activo = MENU.find(m => m.id === seccion)!

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-56 shrink-0 border-r flex flex-col py-4 overflow-y-auto', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#808080]">Guía de uso</span>
        <span className="px-4 mb-3 text-[11px] text-[#707070] leading-snug">Cómo usar cada módulo de Velora</span>
        <nav className="flex flex-col">
          {MENU.map(item => {
            const sel = seccion === item.id
            return (
              <button key={item.id} onClick={() => setSeccion(item.id)}
                className={cn('flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-all duration-150',
                  sel
                    ? 'border-l-2 border-white text-white pl-[14px] bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                    : 'border-l-2 border-transparent text-[#A0A0A0] hover:text-white hover:bg-white/[0.03] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.02]')}>
                {item.icon}<span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <section className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="text-[#6FA8D0]">{activo.icon}</span>
          <h2 className="text-[22px] font-bold text-white light:text-black">{activo.label}</h2>
        </div>
        {/* key fuerza el remonte → fade-in al cambiar de módulo */}
        <div key={seccion} className="animate-fade-slide-down">
          {CONTENIDO[seccion]}
        </div>
      </section>
    </div>
  )
}

export default Uso
