import { useCallback, useEffect, useState } from 'react'
import { Navbar } from './Navbar'
import { StatusBar } from './StatusBar'
import { useNavigationStore } from '../../store/navigationStore'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useSistemaStore } from '../../store/sistemaStore'
import { useNegocioStore } from '../../store/negocioStore'
import { useInitDb } from '../../hooks/useInitDb'
import { useBarcodeScan } from '../../hooks/useBarcodeScan'
import { ModalEscaneo } from '../modals/ModalEscaneo'
import { ToastContainer } from '../ui/ToastContainer'
import { VeloraLogo } from '../ui/VeloraLogo'
import { cn } from '../../lib/utils'

// Importar todos los módulos
import Dashboard from '../../modules/dashboard'
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
  const { activeModule, actualizarModulosVisibles } = useNavigationStore()
  const funcionesHabilitadas = useOnboardingStore(s => s.data.funcionesHabilitadas)
  const ActiveComponent = MODULE_COMPONENTS[activeModule]
  const { ready, error } = useInitDb()
  const { inicializar, registrarEnSupabase } = useSistemaStore()
  const { negocioActivo } = useNegocioStore()
  const [codigoEscaneado, setCodigoEscaneado] = useState<string | null>(null)

  // Filtrar módulos visibles según funciones habilitadas en el onboarding/config.
  useEffect(() => {
    actualizarModulosVisibles(funcionesHabilitadas ?? [])
  }, [funcionesHabilitadas, actualizarModulosVisibles])

  // ID único por PC: generar y registrar en Supabase (si hay local remoto).
  useEffect(() => {
    inicializar().then(() => {
      if (negocioActivo?.localRemoteId) {
        registrarEnSupabase(negocioActivo.localRemoteId, undefined)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onScan = useCallback((code: string) => {
    // El POS maneja el escaneo directamente (Paso 11)
    if (useNavigationStore.getState().activeModule === 'punto-venta') return
    setCodigoEscaneado(code)
  }, [])
  useBarcodeScan({ onScan })

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

      {codigoEscaneado !== null && (
        <ModalEscaneo codigo={codigoEscaneado} onClose={() => setCodigoEscaneado(null)} />
      )}

      <ToastContainer />
    </div>
  )
}
