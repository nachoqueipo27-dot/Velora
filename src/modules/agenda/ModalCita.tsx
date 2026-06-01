import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useAgendaStore } from '../../store/agendaStore'
import { useClientesStore } from '../../store/clientesStore'
import { useEmpleadosStore } from '../../store/empleadosStore'
import { useOTStore } from '../../store/otStore'
import { COLORES_CITA, type Cita } from '../../types/agenda'
import { isoLocal, horaDe, fechaInput } from '../../lib/fecha'
import { AlertaSuperposicion } from './components/AlertaSuperposicion'
import { Trash2 } from 'lucide-react'

interface ModalCitaProps {
  open: boolean
  onClose: () => void
  cita?: Cita | null
  fechaInicial?: Date | null  // para click en celda vacía
}

export const ModalCita = ({ open, onClose, cita, fechaInicial }: ModalCitaProps) => {
  const { crearCita, actualizarCita, eliminarCita, detectarSuperposicion } = useAgendaStore()
  const { clientes, cargarClientes } = useClientesStore()
  const { empleados, cargarEmpleados } = useEmpleadosStore()
  const { ots, cargarOTs } = useOTStore()
  const esEdicion = !!cita

  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(fechaInput(new Date()))
  const [horaIni, setHoraIni] = useState('09:00')
  const [fechaFinDia, setFechaFinDia] = useState(fechaInput(new Date()))
  const [horaFin, setHoraFin] = useState('10:00')
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [empleadoId, setEmpleadoId] = useState<number | ''>('')
  const [otId, setOtId] = useState<number | ''>('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState(COLORES_CITA[0])
  const [conflictos, setConflictos] = useState<Cita[] | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    cargarClientes(); cargarEmpleados(); cargarOTs()
    if (cita) {
      setTitulo(cita.titulo)
      setFecha(fechaInput(new Date(cita.fechaInicio)))
      setHoraIni(horaDe(cita.fechaInicio))
      setFechaFinDia(fechaInput(new Date(cita.fechaFin)))
      setHoraFin(horaDe(cita.fechaFin))
      setClienteId(cita.clienteId ?? '')
      setEmpleadoId(cita.empleadoId ?? '')
      setOtId(cita.otId ?? '')
      setDescripcion(cita.descripcion ?? '')
      setColor(cita.color)
    } else {
      const base = fechaInicial ?? new Date()
      const h = String(base.getHours()).padStart(2, '0')
      const hFin = String((base.getHours() + 1) % 24).padStart(2, '0')
      setTitulo('')
      setFecha(fechaInput(base)); setFechaFinDia(fechaInput(base))
      setHoraIni(`${h}:00`); setHoraFin(`${hFin}:00`)
      setClienteId(''); setEmpleadoId(''); setOtId(''); setDescripcion(''); setColor(COLORES_CITA[0])
    }
    setConflictos(null); setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cita, fechaInicial])

  const otsActivas = useMemo(() => ots.filter(o => o.estado === 'recepcion' || o.estado === 'en_proceso'), [ots])

  const fechaInicioISO = isoLocal(fecha, horaIni)
  const fechaFinISO = isoLocal(fechaFinDia, horaFin)
  const rangoInvalido = new Date(fechaFinISO) <= new Date(fechaInicioISO)
  const tituloInvalido = titulo.trim() === ''

  const construirData = () => ({
    titulo: titulo.trim(),
    clienteId: clienteId === '' ? null : Number(clienteId),
    empleadoId: empleadoId === '' ? null : Number(empleadoId),
    otId: otId === '' ? null : Number(otId),
    fechaInicio: fechaInicioISO,
    fechaFin: fechaFinISO,
    descripcion: descripcion.trim(),
    color,
  })

  const persistir = async () => {
    setGuardando(true)
    try {
      const data = construirData()
      if (esEdicion && cita) await actualizarCita(cita.id, data)
      else await crearCita(data)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  const handleGuardar = async () => {
    if (tituloInvalido || rangoInvalido) { setTouched(true); return }
    const empId = empleadoId === '' ? null : Number(empleadoId)
    const conf = detectarSuperposicion(empId, fechaInicioISO, fechaFinISO, cita?.id)
    if (conf.length > 0) { setConflictos(conf); return }
    await persistir()
  }

  const inputDate = cn('w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none',
    'border-[#2A2A2A] text-white focus:border-white', 'light:border-[#E4E4E4] light:text-[#0A0A0A]')

  return (
    <Modal open={open} onClose={onClose} title={esEdicion ? 'Editar cita' : 'Nueva cita'} maxWidth="max-w-lg"
      footer={<>
        {esEdicion && cita && (
          <Button variant="danger" onClick={() => { eliminarCita(cita.id); onClose() }} className="mr-auto"><Trash2 size={14} className="mr-1.5" /> Eliminar</Button>
        )}
        <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
      </>}>
      <div className="flex flex-col gap-3 pb-1">
        <Input label="Título *" value={titulo} onChange={e => setTitulo(e.target.value)}
          error={touched && tituloInvalido ? 'Obligatorio' : undefined} autoFocus />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Fecha inicio</label>
            <input type="date" value={fecha} onChange={e => { setFecha(e.target.value); if (fechaFinDia < e.target.value) setFechaFinDia(e.target.value) }} className={inputDate} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Hora inicio</label>
            <input type="time" value={horaIni} onChange={e => setHoraIni(e.target.value)} className={inputDate} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Fecha fin</label>
            <input type="date" value={fechaFinDia} min={fecha} onChange={e => setFechaFinDia(e.target.value)} className={inputDate} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Hora fin</label>
            <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} className={inputDate} />
          </div>
        </div>
        {touched && rangoInvalido && <span className="text-xs text-[#C0392B]">La hora de fin debe ser posterior al inicio</span>}

        <div className="grid grid-cols-2 gap-3">
          <Select label="Cliente" value={clienteId} onChange={e => setClienteId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="" className="bg-[#141414] light:bg-white">Sin cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id} className="bg-[#141414] light:bg-white">{c.nombre}</option>)}
          </Select>
          <Select label="Empleado" value={empleadoId} onChange={e => setEmpleadoId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="" className="bg-[#141414] light:bg-white">Sin empleado</option>
            {empleados.filter(e => e.activo).map(e => <option key={e.id} value={e.id} className="bg-[#141414] light:bg-white">{e.nombre}</option>)}
          </Select>
        </div>

        <Select label="OT vinculada" value={otId} onChange={e => setOtId(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="" className="bg-[#141414] light:bg-white">Sin OT</option>
          {otsActivas.map(o => <option key={o.id} value={o.id} className="bg-[#141414] light:bg-white">#{String(o.numero).padStart(3, '0')} · {o.clienteNombre} · {o.productoNombre}</option>)}
        </Select>

        <Textarea label="Descripción" rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Color</span>
          <div className="flex gap-2">
            {COLORES_CITA.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                className={cn('w-6 h-6 rounded-full transition-all', color === c ? 'ring-2 ring-offset-2 ring-offset-[#141414] light:ring-offset-white scale-110' : 'hover:scale-110')}
                style={{ backgroundColor: c, ...(color === c ? { boxShadow: `0 0 0 2px ${c}` } : {}) }} />
            ))}
          </div>
        </div>

        {conflictos && conflictos.length > 0 && (
          <AlertaSuperposicion conflictos={conflictos} onCambiar={() => setConflictos(null)} onGuardarIgual={persistir} />
        )}
      </div>
    </Modal>
  )
}
