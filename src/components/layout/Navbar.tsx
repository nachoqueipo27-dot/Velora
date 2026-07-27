import { useNavigationStore, MODULES, MODULOS_ADMINISTRACION } from '../../store/navigationStore'
import { useThemeStore } from '../../store/themeStore'
import { useOnboardingStore } from '../../store/onboardingStore'
import { cn } from '../../lib/utils'
import { VeloraLogo } from '../ui/VeloraLogo'
import { ArrowLeft, ChevronLeft, ChevronRight, Sun, Moon, Briefcase, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Duración de la transición de apertura/cierre del dropdown.
// Debe coincidir con la clase `duration-200` del panel para que el desmontaje
// ocurra recién cuando terminó la animación de salida.
const DURACION_DROPDOWN = 200

export const Navbar = () => {
  const { activeModule, isDropdownOpen, modulosVisibles, history, setModule, nextModule, prevModule, goBack, toggleDropdown, closeDropdown } = useNavigationStore()
  const { theme, toggleTheme } = useThemeStore()
  const nombreNegocio = useOnboardingStore(s => s.data.nombreNegocio)

  const modulos = modulosVisibles
    .map(id => MODULES.find(m => m.id === id))
    .filter((m): m is typeof MODULES[number] => !!m)
  // "Administración" agrupa Resumen General / Reportes / Empleados / Configuración
  // en el dropdown — el resto de los módulos operativos se listan sin agrupar.
  const modulosOperativos = modulos.filter(m => !MODULOS_ADMINISTRACION.includes(m.id))
  const modulosAdmin = MODULOS_ADMINISTRACION
    .map(id => modulos.find(m => m.id === id))
    .filter((m): m is typeof MODULES[number] => !!m)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hamburguesaRef = useRef<HTMLButtonElement>(null)
  const [displayModule, setDisplayModule] = useState(activeModule)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  // `montado` mantiene el panel en el DOM durante la animación de salida;
  // `visible` dispara la transición de entrada/salida.
  const [montado, setMontado] = useState(false)
  const [visible, setVisible] = useState(false)

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

  // Entrada: montar y, con doble rAF, pasar al estado visible para que el navegador
  // alcance a pintar el estado inicial y la transición se vea.
  // Salida: quitar `visible` y desmontar recién cuando terminó la animación.
  useEffect(() => {
    if (!isDropdownOpen) {
      setVisible(false)
      const t = setTimeout(() => setMontado(false), DURACION_DROPDOWN)
      return () => clearTimeout(t)
    }
    setMontado(true)
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVisible(true))
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2) }
  }, [isDropdownOpen])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (dropdownRef.current?.contains(target)) return
      // El botón hamburguesa maneja su propio toggle: si cerráramos acá, su onClick
      // volvería a abrir el menú y nunca se podría cerrar desde el mismo botón.
      if (hamburguesaRef.current?.contains(target)) return
      closeDropdown()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [closeDropdown])

  return (
    // `relative z-50` deja todo el Navbar (ambas filas + el dropdown) por encima
    // del overlay difuminado de Layout (z-40), así no se difumina a sí mismo y sus
    // botones siguen siendo clickeables con el menú abierto.
    <header className={cn(
      'relative z-50 flex flex-col border-b select-none',
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
          {nombreNegocio && (
            <span className="ml-1 pl-2 border-l border-[#2A2A2A] light:border-[#E4E4E4] text-[10px] text-[#808080] light:text-[#707070] tracking-wide truncate max-w-[140px]">
              {nombreNegocio}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
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

          {/* Hamburguesa — único trigger del menú de módulos */}
          <button
            ref={hamburguesaRef}
            onClick={toggleDropdown}
            aria-haspopup="menu"
            aria-expanded={isDropdownOpen}
            aria-label={isDropdownOpen ? 'Cerrar menú de módulos' : 'Abrir menú de módulos'}
            title="Módulos"
            className={cn(
              'p-1.5 rounded-input transition-all duration-150',
              isDropdownOpen
                ? 'text-white bg-white/10 light:text-black light:bg-black/5'
                : 'text-[#808080] hover:text-white hover:bg-white/10 light:text-[#707070] light:hover:text-black light:hover:bg-black/5',
            )}
          >
            {isDropdownOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* Fila 2 — navegación */}
      <div className="relative flex flex-col items-center pb-3">
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

          {/* Nombre del módulo — puramente informativo, ya no abre el menú */}
          <div className="w-48 overflow-hidden rounded-input">
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
          </div>

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

      </div>

      {/* Dropdown — anclado bajo el ícono hamburguesa (esquina superior derecha).
          `right-6` lo alinea con el padding px-6 de la Fila 1. */}
      {montado && (
        <div
          ref={dropdownRef}
          role="menu"
          className={cn(
            'absolute right-6 top-full mt-2 w-56 z-50 rounded-card border shadow-lg overflow-hidden max-h-[80vh] overflow-y-auto',
            'border-[#2A2A2A] bg-[#141414]',
            'light:border-[#E4E4E4] light:bg-white',
            'origin-top-right transition-all duration-200 ease-out',
            visible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 -translate-y-2 pointer-events-none',
          )}
        >
            {modulosOperativos.map(mod => (
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
                {mod.label}
              </button>
            ))}

            {modulosAdmin.length > 0 && (
              <>
                <div className="border-t border-[#2A2A2A] light:border-[#E4E4E4] my-1" />
                <span className="flex items-center gap-1.5 px-4 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[#606060]">
                  <Briefcase size={11} /> Administración
                </span>
                {modulosAdmin.map(mod => (
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
                    {mod.label}
                  </button>
                ))}
              </>
          )}
        </div>
      )}
    </header>
  )
}
