import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useSessionStore } from '../../store/sessionStore'
import { useConfigStore } from '../../store/configStore'
import { DatosNegocio } from './DatosNegocio'
import { UsuariosRoles } from './UsuariosRoles'
import { Funciones } from './Funciones'
import { Categorias } from './Categorias'
import { CategoriasGastos } from './CategoriasGastos'
import { EtiquetasOT } from './EtiquetasOT'
import { PlantillasOT } from './PlantillasOT'
import { CodigosBarras } from './CodigosBarras'
import { MotivosCancelacion } from './MotivosCancelacion'
import { Multimoneda } from './Multimoneda'
import { AlertasGlobales } from './AlertasGlobales'
import { EditorTicket } from './EditorTicket'
import { EditorPDF } from './EditorPDF'
import { HistorialActividad } from './HistorialActividad'
import { Backup } from './Backup'
import {
  Building2, Users, ToggleLeft, Tags, Wallet, Tag, LayoutTemplate, Barcode,
  Ban, DollarSign, Bell, Receipt, FileText, History, DatabaseBackup, Lock,
} from 'lucide-react'

type Seccion =
  | 'negocio' | 'usuarios' | 'funciones' | 'categorias' | 'cat-gastos' | 'etiquetas'
  | 'plantillas' | 'codigos' | 'motivos' | 'multimoneda' | 'alertas'
  | 'ticket' | 'pdf' | 'historial' | 'backup'

const GRUPOS: { titulo: string; items: { id: Seccion; label: string; icon: React.ReactNode }[] }[] = [
  { titulo: 'Negocio', items: [
    { id: 'negocio',   label: 'Datos del negocio', icon: <Building2 size={15} /> },
    { id: 'usuarios',  label: 'Usuarios y roles',  icon: <Users size={15} /> },
    { id: 'funciones', label: 'Funciones',         icon: <ToggleLeft size={15} /> },
  ]},
  { titulo: 'Catálogos', items: [
    { id: 'categorias', label: 'Categorías',          icon: <Tags size={15} /> },
    { id: 'cat-gastos', label: 'Categorías de gastos', icon: <Wallet size={15} /> },
    { id: 'etiquetas',  label: 'Etiquetas de OT',     icon: <Tag size={15} /> },
    { id: 'plantillas', label: 'Plantillas de OT',    icon: <LayoutTemplate size={15} /> },
    { id: 'codigos',    label: 'Códigos de barras',   icon: <Barcode size={15} /> },
    { id: 'motivos',    label: 'Motivos de cancelación', icon: <Ban size={15} /> },
  ]},
  { titulo: 'Operación', items: [
    { id: 'multimoneda', label: 'Multimoneda',     icon: <DollarSign size={15} /> },
    { id: 'alertas',     label: 'Alertas globales', icon: <Bell size={15} /> },
    { id: 'ticket',      label: 'Editor de ticket', icon: <Receipt size={15} /> },
    { id: 'pdf',         label: 'Editor de PDFs',   icon: <FileText size={15} /> },
  ]},
  { titulo: 'Sistema', items: [
    { id: 'historial', label: 'Historial de actividad', icon: <History size={15} /> },
    { id: 'backup',    label: 'Backup',                 icon: <DatabaseBackup size={15} /> },
  ]},
]

const Configuracion = () => {
  const { usuario } = useSessionStore()
  const cargarTodo = useConfigStore(s => s.cargarTodo)
  const [seccion, setSeccion] = useState<Seccion>('negocio')

  useEffect(() => { cargarTodo() }, [cargarTodo])

  const esAdmin = usuario?.rol === 'Admin'
  if (!esAdmin) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
        <Lock size={28} className="text-[#606060]" />
        <div>
          <p className="text-[15px] text-white light:text-black font-medium">Acceso restringido</p>
          <p className="text-[13px] text-[#606060]">Solo los administradores pueden ver la configuración.</p>
        </div>
      </div>
    )
  }

  const render = () => {
    switch (seccion) {
      case 'negocio':    return <DatosNegocio />
      case 'usuarios':   return <UsuariosRoles />
      case 'funciones':  return <Funciones />
      case 'categorias': return <Categorias />
      case 'cat-gastos': return <CategoriasGastos />
      case 'etiquetas':  return <EtiquetasOT />
      case 'plantillas': return <PlantillasOT />
      case 'codigos':    return <CodigosBarras />
      case 'motivos':    return <MotivosCancelacion />
      case 'multimoneda':return <Multimoneda />
      case 'alertas':    return <AlertasGlobales />
      case 'ticket':     return <EditorTicket />
      case 'pdf':        return <EditorPDF />
      case 'historial':  return <HistorialActividad />
      case 'backup':     return <Backup />
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-56 shrink-0 border-r flex flex-col py-4 overflow-y-auto', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Configuración</span>
        <nav className="flex flex-col gap-3">
          {GRUPOS.map(g => (
            <div key={g.titulo} className="flex flex-col">
              <span className="px-4 mb-1 text-[10px] uppercase tracking-wider text-[#505050]">{g.titulo}</span>
              {g.items.map(item => {
                const activo = seccion === item.id
                return (
                  <button key={item.id} onClick={() => setSeccion(item.id)}
                    className={cn('flex items-center gap-2.5 px-4 py-1.5 text-[13px] text-left transition-all duration-150',
                      activo
                        ? 'border-l-2 border-white text-white pl-[14px] bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                        : 'border-l-2 border-transparent text-[#A0A0A0] hover:text-white hover:bg-white/[0.03] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.02]')}>
                    {item.icon}<span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </aside>
      <section className="flex-1 overflow-y-auto p-6">{render()}</section>
    </div>
  )
}

export default Configuracion
