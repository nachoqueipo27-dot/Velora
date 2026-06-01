import { useEffect, useMemo, useState } from 'react'
import { cn, iniciales } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { useEmpleadosStore } from '../../store/empleadosStore'
import { useOTStore } from '../../store/otStore'
import type { Empleado } from '../../types/empleados'
import { ModalEmpleado } from './ModalEmpleado'
import { Search, Plus, Eye, Pencil, Power, Users } from 'lucide-react'

interface ListadoEmpleadosProps {
  onVer: (e: Empleado) => void
}

// Carga de OTs (placeholder Paso 9): 0-2 Libre, 3-5 Moderado, 6+ Saturado
const cargaBadge = (ots: number) => {
  if (ots <= 2) return <Badge label="Libre" variant="success" />
  if (ots <= 5) return <Badge label="Moderado" variant="warning" />
  return <Badge label="Saturado" variant="error" />
}

export const ListadoEmpleados = ({ onVer }: ListadoEmpleadosProps) => {
  const { empleados, roles, loading, cargarEmpleados, cargarRoles, toggleActivo } = useEmpleadosStore()
  const { cargaPorEmpleado } = useOTStore()
  const [busqueda, setBusqueda] = useState('')
  const [filtroRol, setFiltroRol] = useState('Todos')
  const [modal, setModal] = useState<{ open: boolean; empleado: Empleado | null }>({ open: false, empleado: null })
  const [carga, setCarga] = useState<Map<number, number>>(new Map())

  useEffect(() => {
    cargarEmpleados()
    cargarRoles()
    cargaPorEmpleado().then(setCarga)
  }, [cargarEmpleados, cargarRoles, cargaPorEmpleado])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return empleados.filter(e => {
      const matchRol = filtroRol === 'Todos' || e.rolNombre === filtroRol
      const matchQ = q === '' || e.nombre.toLowerCase().includes(q)
      return matchRol && matchQ
    })
  }, [empleados, busqueda, filtroRol])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input
            className={cn(
              'w-full pl-9 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none transition-all duration-150',
              'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
              'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]',
            )}
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
            <option value="Todos" className="bg-[#141414] light:bg-white">Todos los roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.nombre} className="bg-[#141414] light:bg-white">{r.nombre}</option>
            ))}
          </Select>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setModal({ open: true, empleado: null })}>
          <Plus size={14} className="mr-1.5" /> Nuevo empleado
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && empleados.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-input animate-shimmer" />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]">
              <Users size={20} className="text-[#606060]" />
            </div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">No hay empleados que coincidan</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                <th className="text-left font-medium px-3 py-2">Empleado</th>
                <th className="text-left font-medium px-3 py-2">Rol</th>
                <th className="text-left font-medium px-3 py-2">Horario</th>
                <th className="text-left font-medium px-3 py-2">Carga OTs</th>
                <th className="text-left font-medium px-3 py-2">Estado</th>
                <th className="text-right font-medium px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(e => (
                <tr key={e.id} className={cn('border-t transition-colors', 'border-[#2A2A2A] hover:bg-white/[0.03]', 'light:border-[#E4E4E4] light:hover:bg-black/[0.02]', !e.activo && 'opacity-50')}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold bg-[#2A2A2A] text-[#A0A0A0] light:bg-[#E4E4E4] light:text-[#404040]">
                        {iniciales(e.nombre)}
                      </div>
                      <span className="font-medium text-white light:text-black">{e.nombre}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{e.rolNombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040] capitalize">{e.tipoHorario === 'fijo' ? 'Fijo' : 'Por turno'}</td>
                  <td className="px-3 py-2.5">{cargaBadge(carga.get(e.id) ?? 0)}</td>
                  <td className="px-3 py-2.5">
                    <Badge label={e.activo ? 'Activo' : 'Inactivo'} variant={e.activo ? 'success' : 'default'} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn title="Ver ficha" onClick={() => onVer(e)}><Eye size={14} /></IconBtn>
                      <IconBtn title="Editar" onClick={() => setModal({ open: true, empleado: e })}><Pencil size={14} /></IconBtn>
                      <IconBtn title={e.activo ? 'Desactivar' : 'Activar'} onClick={() => toggleActivo(e.id)}><Power size={14} /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalEmpleado open={modal.open} empleado={modal.empleado} onClose={() => setModal({ open: false, empleado: null })} />
    </div>
  )
}

const IconBtn = ({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) => (
  <button title={title} onClick={onClick}
    className="p-1.5 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all duration-150">
    {children}
  </button>
)
