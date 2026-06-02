import { useNavigationStore, MODULES } from '../../store/navigationStore'
import { useThemeStore } from '../../store/themeStore'
import { useNegocioStore } from '../../store/negocioStore'
import { useConectividadStore } from '../../store/conectividadStore'
import { useSyncStore } from '../../store/syncStore'
import { useConectividad } from '../../hooks/useConectividad'
import { cn } from '../../lib/utils'
import { VeloraLogo } from '../ui/VeloraLogo'
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Sun, Moon, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Indicador pasivo de conectividad con Supabase. Lee los stores directamente.
const StatusIndicador = () => {
  const { estado: estadoConexion } = useConectividadStore()
  const { pendientes } = useSyncStore()

  const configs = {
    conectado:    { icono: <Wifi size={11} />,      label: 'Online',   color: '#4CAF7D', pulsa: true },
    sin_sync:     { icono: <RefreshCw size={11} />,  label: 'Sin sync', color: '#D4921A', pulsa: false },
    desconectado: { icono: <WifiOff size={11} />,    label: 'Offline',  color: '#C0392B', pulsa: false },
  } as const

  const c = configs[estadoConexion]

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-input border text-[11px] font-medium transition-all duration-300 select-none"
      style={{ color: c.color, backgroundColor: `${c.color}15`, borderColor: `${c.color}30` }}
      title={
        estadoConexion === 'sin_sync'
          ? `${pendientes} cambio${pendientes !== 1 ? 's' : ''} pendiente${pendientes !== 1 ? 's' : ''} de sync`
          : estadoConexion === 'desconectado'
            ? 'Sin conexión con Supabase'
            : 'Conectado a Supabase'
      }
    >
      {/* Punto de estado con animación */}
      <span className="relative flex h-2 w-2 shrink-0">
        {c.pulsa && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ backgroundColor: c.color }}
          />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: c.color }} />
      </span>

      {c.icono}
      <span>{c.label}</span>

      {estadoConexion === 'sin_sync' && pendientes > 0 && (
        <span className="text-[10px] opacity-70">({pendientes})</span>
      )}
    </div>
  )
}

export const Navbar = () => {
  const { activeModule, isDropdownOpen, modulosVisibles, history, setModule, nextModule, prevModule, goBack, toggleDropdown, closeDropdown } = useNavigationStore()
  const { theme, toggleTheme } = useThemeStore()
  const { negocioActivo } = useNegocioStore()

  // Inicia el timer adaptativo de conectividad (el navbar siempre está montado en el Layout).
  useConectividad()

  const modulos = modulosVisibles
    .map(id => MODULES.find(m => m.id === id))
    .filter((m): m is typeof MODULES[number] => !!m)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [displayModule, setDisplayModule] = useState(activeModule)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')

  const handleNext = () => {
    setDirection('right')
    triggerAnimation(() => nextModule())
  }

  const handlePrev = () => {
    setDirection('left')
    triggerAnimation(() => prevModule())
  }

  const handleSelect = (id: typeof activeModule) => {
    const fromIdx = modulos.findIndex(m => m.id === activeModule)
    const toIdx   = modulos.findIndex(m => m.id === id)
    setDirection(toIdx > fromIdx ? 'right' : 'left')
    triggerAnimation(() => setModule(id))
  }

  const triggerAnimation = (cb: () => void) => {
    setAnimating(true)
    setTimeout(() => {
      cb()
      setAnimating(false)
    }, 250)
  }

  useEffect(() => {
    if (!animating) setDisplayModule(activeModule)
  }, [activeModule, animating])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [closeDropdown])

  return (
    <header className={cn(
      'flex flex-col border-b select-none',
      'border-[#2A2A2A] bg-[#0A0A0A]',
      'light:border-[#E4E4E4] light:bg-[#FAFAFA]',
    )}>
      {/* Fila 1 */}
      <div className="flex items-center justify-between px-6 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            disabled={history.length === 0}
            aria-label="Volver a la pantalla anterior"
            title="Atrás"
            className={cn(
              'p-1.5 rounded-input transition-all duration-150',
              history.length === 0
                ? 'text-[#3A3A3A] light:text-[#D0D0D0] cursor-not-allowed'
                : 'text-[#808080] hover:text-white hover:bg-white/10 light:text-[#707070] light:hover:text-black light:hover:bg-black/5',
            )}
          >
            <ArrowLeft size={16} />
          </button>
          <VeloraLogo size={24} variant="auto" />
          <span className="text-sm font-semibold tracking-widest uppercase text-white light:text-black">
            Velora
          </span>
          {negocioActivo && (
            <span className="ml-1 pl-2 border-l border-[#2A2A2A] light:border-[#E4E4E4] text-[10px] text-[#808080] light:text-[#707070] tracking-wide truncate max-w-[140px]">
              {negocioActivo.localNombre}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <StatusIndicador />
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className={cn(
              'p-1.5 rounded-input transition-all duration-150',
              'text-[#808080] hover:text-white hover:bg-white/10',
              'light:text-[#707070] light:hover:text-black light:hover:bg-black/5',
            )}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      {/* Fila 2 — navegación */}
      <div className="relative flex flex-col items-center pb-3" ref={dropdownRef}>
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrev}
            aria-label="Módulo anterior"
            className={cn(
              'p-1.5 rounded-input transition-all duration-150',
              'text-[#808080] hover:text-white hover:bg-white/10 hover:scale-110',
              'light:text-[#707070] light:hover:text-black light:hover:bg-black/5',
            )}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Nombre del módulo — botón que despliega el menú */}
          <button
            onClick={toggleDropdown}
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
            className="w-48 overflow-hidden rounded-input"
          >
            <div
              className={cn(
                'text-sm font-semibold text-center transition-all',
                'text-white light:text-black',
                animating && direction === 'right' && 'animate-slide-out-left',
                animating && direction === 'left'  && 'animate-slide-out-right',
                !animating && 'animate-slide-in',
              )}
            >
              {MODULES.find(m => m.id === displayModule)?.label}
            </div>
          </button>

          <button
            onClick={handleNext}
            aria-label="Módulo siguiente"
            className={cn(
              'p-1.5 rounded-input transition-all duration-150',
              'text-[#808080] hover:text-white hover:bg-white/10 hover:scale-110',
              'light:text-[#707070] light:hover:text-black light:hover:bg-black/5',
            )}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Flecha abajo — indicador visual del estado del menú (el trigger es el título) */}
        <span
          aria-hidden="true"
          className={cn(
            'mt-1 p-1 transition-colors duration-150',
            isDropdownOpen ? 'text-white light:text-black' : 'text-[#808080] light:text-[#707070]',
          )}
        >
          {isDropdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className={cn(
            'absolute top-full mt-1 w-56 z-50 rounded-card border shadow-lg overflow-hidden',
            'border-[#2A2A2A] bg-[#141414]',
            'light:border-[#E4E4E4] light:bg-white',
            'animate-fade-slide-down',
          )}>
            {modulos.map((mod, idx) => (
              <button
                key={mod.id}
                onClick={() => handleSelect(mod.id)}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm transition-all duration-120',
                  'text-[#A0A0A0] hover:text-white hover:bg-white/[0.06]',
                  'light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.04]',
                  activeModule === mod.id && [
                    'border-l-2 border-white text-white pl-[14px]',
                    'light:border-black light:text-black',
                  ]
                )}
              >
                <span className="text-[11px] text-[#606060] mr-2">{idx + 1}</span>
                {mod.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
