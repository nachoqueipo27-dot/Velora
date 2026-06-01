import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useClientesStore } from '../../store/clientesStore'
import type { ClienteIndicadores } from '../../types/clientes'
import { CategoriaBadge } from './components/CategoriaBadge'
import { HistorialDevoluciones } from '../devoluciones/HistorialDevoluciones'
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, ClipboardList, CalendarClock, Package, MessageSquare, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

interface FichaClienteProps {
  onVolver: () => void
  onIrLog: () => void
}

const Indicador = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Card className="flex flex-col gap-1.5 hover:border-[#2A2A2A]">
    <div className="flex items-center gap-1.5 text-[#606060]">
      {icon}
      <span className="text-[11px] uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xl font-semibold text-white light:text-black">{value}</span>
  </Card>
)

const ContactoRow = ({ icon, value }: { icon: React.ReactNode; value: string }) => (
  <div className="flex items-center gap-2.5 text-sm">
    <span className="text-[#606060]">{icon}</span>
    <span className="text-[#A0A0A0] light:text-[#404040]">{value || '—'}</span>
  </div>
)

export const FichaCliente = ({ onVolver, onIrLog }: FichaClienteProps) => {
  const { clienteSeleccionado, actualizarCliente, seleccionarCliente, obtenerIndicadores } = useClientesStore()
  const [notas, setNotas] = useState(clienteSeleccionado?.notas ?? '')
  const [guardando, setGuardando] = useState(false)
  const [ind, setInd] = useState<ClienteIndicadores | null>(null)

  useEffect(() => {
    if (clienteSeleccionado) obtenerIndicadores(clienteSeleccionado.id).then(setInd)
  }, [clienteSeleccionado, obtenerIndicadores])

  if (!clienteSeleccionado) return null
  const c = clienteSeleccionado
  const notasCambiaron = notas !== (c.notas ?? '')

  const guardarNotas = async () => {
    setGuardando(true)
    try {
      await actualizarCliente(c.id, { notas })
      seleccionarCliente({ ...c, notas })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onVolver}
            className="p-1.5 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-white light:text-black">{c.nombre}</h2>
            <CategoriaBadge categoria={c.categoria} />
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={onIrLog}>
          <MessageSquare size={14} className="mr-1.5" /> Log de comunicaciones
        </Button>
      </div>

      {/* Contacto */}
      <Card className="mb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Datos de contacto</span>
        <div className="flex flex-col gap-2 mt-3">
          <ContactoRow icon={<Phone size={14} />} value={c.telefono} />
          <ContactoRow icon={<Mail size={14} />} value={c.email} />
          <ContactoRow icon={<MapPin size={14} />} value={c.direccion} />
        </div>
      </Card>

      {/* Indicadores */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2">Indicadores</span>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Indicador icon={<DollarSign size={13} />} label="Total gastado" value={`$${Math.round(ind?.totalGastado ?? 0).toLocaleString('es-AR')}`} />
        <Indicador icon={<ClipboardList size={13} />} label="Cantidad de OTs" value={String(ind?.cantidadOTs ?? 0)} />
        <Indicador icon={<CalendarClock size={13} />} label="Última visita" value={ind?.ultimaVisita ? format(new Date(ind.ultimaVisita), 'dd/MM/yyyy') : '—'} />
        <Indicador icon={<Package size={13} />} label="Más comprados" value={ind?.productosMasComprados.length ? ind.productosMasComprados[0] : '—'} />
      </div>

      {/* Notas */}
      <Card className="hover:border-[#2A2A2A]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Notas</span>
          {notasCambiaron && (
            <Button size="sm" onClick={guardarNotas} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar notas'}
            </Button>
          )}
        </div>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={3}
          placeholder="Agregá observaciones sobre este cliente..."
          className={cn(
            'w-full mt-3 px-3 py-2 text-sm rounded-input border bg-transparent outline-none resize-none transition-all duration-150',
            'placeholder:text-[#606060]',
            'border-[#2A2A2A] text-white focus:border-white',
            'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]',
          )}
        />
      </Card>

      {/* Devoluciones */}
      <div className="mt-5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2 flex items-center gap-1.5">
          <RotateCcw size={12} /> Devoluciones
        </span>
        <HistorialDevoluciones filtroClienteId={c.id} compacto />
      </div>
    </div>
  )
}
