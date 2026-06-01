import { useState } from 'react'
import { cn } from '../../lib/utils'
import { GenerarOT } from './GenerarOT'
import { GenerarPresupuesto } from './GenerarPresupuesto'
import { GenerarRemito } from './GenerarRemito'
import { GenerarRecibo } from './GenerarRecibo'
import { ClipboardList, FileText, Truck, Receipt } from 'lucide-react'

type Seccion = 'ot' | 'presupuesto' | 'remito' | 'recibo'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'ot',          label: 'Orden de trabajo', icon: <ClipboardList size={15} /> },
  { id: 'presupuesto', label: 'Presupuesto',      icon: <FileText size={15} /> },
  { id: 'remito',      label: 'Remito de entrega', icon: <Truck size={15} /> },
  { id: 'recibo',      label: 'Recibo de pago',   icon: <Receipt size={15} /> },
]

const Pdfs = () => {
  const [seccion, setSeccion] = useState<Seccion>('ot')

  const renderContenido = () => {
    switch (seccion) {
      case 'ot':          return <GenerarOT />
      case 'presupuesto': return <GenerarPresupuesto />
      case 'remito':      return <GenerarRemito />
      case 'recibo':      return <GenerarRecibo />
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Documentos PDF</span>
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
      <section className="flex-1 overflow-hidden p-6">{renderContenido()}</section>
    </div>
  )
}

export default Pdfs
