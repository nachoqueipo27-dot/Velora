import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useOTStore } from '../../store/otStore'
import type { OrdenTrabajo } from '../../types/ordenesTrabajo'
import { ListadoOTs } from './ListadoOTs'
import { CrearOT } from './CrearOT'
import { DetalleOT } from './DetalleOT'
import { GarantiasActivas } from './GarantiasActivas'
import { PlantillasOT } from './PlantillasOT'
import { ClipboardList, FilePlus, LayoutTemplate, ShieldCheck } from 'lucide-react'

type Seccion = 'listado' | 'crear' | 'plantillas' | 'garantias'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'listado',    label: 'Listado de OTs',    icon: <ClipboardList size={15} /> },
  { id: 'crear',      label: 'Crear OT',          icon: <FilePlus size={15} /> },
  { id: 'plantillas', label: 'Plantillas',        icon: <LayoutTemplate size={15} /> },
  { id: 'garantias',  label: 'Garantías activas', icon: <ShieldCheck size={15} /> },
]

const OrdenesTrabajo = () => {
  const { otActiva, seleccionar, procesarOTsRecurrentes } = useOTStore()
  const [seccion, setSeccion] = useState<Seccion>('listado')

  // Al entrar al módulo, procesar OTs recurrentes vencidas.
  useEffect(() => { procesarOTsRecurrentes() }, [procesarOTsRecurrentes])

  const ver = (ot: OrdenTrabajo) => seleccionar(ot)
  const irA = (id: Seccion) => { seleccionar(null); setSeccion(id) }

  const renderContenido = () => {
    if (otActiva) return <DetalleOT onVolver={() => seleccionar(null)} />
    switch (seccion) {
      case 'listado':    return <ListadoOTs onVer={ver} onNueva={() => setSeccion('crear')} />
      case 'crear':      return <CrearOT onCreada={() => setSeccion('listado')} />
      case 'plantillas': return <PlantillasOT />
      case 'garantias':  return <GarantiasActivas />
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Órdenes de Trabajo</span>
        <nav className="flex flex-col">
          {SUBMENU.map(item => {
            const activo = seccion === item.id && !otActiva
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

export default OrdenesTrabajo
