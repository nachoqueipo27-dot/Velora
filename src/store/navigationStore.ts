import { create } from 'zustand'

export type ModuleId =
  | 'dashboard'
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
  { id: 'dashboard',       label: 'Dashboard' },
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

// Módulos siempre visibles, independientes de funcionesHabilitadas.
const SIEMPRE_VISIBLES: ModuleId[] = ['dashboard', 'configuracion', 'uso']

interface NavigationStore {
  activeModule: ModuleId
  isDropdownOpen: boolean
  modulosVisibles: ModuleId[]
  setModule: (id: ModuleId) => void
  nextModule: () => void
  prevModule: () => void
  toggleDropdown: () => void
  closeDropdown: () => void
  actualizarModulosVisibles: (funcionesHabilitadas: string[]) => void
}

export const useNavigationStore = create<NavigationStore>((set, get) => ({
  activeModule: 'dashboard',
  isDropdownOpen: false,
  modulosVisibles: MODULES.map(m => m.id),

  setModule: (id) => set({ activeModule: id, isDropdownOpen: false }),
  nextModule: () => {
    const { activeModule, modulosVisibles } = get()
    const idx = modulosVisibles.findIndex(m => m === activeModule)
    set({ activeModule: modulosVisibles[(idx + 1) % modulosVisibles.length] })
  },
  prevModule: () => {
    const { activeModule, modulosVisibles } = get()
    const idx = modulosVisibles.findIndex(m => m === activeModule)
    set({ activeModule: modulosVisibles[(idx - 1 + modulosVisibles.length) % modulosVisibles.length] })
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
