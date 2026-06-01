import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useClientesStore } from '../../store/clientesStore'
import type { Cliente } from '../../types/clientes'
import { ListadoClientes } from './ListadoClientes'
import { FichaCliente } from './FichaCliente'
import { LogComunicaciones } from './LogComunicaciones'
import { Users, ClipboardList, MessageSquare } from 'lucide-react'

type Seccion = 'listado' | 'historial' | 'log'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'listado',   label: 'Listado de clientes', icon: <Users size={15} /> },
  { id: 'historial', label: 'Historial de OTs',    icon: <ClipboardList size={15} /> },
  { id: 'log',       label: 'Log de comunicaciones', icon: <MessageSquare size={15} /> },
]

const Clientes = () => {
  const { cargarClientes, clienteSeleccionado, seleccionarCliente } = useClientesStore()
  const [seccion, setSeccion] = useState<Seccion>('listado')

  useEffect(() => {
    cargarClientes()
  }, [cargarClientes])

  const handleVer = (c: Cliente) => {
    seleccionarCliente(c)
    setSeccion('listado')
  }

  const irA = (id: Seccion) => {
    if (id === 'listado') seleccionarCliente(null)
    setSeccion(id)
  }

  const renderContenido = () => {
    if (seccion === 'listado') {
      return clienteSeleccionado ? (
        <FichaCliente onVolver={() => seleccionarCliente(null)} onIrLog={() => setSeccion('log')} />
      ) : (
        <ListadoClientes onVer={handleVer} />
      )
    }
    if (seccion === 'log') {
      return <LogComunicaciones />
    }
    // historial — placeholder (Paso 9)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]">
          <ClipboardList size={20} className="text-[#606060]" />
        </div>
        <p className="text-sm text-[#A0A0A0] light:text-[#404040]">Historial de Órdenes de Trabajo</p>
        <p className="text-[11px] text-[#606060]">Se habilitará al implementar el módulo de OTs (Paso 9).</p>
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sub-menú lateral */}
      <aside className={cn(
        'w-48 shrink-0 border-r flex flex-col py-4',
        'border-[#2A2A2A] light:border-[#E4E4E4]',
      )}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">
          Clientes
        </span>
        <nav className="flex flex-col">
          {SUBMENU.map(item => {
            const activo = seccion === item.id
            return (
              <button
                key={item.id}
                onClick={() => irA(item.id)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-all duration-150',
                  activo
                    ? 'border-l-2 border-white text-white pl-[14px] bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                    : 'border-l-2 border-transparent text-[#A0A0A0] hover:text-white hover:bg-white/[0.03] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.02]',
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Contenido */}
      <section className="flex-1 overflow-hidden p-6">
        {renderContenido()}
      </section>
    </div>
  )
}

export default Clientes
