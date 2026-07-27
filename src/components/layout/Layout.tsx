import { useEffect } from 'react'
import { Navbar } from './Navbar'
import { StatusBar } from './StatusBar'
import { useNavigationStore } from '../../store/navigationStore'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useInitDb } from '../../hooks/useInitDb'
import { ToastContainer } from '../ui/ToastContainer'
import { VeloraLogo } from '../ui/VeloraLogo'
import { cn } from '../../lib/utils'

// Importar todos los módulos
import Dashboard from '../../modules/dashboard'
import Reportes from '../../modules/reportes'
import Clientes from '../../modules/clientes'
import Empleados from '../../modules/empleados'
import Inventario from '../../modules/inventario'
import Proveedores from '../../modules/proveedores'
import ListaPrecios from '../../modules/lista-precios'
import Presupuestos from '../../modules/presupuestos'
import OrdenesTrabajo from '../../modules/ordenes-trabajo'
import Agenda from '../../modules/agenda'
import PuntoVenta from '../../modules/punto-venta'
import CajaDiaria from '../../modules/caja-diaria'
import PDFs from '../../modules/pdfs'
import Configuracion from '../../modules/configuracion'
import Uso from '../../modules/uso'

const MODULE_COMPONENTS = {
  'dashboard':       Dashboard,
  'reportes':        Reportes,
  'clientes':        Clientes,
  'empleados':       Empleados,
  'inventario':      Inventario,
  'proveedores':     Proveedores,
  'lista-precios':   ListaPrecios,
  'presupuestos':    Presupuestos,
  'ordenes-trabajo': OrdenesTrabajo,
  'agenda':          Agenda,
  'punto-venta':     PuntoVenta,
  'caja-diaria':     CajaDiaria,
  'pdfs':            PDFs,
  'configuracion':   Configuracion,
  'uso':             Uso,
}

export const Layout = () => {
  const { activeModule, actualizarModulosVisibles, isDropdownOpen, closeDropdown } = useNavigationStore()
  const funcionesHabilitadas = useOnboardingStore(s => s.data.funcionesHabilitadas)
  const ActiveComponent = MODULE_COMPONENTS[activeModule]
  const { ready, error } = useInitDb()

  // Filtrar módulos visibles según funciones habilitadas en el onboarding/config.
  useEffect(() => {
    actualizarModulosVisibles(funcionesHabilitadas ?? [])
  }, [funcionesHabilitadas, actualizarModulosVisibles])

  if (!ready) return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#0A0A0A] light:bg-[#FAFAFA]">
      <div className="animate-pulse">
        <VeloraLogo size={64} variant="auto" />
      </div>
      <span className="text-[11px] text-[#606060] tracking-widest uppercase">Iniciando...</span>
    </div>
  )

  if (error) return (
    <div className="flex h-screen items-center justify-center bg-[#0A0A0A]">
      <span className="text-[11px] text-[#C0392B]">Error al iniciar la base de datos: {error}</span>
    </div>
  )

  return (
    <div className={cn(
      'flex flex-col h-screen overflow-hidden',
      'bg-[#0A0A0A] text-white',
      'light:bg-[#FAFAFA] light:text-[#0A0A0A]',
    )}>
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <ActiveComponent />
      </main>
      <StatusBar />

      {/* Overlay difuminado del menú de módulos.
          Vive acá (no en Navbar) para quedar como hermano de <main> y del <header>:
          con z-40 tapa y difumina todo el contenido del módulo activo, mientras el
          Navbar (z-50) queda por encima, sin difuminar y con sus botones usables.
          Siempre montado y animado sólo con opacidad, así el fade se ve tanto al
          abrir como al cerrar; `pointer-events-none` lo vuelve inerte con el menú
          cerrado para no bloquear ninguna interacción. */}
      <div
        onClick={closeDropdown}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 backdrop-blur-sm transition-opacity duration-200',
          'bg-black/40 light:bg-black/20',
          isDropdownOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      <ToastContainer />
    </div>
  )
}
