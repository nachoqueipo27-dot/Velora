import { useNavigationStore, MODULES, GRUPOS_MENU } from '../../store/navigationStore'
import { useThemeStore } from '../../store/themeStore'
import { cn } from '../../lib/utils'
import { VeloraLogo } from '../ui/VeloraLogo'
import { Sun, Moon, ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Duración de la transición de apertura/cierre del panel lateral de módulos.
// Debe coincidir con la clase `duration-[250ms]` del panel para que el desmontaje
// ocurra recién cuando terminó la animación de salida.
const DURACION_PANEL = 250

export const Navbar = () => {
  const { activeModule, isDropdownOpen, modulosVisibles, setModule, toggleDropdown, closeDropdown } = useNavigationStore()
  const { theme, toggleTheme } = useThemeStore()

  // Sub-secciones con sólo sus módulos visibles; un grupo sin módulos no se muestra.
  const grupos = GRUPOS_MENU
    .map(g => ({
      ...g,
      modulos: g.modulos
        .filter(id => modulosVisibles.includes(id))
        .map(id => MODULES.find(m => m.id === id))
        .filter((m): m is typeof MODULES[number] => !!m),
    }))
    .filter(g => g.modulos.length > 0)
  // Orden del menú, para decidir hacia qué lado anima el título al cambiar de módulo.
  const modulos = grupos.flatMap(g => g.modulos)
  // Sub-secciones desplegadas; se reinicia a `abiertoPorDefecto` cada vez que se abre el menú.
  const [abiertos, setAbiertos] = useState<string[]>([])
  const toggleGrupo = (id: string) =>
    setAbiertos(a => a.includes(id) ? a.filter(x => x !== id) : [...a, id])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const hamburguesaRef = useRef<HTMLButtonElement>(null)
  const [displayModule, setDisplayModule] = useState(activeModule)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  // `montado` mantiene el panel en el DOM durante la animación de salida;
  // `visible` dispara la transición de entrada/salida.
  const [montado, setMontado] = useState(false)
  const [visible, setVisible] = useState(false)

  const handleSelect = (id: typeof activeModule) => {
    const fromIdx = modulos.findIndex(m => m.id === activeModule)
    const toIdx   = modulos.findIndex(m => m.id === id)
    setDirection(toIdx > fromIdx ? 'right' : 'left')
    // El panel se cierra en el acto; el cambio de módulo espera la animación del título.
    closeDropdown()
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
      const t = setTimeout(() => setMontado(false), DURACION_PANEL)
      return () => clearTimeout(t)
    }
    setMontado(true)
    setAbiertos(GRUPOS_MENU.filter(g => g.abiertoPorDefecto).map(g => g.id))
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

  useEffect(() => {
    if (!isDropdownOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDropdown() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDropdownOpen, closeDropdown])

  const itemModulo = (mod: typeof MODULES[number]) => {
    const activo = activeModule === mod.id
    return (
      <button
        key={mod.id}
        onClick={() => handleSelect(mod.id)}
        aria-current={activo ? 'page' : undefined}
        className={cn(
          'w-full text-left px-6 py-2.5 text-sm border-l-2 transition-colors duration-150 outline-none',
          activo
            ? 'border-white text-white bg-white/[0.04] pl-[22px] light:border-black light:text-black light:bg-black/[0.03]'
            : [
                'border-transparent pl-[22px] text-[#A0A0A0] hover:text-white hover:bg-white/[0.06] focus-visible:text-white focus-visible:bg-white/[0.06]',
                'light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.04] light:focus-visible:text-black light:focus-visible:bg-black/[0.04]',
              ],
        )}
      >
        {mod.label}
      </button>
    )
  }

  return (
    // `relative z-50` deja todo el Navbar (ambas filas + el dropdown) por encima
    // del overlay difuminado de Layout (z-40), así no se difumina a sí mismo y sus
    // botones siguen siendo clickeables con el menú abierto.
    <header className={cn(
      'relative z-50 flex flex-col border-b select-none',
      'border-[#2A2A2A] bg-[#0A0A0A]',
      'light:border-[#E4E4E4] light:bg-[#FAFAFA]',
    )}>
      {/* Una sola fila: título del módulo a la izquierda, acciones a la derecha.
          `py-3` + botones de 28px dan 52px de alto, igual que la cabecera del panel
          lateral: la hamburguesa y el botón de cierre quedan en el mismo punto. */}
      <div className="flex items-center justify-between gap-6 px-6 py-3">
        {/* Nombre del módulo — puramente informativo, no abre el menú */}
        <div className="min-w-0 flex-1 overflow-hidden">
          <h1
            className={cn(
              'text-xl font-semibold tracking-tight truncate',
              'text-white light:text-black',
              animating && direction === 'right' && 'animate-slide-out-left',
              animating && direction === 'left'  && 'animate-slide-out-right',
              !animating && 'animate-slide-in',
            )}
          >
            {MODULES.find(m => m.id === displayModule)?.label}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
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
            aria-haspopup="dialog"
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

      {/* Panel lateral de módulos — entra desde el borde derecho y ocupa todo el alto
          de la ventana (también tapa el Navbar de ese lado). Es `fixed` dentro del
          stacking context z-50 del header, así queda por encima del overlay (z-40).
          Su botón de cierre usa el mismo `px-6 pt-3` que la Fila 1: cae exactamente
          donde estaba la hamburguesa, el menú se abre y se cierra desde el mismo punto. */}
      {montado && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-modal="true"
          aria-label="Módulos"
          className={cn(
            'fixed inset-y-0 right-0 w-72 flex flex-col border-l',
            'border-[#2A2A2A] bg-[#141414]',
            'light:border-[#E4E4E4] light:bg-white',
            'transition-transform duration-[250ms] ease-out motion-reduce:transition-none',
            visible ? 'translate-x-0' : 'translate-x-full pointer-events-none',
          )}
        >
          <div className="flex items-center justify-between px-6 pt-3 pb-3 border-b border-[#2A2A2A] light:border-[#E4E4E4]">
            <span className="text-sm font-semibold text-white light:text-black">Módulos</span>
            <button
              onClick={closeDropdown}
              autoFocus
              aria-label="Cerrar menú de módulos"
              title="Cerrar"
              className={cn(
                'p-1.5 rounded-input transition-all duration-150 outline-none',
                'text-white bg-white/10 hover:bg-white/15 focus-visible:ring-1 focus-visible:ring-white/40',
                'light:text-black light:bg-black/5 light:hover:bg-black/10 light:focus-visible:ring-black/30',
              )}
            >
              <X size={16} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto">
            {grupos.map(g => {
              const abierto = abiertos.includes(g.id)
              // Con el grupo cerrado, un punto indica que el módulo activo está adentro.
              const contieneActivo = g.modulos.some(m => m.id === activeModule)
              return (
                <section key={g.id} className="border-b border-[#2A2A2A] light:border-[#E4E4E4] last:border-b-0">
                  <button
                    onClick={() => toggleGrupo(g.id)}
                    aria-expanded={abierto}
                    aria-controls={`grupo-menu-${g.id}`}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 px-6 py-3 text-left outline-none transition-colors duration-150',
                      'text-[12px] font-semibold text-[#808080] hover:text-white focus-visible:text-white focus-visible:bg-white/[0.04]',
                      'light:text-[#707070] light:hover:text-black light:focus-visible:text-black light:focus-visible:bg-black/[0.03]',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {g.label}
                      {!abierto && contieneActivo && (
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-white light:bg-black" />
                      )}
                    </span>
                    <ChevronDown
                      size={14}
                      className={cn('shrink-0 transition-transform duration-200 motion-reduce:transition-none', !abierto && '-rotate-90')}
                    />
                  </button>
                  {/* grid 0fr → 1fr anima la altura sin medirla; `inert` saca del foco
                      del teclado a los módulos de un grupo cerrado. */}
                  <div
                    id={`grupo-menu-${g.id}`}
                    inert={!abierto}
                    className={cn(
                      'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
                      abierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-2">{g.modulos.map(itemModulo)}</div>
                    </div>
                  </div>
                </section>
              )
            })}
          </nav>

          {/* Firma de la app al pie del panel, en tono apagado para no competir con la lista */}
          <div className="flex shrink-0 items-center justify-center gap-2 py-5 border-t border-[#2A2A2A] light:border-[#E4E4E4] text-[#808080] light:text-[#707070]">
            <VeloraLogo size={22} className="text-current dark:text-current light:text-current" />
            <span className="text-[13px] font-semibold tracking-widest uppercase">Velora</span>
          </div>
        </div>
      )}
    </header>
  )
}
