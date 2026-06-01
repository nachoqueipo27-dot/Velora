import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useClientesStore } from '../../store/clientesStore'
import { CATEGORIAS_CLIENTE, type Cliente, type CategoriaCliente } from '../../types/clientes'
import { X } from 'lucide-react'

interface ModalClienteProps {
  open: boolean
  onClose: () => void
  cliente?: Cliente | null
}

const labelCls = 'text-xs font-medium text-[#A0A0A0] light:text-[#404040]'

export const ModalCliente = ({ open, onClose, cliente }: ModalClienteProps) => {
  const { crearCliente, actualizarCliente } = useClientesStore()
  const esEdicion = !!cliente

  const [nombre, setNombre] = useState(cliente?.nombre ?? '')
  const [telefono, setTelefono] = useState(cliente?.telefono ?? '')
  const [email, setEmail] = useState(cliente?.email ?? '')
  const [direccion, setDireccion] = useState(cliente?.direccion ?? '')
  const [categoria, setCategoria] = useState<CategoriaCliente>(cliente?.categoria ?? 'General')
  const [notas, setNotas] = useState(cliente?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)

  if (!open) return null

  const nombreInvalido = nombre.trim() === ''

  const handleGuardar = async () => {
    if (nombreInvalido) { setTouched(true); return }
    setGuardando(true)
    try {
      if (esEdicion && cliente) {
        await actualizarCliente(cliente.id, { nombre, telefono, email, direccion, categoria, notas })
      } else {
        await crearCliente({ nombre, telefono, email, direccion, categoria, notas })
      }
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 animate-overlay-in"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        className={cn(
          'w-full max-w-md rounded-modal border p-5 shadow-2xl animate-modal-in',
          'border-[#2A2A2A] bg-[#141414]',
          'light:border-[#E4E4E4] light:bg-white',
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white light:text-black">
            {esEdicion ? 'Editar cliente' : 'Nuevo cliente'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <Input
            label="Nombre *"
            placeholder="Nombre del cliente"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            error={touched && nombreInvalido ? 'El nombre es obligatorio' : undefined}
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <Input label="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Categoría</label>
            <select
              value={categoria}
              onChange={e => setCategoria(e.target.value as CategoriaCliente)}
              className={cn(
                'w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none transition-all duration-150',
                'border-[#2A2A2A] text-white focus:border-white',
                'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]',
              )}
            >
              {CATEGORIAS_CLIENTE.map(c => (
                <option key={c} value={c} className="bg-[#141414] light:bg-white">{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className={labelCls}>Notas</label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={3}
              placeholder="Observaciones, preferencias, condiciones de pago..."
              className={cn(
                'w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none resize-none transition-all duration-150',
                'placeholder:text-[#606060]',
                'border-[#2A2A2A] text-white focus:border-white',
                'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]',
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
