import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useCajaStore } from '../../store/cajaStore'
import { RegistroCobros } from './RegistroCobros'
import { GastosOperativos } from './GastosOperativos'
import { CierreCaja } from './CierreCaja'
import { CierreMes } from './CierreMes'
import { Historial } from './Historial'
import { Receipt, TrendingDown, Lock, CalendarCheck, History } from 'lucide-react'

type Seccion = 'cobros' | 'gastos' | 'cierre' | 'mes' | 'historial'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'cobros',    label: 'Registro de cobros', icon: <Receipt size={15} /> },
  { id: 'gastos',    label: 'Gastos operativos',  icon: <TrendingDown size={15} /> },
  { id: 'cierre',    label: 'Cierre de caja',     icon: <Lock size={15} /> },
  { id: 'mes',       label: 'Cierre de mes',      icon: <CalendarCheck size={15} /> },
  { id: 'historial', label: 'Historial',          icon: <History size={15} /> },
]

const CajaDiaria = () => {
  const { cargarCajaHoy } = useCajaStore()
  const [seccion, setSeccion] = useState<Seccion>('cobros')

  useEffect(() => { cargarCajaHoy() }, [cargarCajaHoy])

  const renderContenido = () => {
    switch (seccion) {
      case 'cobros':    return <RegistroCobros />
      case 'gastos':    return <GastosOperativos />
      case 'cierre':    return <CierreCaja />
      case 'mes':       return <CierreMes />
      case 'historial': return <Historial />
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Caja diaria</span>
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

export default CajaDiaria
