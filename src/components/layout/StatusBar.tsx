import { useEffect } from 'react'
import { useSessionStore } from '../../store/sessionStore'
import { useNavigationStore, MODULES } from '../../store/navigationStore'
import { useNegocioStore } from '../../store/negocioStore'
import { useSyncStore } from '../../store/syncStore'
import { cn } from '../../lib/utils'
import { realizarBackup } from '../../lib/backup'
import { toast } from '../../store/toastStore'
import { VeloraLogo } from '../ui/VeloraLogo'
import { Save, LogOut, Building2, RefreshCw, CloudOff, Cloud } from 'lucide-react'

export const StatusBar = () => {
  const { usuario, cerrarSesion } = useSessionStore()
  const { activeModule } = useNavigationStore()
  const { negocioActivo, limpiarNegocio } = useNegocioStore()
  const { estado, pendientes, sincronizar, actualizarPendientes, iniciarHeartbeatPeriodico } = useSyncStore()

  useEffect(() => {
    actualizarPendientes()
    const stopHeartbeat = iniciarHeartbeatPeriodico()
    return stopHeartbeat
  }, [actualizarPendientes, iniciarHeartbeatPeriodico])

  const activeIndex = MODULES.findIndex(m => m.id === activeModule) + 1
  const iniciales = usuario?.nombre
    ? usuario.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'VL'

  const handleBackup = async () => {
    const ok = await realizarBackup('manual')
    if (ok) toast.success('Backup creado correctamente')
    else toast.info('Backup cancelado')
  }

  return (
    <footer className={cn(
      'flex items-center justify-between px-4 py-1.5 border-t',
      'border-[#2A2A2A] bg-[#0A0A0A]',
      'light:border-[#E4E4E4] light:bg-[#FAFAFA]',
    )}>
      {/* Izquierda — usuario */}
      <div className="flex items-center gap-2">
        {/* Avatar */}
        <div className="relative">
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center',
            'text-[10px] font-semibold',
            'bg-[#2A2A2A] text-[#A0A0A0]',
            'light:bg-[#E4E4E4] light:text-[#404040]',
          )}>
            {iniciales}
          </div>
          {/* Punto verde online */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#4CAF7D] border border-[#0A0A0A] light:border-[#FAFAFA]" />
        </div>

        {usuario ? (
          <span className={cn(
            'text-[11px] font-medium',
            'text-[#808080]',
            'light:text-[#707070]',
          )}>
            {usuario.nombre} — {usuario.rol}
          </span>
        ) : (
          <VeloraLogo size={16} variant="auto" />
        )}

        <button
          onClick={() => cerrarSesion()}
          className={cn(
            'p-1 rounded-input transition-all duration-150',
            'text-[#808080] hover:text-[#C0392B] hover:bg-[#C0392B]/10',
            'light:text-[#707070] light:hover:text-[#C0392B]',
          )}
          title="Cerrar sesión"
        >
          <LogOut size={12} />
        </button>
      </div>

      {/* Derecha — negocio, backup y posición */}
      <div className="flex items-center gap-3">
        {negocioActivo && (
          <button
            onClick={() => { cerrarSesion(); limpiarNegocio() }}
            title="Cambiar de negocio"
            className={cn(
              'flex items-center gap-1.5 text-[11px] transition-all duration-150',
              'text-[#808080] hover:text-white',
              'light:text-[#707070] light:hover:text-black',
            )}
          >
            <Building2 size={12} />
            <span className="truncate max-w-[140px]">{negocioActivo.empresaNombre}</span>
          </button>
        )}

        <button
          onClick={handleBackup}
          className={cn(
            'flex items-center gap-1.5 text-[11px] transition-all duration-150',
            'text-[#808080] hover:text-white',
            'light:text-[#707070] light:hover:text-black',
          )}
          title="Backup inmediato"
        >
          <Save size={12} />
          <span>Backup</span>
        </button>

        {/* Indicador de sincronización */}
        <button
          onClick={sincronizar}
          disabled={estado.enCurso}
          title={estado.enCurso ? 'Sincronizando...' : pendientes > 0 ? `${pendientes} cambios pendientes` : 'Todo sincronizado'}
          className={cn(
            'flex items-center gap-1 text-[11px] transition-all duration-150',
            estado.enCurso
              ? 'text-[#D4921A]'
              : pendientes > 0
                ? 'text-[#D4921A] hover:text-white light:hover:text-black'
                : 'text-[#4CAF7D]',
          )}
        >
          {estado.enCurso
            ? <RefreshCw size={11} className="animate-spin" />
            : pendientes > 0 ? <CloudOff size={11} /> : <Cloud size={11} />}
          <span>{estado.enCurso ? 'Sync...' : pendientes > 0 ? `${pendientes} pend.` : 'Sync OK'}</span>
        </button>

        <span className={cn(
          'text-[11px]',
          'text-[#808080]',
          'light:text-[#707070]',
        )}>
          {activeIndex} / {MODULES.length}
        </span>
      </div>
    </footer>
  )
}
