import { useState } from 'react'
import { cn } from '../../lib/utils'
import { useEmpleadosStore } from '../../store/empleadosStore'
import type { Empleado } from '../../types/empleados'
import { ListadoEmpleados } from './ListadoEmpleados'
import { FichaEmpleado } from './FichaEmpleado'
import { ControlHorario } from './ControlHorario'
import { AusenciasVacaciones } from './AusenciasVacaciones'
import { Users, ClipboardList, BarChart3, Clock, CalendarOff } from 'lucide-react'

type Seccion = 'listado' | 'historial' | 'metricas' | 'horario' | 'ausencias'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'listado',   label: 'Listado de empleados', icon: <Users size={15} /> },
  { id: 'historial', label: 'Historial de OTs',      icon: <ClipboardList size={15} /> },
  { id: 'metricas',  label: 'Métricas de rendimiento', icon: <BarChart3 size={15} /> },
  { id: 'horario',   label: 'Control horario',        icon: <Clock size={15} /> },
  { id: 'ausencias', label: 'Faltas y vacaciones',    icon: <CalendarOff size={15} /> },
]

const Placeholder = ({ icon, titulo }: { icon: React.ReactNode; titulo: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]">{icon}</div>
    <p className="text-sm text-[#A0A0A0] light:text-[#404040]">{titulo}</p>
    <p className="text-[11px] text-[#606060]">Se habilitará al implementar el módulo de OTs (Paso 9).</p>
  </div>
)

const Empleados = () => {
  const { empleadoSeleccionado, seleccionarEmpleado } = useEmpleadosStore()
  const [seccion, setSeccion] = useState<Seccion>('listado')

  const handleVer = (e: Empleado) => {
    seleccionarEmpleado(e)
    setSeccion('listado')
  }

  const irA = (id: Seccion) => {
    if (id === 'listado') seleccionarEmpleado(null)
    setSeccion(id)
  }

  const renderContenido = () => {
    switch (seccion) {
      case 'listado':
        return empleadoSeleccionado
          ? <FichaEmpleado onVolver={() => seleccionarEmpleado(null)} />
          : <ListadoEmpleados onVer={handleVer} />
      case 'horario':
        return <ControlHorario />
      case 'ausencias':
        return <AusenciasVacaciones />
      case 'metricas':
        return <Placeholder icon={<BarChart3 size={20} className="text-[#606060]" />} titulo="Métricas de rendimiento" />
      default:
        return <Placeholder icon={<ClipboardList size={20} className="text-[#606060]" />} titulo="Historial de OTs asignadas" />
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Empleados</span>
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

export default Empleados
