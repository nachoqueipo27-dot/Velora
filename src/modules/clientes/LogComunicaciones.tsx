import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useClientesStore } from '../../store/clientesStore'
import { useSessionStore } from '../../store/sessionStore'
import { MessageSquare, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmtFecha = (iso: string) => {
  try {
    return format(new Date(iso), "d 'de' MMMM yyyy · HH:mm", { locale: es })
  } catch {
    return iso
  }
}

export const LogComunicaciones = () => {
  const { clienteSeleccionado, logs, cargarLogs, agregarLog } = useClientesStore()
  const { usuario } = useSessionStore()

  const [responsable, setResponsable] = useState(usuario?.nombre ?? 'Admin')
  const [resumen, setResumen] = useState('')
  const [registrando, setRegistrando] = useState(false)

  useEffect(() => {
    if (clienteSeleccionado) cargarLogs(clienteSeleccionado.id)
  }, [clienteSeleccionado, cargarLogs])

  if (!clienteSeleccionado) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]">
          <MessageSquare size={20} className="text-[#606060]" />
        </div>
        <p className="text-sm text-[#A0A0A0] light:text-[#404040]">Seleccioná un cliente primero</p>
        <p className="text-[11px] text-[#606060]">Desde el Listado, abrí la ficha de un cliente para ver su log.</p>
      </div>
    )
  }

  const handleRegistrar = async () => {
    if (resumen.trim() === '') return
    setRegistrando(true)
    try {
      await agregarLog(clienteSeleccionado.id, responsable.trim() || 'Admin', resumen.trim())
      setResumen('')
    } finally {
      setRegistrando(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white light:text-black">Log de comunicaciones</h2>
        <p className="text-[11px] text-[#606060]">{clienteSeleccionado.nombre}</p>
      </div>

      {/* Formulario nuevo log */}
      <div className={cn(
        'rounded-card border p-4 mb-4',
        'border-[#2A2A2A] bg-[#141414]',
        'light:border-[#E4E4E4] light:bg-white',
      )}>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Responsable" value={responsable} onChange={e => setResponsable(e.target.value)} />
          <div className="col-span-2 flex flex-col gap-1">
            <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Resumen del contacto</label>
            <textarea
              value={resumen}
              onChange={e => setResumen(e.target.value)}
              rows={2}
              placeholder="Ej. Llamado para coordinar entrega..."
              className={cn(
                'w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none resize-none transition-all duration-150',
                'placeholder:text-[#606060]',
                'border-[#2A2A2A] text-white focus:border-white',
                'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]',
              )}
            />
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={handleRegistrar} disabled={registrando || resumen.trim() === ''}>
            {registrando ? 'Registrando...' : 'Registrar'}
          </Button>
        </div>
      </div>

      {/* Lista cronológica */}
      <div className="flex-1 overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <p className="text-sm text-[#606060] text-center py-8">Sin comunicaciones registradas todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {logs.map(log => (
              <div
                key={log.id}
                className={cn(
                  'rounded-card border p-3',
                  'border-[#2A2A2A] bg-[#141414]',
                  'light:border-[#E4E4E4] light:bg-white',
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white light:text-black">{log.responsable}</span>
                  <span className="flex items-center gap-1 text-[11px] text-[#606060]">
                    <Clock size={11} /> {fmtFecha(log.fecha)}
                  </span>
                </div>
                <p className="text-sm text-[#A0A0A0] light:text-[#404040]">{log.resumen}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
