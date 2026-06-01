import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useEmpleadosStore, type HorarioVigente } from '../../store/empleadosStore'
import { useSessionStore } from '../../store/sessionStore'
import { minutosEntre, formatMinutos } from '../../lib/time'
import { Clock, AlertTriangle, Check } from 'lucide-react'

interface ModalHoraExtraProps {
  open: boolean
  onClose: () => void
}

const TIPOS = [
  { value: 'comun', label: 'Común' },
  { value: 'nocturna', label: 'Nocturna' },
  { value: 'feriado', label: 'Feriado' },
] as const

export const ModalHoraExtra = ({ open, onClose }: ModalHoraExtraProps) => {
  const { empleados, turnos, cargarEmpleados, cargarTurnos, obtenerHorarioVigente, registrarHoraExtra } = useEmpleadosStore()
  const { usuario } = useSessionStore()

  const [empleadoId, setEmpleadoId] = useState<number | ''>('')
  const [detectado, setDetectado] = useState<HorarioVigente | 'idle' | 'loading' | 'none'>('idle')
  const [confirmado, setConfirmado] = useState(false)
  const [correccion, setCorreccion] = useState<'none' | 'turno' | 'manual'>('none')
  const [horarioFinal, setHorarioFinal] = useState<{ entrada: string; salida: string } | null>(null)
  const [horaSalidaReal, setHoraSalidaReal] = useState('')
  const [tipo, setTipo] = useState<'comun' | 'nocturna' | 'feriado'>('comun')
  const [observacion, setObservacion] = useState('')
  const [guardando, setGuardando] = useState(false)

  const hoyISO = new Date().toISOString()

  useEffect(() => {
    if (!open) return
    cargarEmpleados()
    cargarTurnos()
    setEmpleadoId(''); setDetectado('idle'); setConfirmado(false); setCorreccion('none')
    setHorarioFinal(null); setHoraSalidaReal(''); setTipo('comun'); setObservacion('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onSelectEmpleado = async (id: number) => {
    setEmpleadoId(id)
    setConfirmado(false); setCorreccion('none'); setHorarioFinal(null); setHoraSalidaReal('')
    setDetectado('loading')
    const h = await obtenerHorarioVigente(id, hoyISO)
    setDetectado(h ?? 'none')
  }

  const minutosExtra = horarioFinal && horaSalidaReal
    ? minutosEntre(horarioFinal.salida, horaSalidaReal)
    : 0
  const salidaValida = minutosExtra > 0

  const handleRegistrar = async () => {
    if (!horarioFinal || empleadoId === '' || !salidaValida) return
    setGuardando(true)
    try {
      await registrarHoraExtra({
        empleadoId: Number(empleadoId),
        fecha: hoyISO,
        horarioVigente: `${horarioFinal.entrada}-${horarioFinal.salida}`,
        horaSalidaReal,
        minutosExtra,
        tipo,
        observacion: observacion.trim() || null,
        registradoPor: usuario?.nombre ?? 'Admin',
      })
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  const confirmarHorario = (h: { entrada: string; salida: string }) => {
    setHorarioFinal(h)
    setConfirmado(true)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar hora extra"
      footer={confirmado ? (
        <>
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleRegistrar} disabled={guardando || !salidaValida}>
            {guardando ? 'Registrando...' : 'Registrar'}
          </Button>
        </>
      ) : undefined}
    >
      <div className="flex flex-col gap-4 pb-1">
        <Select
          label="Empleado"
          value={empleadoId}
          onChange={e => e.target.value && onSelectEmpleado(Number(e.target.value))}
        >
          <option value="" className="bg-[#141414] light:bg-white">Seleccionar empleado...</option>
          {empleados.filter(e => e.activo).map(e => (
            <option key={e.id} value={e.id} className="bg-[#141414] light:bg-white">{e.nombre} — {e.rolNombre}</option>
          ))}
        </Select>

        {/* Paso 2-3: confirmación de horario */}
        {detectado === 'loading' && (
          <p className="text-xs text-[#606060]">Detectando horario vigente...</p>
        )}

        {detectado !== 'idle' && detectado !== 'loading' && !confirmado && (
          <div className={cn('rounded-card border p-4 flex flex-col gap-3', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
            {detectado !== 'none' ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Clock size={15} className="text-[#4A7FA5]" />
                  <span className="text-white light:text-black font-medium">{detectado.entrada} – {detectado.salida}</span>
                  <span className="text-[11px] text-[#606060]">({detectado.descripcion})</span>
                </div>
                <p className="text-[13px] text-[#A0A0A0] light:text-[#404040]">¿Este es el horario correcto?</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => confirmarHorario({ entrada: detectado.entrada, salida: detectado.salida })}>
                    <Check size={14} className="mr-1.5" /> Sí, es correcto
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setCorreccion('turno')}>No, corregir</Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle size={15} className="text-[#D4921A]" />
                  <span className="text-[#A0A0A0] light:text-[#404040]">No se detectó horario para hoy. Indicá el horario manualmente.</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setCorreccion('turno')}>Elegir turno</Button>
                  <Button size="sm" variant="secondary" onClick={() => setCorreccion('manual')}>Ingresar manual</Button>
                </div>
              </>
            )}

            {/* Corrección por turno */}
            {correccion === 'turno' && (
              <div className="flex flex-col gap-2 pt-1">
                <Select
                  label="Turno correcto"
                  onChange={e => {
                    const t = turnos.find(x => x.id === Number(e.target.value))
                    if (t) confirmarHorario({ entrada: t.entrada, salida: t.salida })
                  }}
                  defaultValue=""
                >
                  <option value="" className="bg-[#141414] light:bg-white">Seleccionar...</option>
                  {turnos.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#141414] light:bg-white">{t.nombre} ({t.entrada}–{t.salida})</option>
                  ))}
                </Select>
                <button className="text-[11px] text-[#606060] hover:text-[#A0A0A0] text-left" onClick={() => setCorreccion('manual')}>
                  o ingresar horario manualmente
                </button>
              </div>
            )}

            {/* Corrección manual */}
            {correccion === 'manual' && (
              <ManualHorario onConfirm={confirmarHorario} />
            )}
          </div>
        )}

        {/* Paso 4: formulario */}
        {confirmado && horarioFinal && (
          <div className="flex flex-col gap-3">
            <div className="text-[11px] text-[#606060]">
              Horario vigente: <span className="text-[#A0A0A0]">{horarioFinal.entrada} – {horarioFinal.salida}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Hora de salida real</label>
                <input
                  type="time"
                  value={horaSalidaReal}
                  onChange={e => setHoraSalidaReal(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none',
                    'border-[#2A2A2A] text-white focus:border-white',
                    'light:border-[#E4E4E4] light:text-[#0A0A0A]',
                  )}
                />
              </div>
              <div className="pb-2">
                {horaSalidaReal && (
                  salidaValida ? (
                    <span className="text-sm font-semibold text-[#4CAF7D]">+{formatMinutos(minutosExtra)} extra</span>
                  ) : (
                    <span className="text-[11px] text-[#C0392B]">La salida real debe ser posterior a {horarioFinal.salida}</span>
                  )
                )}
              </div>
            </div>
            <Select label="Tipo" value={tipo} onChange={e => setTipo(e.target.value as any)}>
              {TIPOS.map(t => (
                <option key={t.value} value={t.value} className="bg-[#141414] light:bg-white">{t.label}</option>
              ))}
            </Select>
            <Textarea label="Observación (opcional)" rows={2} value={observacion} onChange={e => setObservacion(e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  )
}

const ManualHorario = ({ onConfirm }: { onConfirm: (h: { entrada: string; salida: string }) => void }) => {
  const [entrada, setEntrada] = useState('09:00')
  const [salida, setSalida] = useState('18:00')
  return (
    <div className="flex items-end gap-2 pt-1">
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#606060]">Entrada</label>
        <input type="time" value={entrada} onChange={e => setEntrada(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-[#606060]">Salida</label>
        <input type="time" value={salida} onChange={e => setSalida(e.target.value)}
          className="px-2 py-1.5 text-xs rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
      </div>
      <Button size="sm" onClick={() => onConfirm({ entrada, salida })}>Usar este horario</Button>
    </div>
  )
}
