import { create } from 'zustand'

export type ModuleId =
  | 'dashboard'
  | 'reportes'
  | 'clientes'
  | 'empleados'
  | 'inventario'
  | 'proveedores'
  | 'lista-precios'
  | 'presupuestos'
  | 'ordenes-trabajo'
  | 'agenda'
  | 'punto-venta'
  | 'caja-diaria'
  | 'pdfs'
  | 'configuracion'
  | 'uso'

export const MODULES: { id: ModuleId; label: string }[] = [
  { id: 'dashboard',       label: 'Resumen General' },
  { id: 'reportes',        label: 'Reportes' },
  { id: 'clientes',        label: 'Clientes' },
  { id: 'empleados',       label: 'Empleados' },
  { id: 'inventario',      label: 'Inventario' },
  { id: 'proveedores',     label: 'Proveedores y Compras' },
  { id: 'lista-precios',   label: 'Lista de Precios' },
  { id: 'presupuestos',    label: 'Presupuestos' },
  { id: 'ordenes-trabajo', label: 'Órdenes de Trabajo' },
  { id: 'agenda',          label: 'Agenda' },
  { id: 'punto-venta',     label: 'Punto de Venta' },
  { id: 'caja-diaria',     label: 'Caja Diaria' },
  { id: 'pdfs',            label: 'PDFs' },
  { id: 'configuracion',   label: 'Configuración' },
  { id: 'uso',             label: 'Uso' },
]

// Grupo "Administración" — se muestran agrupados en el dropdown del Navbar.
export const MODULOS_ADMINISTRACION: ModuleId[] = ['dashboard', 'reportes', 'empleados', 'configuracion']

// Módulos siempre visibles, independientes de funcionesHabilitadas.
const SIEMPRE_VISIBLES: ModuleId[] = ['dashboard', 'reportes', 'configuracion', 'uso']

const MAX_HISTORIAL = 50

interface NavigationStore {
  activeModule: ModuleId
  isDropdownOpen: boolean
  modulosVisibles: ModuleId[]
  history: ModuleId[]            // stack de módulos visitados (para "atrás")
  setModule: (id: ModuleId) => void
  nextModule: () => void
  prevModule: () => void
  goBack: () => void
  toggleDropdown: () => void
  closeDropdown: () => void
  actualizarModulosVisibles: (funcionesHabilitadas: string[]) => void
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  activeModule: 'dashboard',
  isDropdownOpen: false,
  modulosVisibles: MODULES.map(m => m.id),
  history: [],

  // Navega a un módulo apilando el actual en el historial (si cambia).
  setModule: (id) => set(s =>
    id === s.activeModule
      ? { isDropdownOpen: false }
      : { activeModule: id, isDropdownOpen: false, history: [...s.history, s.activeModule].slice(-MAX_HISTORIAL) }
  ),
  nextModule: () => {
    const { activeModule, modulosVisibles, history } = get()
    const idx = modulosVisibles.findIndex(m => m === activeModule)
    const next = modulosVisibles[(idx + 1) % modulosVisibles.length]
    if (next === activeModule) return
    set({ activeModule: next, history: [...history, activeModule].slice(-MAX_HISTORIAL) })
  },
  prevModule: () => {
    const { activeModule, modulosVisibles, history } = get()
    const idx = modulosVisibles.findIndex(m => m === activeModule)
    const prev = modulosVisibles[(idx - 1 + modulosVisibles.length) % modulosVisibles.length]
    if (prev === activeModule) return
    set({ activeModule: prev, history: [...history, activeModule].slice(-MAX_HISTORIAL) })
  },
  // Vuelve al último módulo visitado (no re-apila).
  goBack: () => {
    const { history } = get()
    if (history.length === 0) return
    const anterior = history[history.length - 1]
    set({ activeModule: anterior, history: history.slice(0, -1), isDropdownOpen: false })
  },
  toggleDropdown: () => set(s => ({ isDropdownOpen: !s.isDropdownOpen })),
  closeDropdown: () => set({ isDropdownOpen: false }),

  actualizarModulosVisibles: (funcionesHabilitadas) => {
    const visibles = MODULES
      .map(m => m.id)
      .filter(id => SIEMPRE_VISIBLES.includes(id) || funcionesHabilitadas.includes(id))
    set({ modulosVisibles: visibles })
    // Si el módulo activo dejó de ser visible, volver al dashboard.
    if (!visibles.includes(get().activeModule)) set({ activeModule: 'dashboard' })
  },
}))
