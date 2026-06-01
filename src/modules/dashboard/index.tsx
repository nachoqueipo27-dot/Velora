import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useDashboardStore } from '../../store/dashboardStore'
import { VistaGeneral } from './VistaGeneral'
import { EstadoSalud } from './EstadoSalud'
import { LayoutDashboard, Activity, RefreshCw } from 'lucide-react'

type Tab = 'general' | 'salud'

const Dashboard = () => {
  const { cargarDashboard, loading } = useDashboardStore()
  const [tab, setTab] = useState<Tab>('general')

  // Carga automática al montar (respeta caché < 5 min internamente).
  useEffect(() => { cargarDashboard() }, [cargarDashboard])

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      {/* Tabs propios */}
      <div className="flex items-center justify-between mb-5 shrink-0">
        <div className="flex gap-1">
          {([['general', 'Vista general', <LayoutDashboard size={14} key="g" />], ['salud', 'Estado de salud', <Activity size={14} key="s" />]] as const).map(([id, label, icon]) => (
            <button key={id} onClick={() => setTab(id as Tab)}
              className={cn('flex items-center gap-2 px-4 py-2 text-[13px] rounded-input transition-all',
                tab === id
                  ? 'bg-white text-black light:bg-black light:text-white'
                  : 'text-[#A0A0A0] hover:text-white hover:bg-white/[0.04] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.03]')}>
              {icon}{label}
            </button>
          ))}
        </div>
        <button onClick={() => cargarDashboard(true)} disabled={loading}
          className="flex items-center gap-1.5 text-[12px] text-[#606060] hover:text-white light:hover:text-black transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'general' ? <VistaGeneral /> : <EstadoSalud />}
      </div>
    </div>
  )
}

export default Dashboard
