import { useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { useClientesStore } from '../../store/clientesStore'
import { CATEGORIAS_CLIENTE, type Cliente } from '../../types/clientes'
import { CategoriaBadge } from './components/CategoriaBadge'
import { ModalCliente } from './ModalCliente'
import { Search, Plus, Eye, Pencil, Trash2, FileSpreadsheet, Users } from 'lucide-react'

interface ListadoClientesProps {
  onVer: (c: Cliente) => void
}

const inputCls = cn(
  'w-full pl-9 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none transition-all duration-150',
  'placeholder:text-[#606060]',
  'border-[#2A2A2A] text-white focus:border-white',
  'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]',
)

export const ListadoClientes = ({ onVer }: ListadoClientesProps) => {
  const { clientes, loading, eliminarCliente } = useClientesStore()
  const [busqueda, setBusqueda] = useState('')
  const [filtroCat, setFiltroCat] = useState<string>('Todas')
  const [modal, setModal] = useState<{ open: boolean; cliente: Cliente | null }>({ open: false, cliente: null })
  const [confirmId, setConfirmId] = useState<number | null>(null)

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return clientes.filter(c => {
      const matchCat = filtroCat === 'Todas' || c.categoria === filtroCat
      const matchQ =
        q === '' ||
        c.nombre.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.telefono.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  }, [clientes, busqueda, filtroCat])

  const handleExport = () => {
    // Se implementará en el paso de reportes
    console.log('Exportar a Excel:', filtrados)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Barra superior */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#606060]" />
          <input
            className={inputCls}
            placeholder="Buscar por nombre, email o teléfono..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        <select
          value={filtroCat}
          onChange={e => setFiltroCat(e.target.value)}
          className={cn(
            'px-3 py-2 text-sm rounded-input border bg-transparent outline-none transition-all duration-150',
            'border-[#2A2A2A] text-white focus:border-white',
            'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]',
          )}
        >
          <option value="Todas" className="bg-[#141414] light:bg-white">Todas las categorías</option>
          {CATEGORIAS_CLIENTE.map(c => (
            <option key={c} value={c} className="bg-[#141414] light:bg-white">{c}</option>
          ))}
        </select>

        <div className="flex-1" />

        <Button size="sm" variant="secondary" onClick={handleExport}>
          <FileSpreadsheet size={14} className="mr-1.5" /> Excel
        </Button>
        <Button size="sm" onClick={() => setModal({ open: true, cliente: null })}>
          <Plus size={14} className="mr-1.5" /> Nuevo cliente
        </Button>
      </div>

      {/* Tabla / estados */}
      <div className="flex-1 overflow-y-auto">
        {loading && clientes.length === 0 ? (
          <SkeletonTabla />
        ) : filtrados.length === 0 ? (
          <EstadoVacio hayClientes={clientes.length > 0} />
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                <th className="text-left font-medium px-3 py-2">Nombre</th>
                <th className="text-left font-medium px-3 py-2">Categoría</th>
                <th className="text-left font-medium px-3 py-2">Teléfono</th>
                <th className="text-left font-medium px-3 py-2">Email</th>
                <th className="text-right font-medium px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr
                  key={c.id}
                  className={cn(
                    'border-t transition-colors',
                    'border-[#2A2A2A] hover:bg-white/[0.03]',
                    'light:border-[#E4E4E4] light:hover:bg-black/[0.02]',
                  )}
                >
                  <td className="px-3 py-2.5 font-medium text-white light:text-black">{c.nombre}</td>
                  <td className="px-3 py-2.5"><CategoriaBadge categoria={c.categoria} /></td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{c.telefono || '—'}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{c.email || '—'}</td>
                  <td className="px-3 py-2.5">
                    {confirmId === c.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] text-[#A0A0A0]">¿Eliminar?</span>
                        <Button size="sm" variant="danger" onClick={() => { eliminarCliente(c.id); setConfirmId(null) }}>Sí</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>No</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <IconBtn title="Ver" onClick={() => onVer(c)}><Eye size={14} /></IconBtn>
                        <IconBtn title="Editar" onClick={() => setModal({ open: true, cliente: c })}><Pencil size={14} /></IconBtn>
                        <IconBtn title="Eliminar" danger onClick={() => setConfirmId(c.id)}><Trash2 size={14} /></IconBtn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ModalCliente
        open={modal.open}
        cliente={modal.cliente}
        onClose={() => setModal({ open: false, cliente: null })}
      />
    </div>
  )
}

const IconBtn = ({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) => (
  <button
    title={title}
    onClick={onClick}
    className={cn(
      'p-1.5 rounded-input transition-all duration-150',
      danger
        ? 'text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10'
        : 'text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5',
    )}
  >
    {children}
  </button>
)

const SkeletonTabla = () => (
  <div className="flex flex-col gap-2">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="h-10 rounded-input animate-shimmer" />
    ))}
  </div>
)

const EstadoVacio = ({ hayClientes }: { hayClientes: boolean }) => (
  <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-16">
    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]">
      <Users size={20} className="text-[#606060]" />
    </div>
    <p className="text-sm text-[#A0A0A0] light:text-[#404040]">
      {hayClientes ? 'No hay clientes que coincidan con la búsqueda' : 'Todavía no hay clientes cargados'}
    </p>
    <p className="text-[11px] text-[#606060]">
      {hayClientes ? 'Probá con otros términos o cambiá el filtro' : 'Creá tu primer cliente con el botón "Nuevo cliente"'}
    </p>
  </div>
)
