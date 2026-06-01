import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useEmpleadosStore } from '../../store/empleadosStore'
import { TIPOS_AUSENCIA, type TipoAusencia } from '../../types/empleados'
import { Paperclip } from 'lucide-react'

interface ModalAusenciaProps {
  open: boolean
  onClose: () => void
}

const hoyFecha = () => new Date().toISOString().slice(0, 10)

export const ModalAusencia = ({ open, onClose }: ModalAusenciaProps) => {
  const { empleados, turnos, cargarEmpleados, cargarTurnos, obtenerHorarioVigente, registrarAusencia } = useEmpleadosStore()

  const [empleadoId, setEmpleadoId] = useState<number | ''>('')
  const [tipo, setTipo] = useState<TipoAusencia>('injustificada')
  const [fechaInicio, setFechaInicio] = useState(hoyFecha())
  const [fechaFin, setFechaFin] = useState(hoyFecha())
  const [horarioAfectado, setHorarioAfectado] = useState('Día completo')
  const [observacion, setObservacion] = useState('')
  const [comprobante, setComprobante] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    cargarEmpleados()
    cargarTurnos()
    setEmpleadoId(''); setTipo('injustificada'); setFechaInicio(hoyFecha()); setFechaFin(hoyFecha())
    setHorarioAfectado('Día completo'); setObservacion(''); setComprobante(null); setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSelectEmpleado = async (id: number) => {
    setEmpleadoId(id)
    const h = await obtenerHorarioVigente(id, fechaInicio)
    setHorarioAfectado(h ? `${h.entrada}-${h.salida}` : 'Día completo')
  }

  const invalido = empleadoId === '' || observacion.trim() === ''

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    setComprobante(f ? f.name : null)
  }

  const handleGuardar = async () => {
    if (invalido) { setTouched(true); return }
    setGuardando(true)
    try {
      await registrarAusencia({
        empleadoId: Number(empleadoId),
        tipo,
        fechaInicio,
        fechaFin,
        horarioAfectado,
        observacion: observacion.trim(),
        comprobante,
      })
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva falta / vacación"
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-1">
        <Select label="Empleado *" value={empleadoId} onChange={e => e.target.value && onSelectEmpleado(Number(e.target.value))}>
          <option value="" className="bg-[#141414] light:bg-white">Seleccionar empleado...</option>
          {empleados.map(e => (
            <option key={e.id} value={e.id} className="bg-[#141414] light:bg-white">{e.nombre} — {e.rolNombre}</option>
          ))}
        </Select>
        {touched && empleadoId === '' && <span className="text-xs text-[#C0392B] -mt-2">Seleccioná un empleado</span>}

        <Select label="Tipo de ausencia" value={tipo} onChange={e => setTipo(e.target.value as TipoAusencia)}>
          {TIPOS_AUSENCIA.map(t => (
            <option key={t.value} value={t.value} className="bg-[#141414] light:bg-white">{t.label}</option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Fecha inicio</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Fecha fin</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Input
            label="Horario afectado"
            value={horarioAfectado}
            onChange={e => setHorarioAfectado(e.target.value)}
            hint="Auto-detectado del horario vigente. Editable o elegí un turno."
          />
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setHorarioAfectado('Día completo')}
              className="text-[11px] px-2 py-1 rounded-input border border-[#2A2A2A] text-[#A0A0A0] hover:text-white light:border-[#E4E4E4] light:text-[#404040] light:hover:text-black transition-colors">
              Día completo
            </button>
            {turnos.map(t => (
              <button key={t.id} type="button" onClick={() => setHorarioAfectado(`${t.entrada}-${t.salida}`)}
                className="text-[11px] px-2 py-1 rounded-input border border-[#2A2A2A] text-[#A0A0A0] hover:text-white light:border-[#E4E4E4] light:text-[#404040] light:hover:text-black transition-colors">
                {t.nombre}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          label="Observación *"
          rows={2}
          value={observacion}
          onChange={e => setObservacion(e.target.value)}
        />
        {touched && observacion.trim() === '' && <span className="text-xs text-[#C0392B] -mt-2">La observación es obligatoria</span>}

        {/* Comprobante */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Comprobante (opcional)</label>
          <label className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-input border border-dashed cursor-pointer text-sm transition-colors',
            'border-[#2A2A2A] text-[#606060] hover:border-[#3A3A3A] hover:text-[#A0A0A0]',
            'light:border-[#E4E4E4] light:hover:border-[#D0D0D0]',
          )}>
            <Paperclip size={14} />
            <span>{comprobante ?? 'Adjuntar archivo...'}</span>
            <input type="file" onChange={handleFile} className="hidden" />
          </label>
        </div>
      </div>
    </Modal>
  )
}
