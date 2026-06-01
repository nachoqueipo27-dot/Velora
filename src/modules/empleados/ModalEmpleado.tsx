import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { useEmpleadosStore } from '../../store/empleadosStore'
import { useSessionStore } from '../../store/sessionStore'
import { DIAS_SEMANA, type Empleado, type HorarioFijo } from '../../types/empleados'

interface ModalEmpleadoProps {
  open: boolean
  onClose: () => void
  empleado?: Empleado | null
}

const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]

const horariosPorDefecto = (): HorarioFijo[] =>
  ORDEN_DIAS.map(d => ({
    diaSemana: d,
    entrada: '09:00',
    salida: '18:00',
    laborable: d >= 1 && d <= 5,
  }))

export const ModalEmpleado = ({ open, onClose, empleado }: ModalEmpleadoProps) => {
  const { roles, turnos, crearEmpleado, actualizarEmpleado, cargarRoles, cargarTurnos, cargarHorarioFijo } = useEmpleadosStore()
  const { usuario } = useSessionStore()
  const esEdicion = !!empleado

  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState<number | ''>('')
  const [tipoHorario, setTipoHorario] = useState<'fijo' | 'turno'>('fijo')
  const [turnoId, setTurnoId] = useState<number | ''>('')
  const [activo, setActivo] = useState(true)
  const [horarios, setHorarios] = useState<HorarioFijo[]>(horariosPorDefecto())
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)

  const esAdminActual = roles.find(r => r.nombre === usuario?.rol)?.esAdmin ?? false
  const rolesDisponibles = roles.filter(r => esAdminActual || !r.esAdmin)

  useEffect(() => {
    if (!open) return
    cargarRoles()
    cargarTurnos()
    if (empleado) {
      setNombre(empleado.nombre)
      setPassword('')
      setRolId(empleado.rolId)
      setTipoHorario(empleado.tipoHorario)
      setActivo(empleado.activo)
      if (empleado.tipoHorario === 'fijo') {
        cargarHorarioFijo(empleado.id).then(rows => {
          if (rows.length) {
            setHorarios(ORDEN_DIAS.map(d => rows.find(r => r.diaSemana === d) ?? { diaSemana: d, entrada: '09:00', salida: '18:00', laborable: false }))
          } else {
            setHorarios(horariosPorDefecto())
          }
        })
      }
    } else {
      setNombre(''); setPassword(''); setRolId(''); setTipoHorario('fijo')
      setTurnoId(''); setActivo(true); setHorarios(horariosPorDefecto())
    }
    setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, empleado])

  const nombreInvalido = nombre.trim() === ''
  const passwordInvalido = !esEdicion && password.trim() === ''
  const rolInvalido = rolId === ''
  const invalido = nombreInvalido || passwordInvalido || rolInvalido

  const setDia = (idx: number, patch: Partial<HorarioFijo>) =>
    setHorarios(h => h.map((d, i) => (i === idx ? { ...d, ...patch } : d)))

  const handleGuardar = async () => {
    if (invalido) { setTouched(true); return }
    setGuardando(true)
    try {
      const payload = {
        nombre: nombre.trim(),
        rolId: Number(rolId),
        password,
        tipoHorario,
        activo,
        horariosFijos: tipoHorario === 'fijo' ? horarios : undefined,
        turnoId: tipoHorario === 'turno' ? (turnoId === '' ? null : Number(turnoId)) : undefined,
      }
      if (esEdicion && empleado) await actualizarEmpleado(empleado.id, payload)
      else await crearEmpleado(payload)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? 'Editar empleado' : 'Nuevo empleado'}
      maxWidth="max-w-lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-1">
        <Input
          label="Nombre completo *"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          error={touched && nombreInvalido ? 'Obligatorio' : undefined}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={esEdicion ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            error={touched && passwordInvalido ? 'Obligatorio' : undefined}
          />
          <Select
            label="Rol *"
            value={rolId}
            onChange={e => setRolId(e.target.value === '' ? '' : Number(e.target.value))}
          >
            <option value="" className="bg-[#141414] light:bg-white">Seleccionar...</option>
            {rolesDisponibles.map(r => (
              <option key={r.id} value={r.id} className="bg-[#141414] light:bg-white">{r.nombre}</option>
            ))}
          </Select>
        </div>

        {/* Tipo de horario */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Tipo de horario</span>
          <div className="grid grid-cols-2 gap-2">
            {(['fijo', 'turno'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipoHorario(t)}
                className={cn(
                  'px-3 py-2 rounded-input border text-sm font-medium transition-all duration-150 capitalize',
                  tipoHorario === t
                    ? 'border-white bg-white/[0.08] text-white light:border-black light:bg-black/[0.06] light:text-black'
                    : 'border-[#2A2A2A] text-[#A0A0A0] hover:text-white light:border-[#E4E4E4] light:text-[#404040] light:hover:text-black',
                )}
              >
                {t === 'fijo' ? 'Fijo' : 'Por turno'}
              </button>
            ))}
          </div>
        </div>

        {/* Horario fijo editable */}
        {tipoHorario === 'fijo' && (
          <div className={cn('rounded-card border p-3', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
            <div className="flex flex-col gap-1.5">
              {horarios.map((d, i) => (
                <div key={d.diaSemana} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDia(i, { laborable: !d.laborable })}
                    className={cn(
                      'w-20 text-left text-[13px] transition-colors',
                      d.laborable ? 'text-white light:text-black' : 'text-[#606060] line-through',
                    )}
                  >
                    {DIAS_SEMANA[d.diaSemana]}
                  </button>
                  <input
                    type="time"
                    value={d.entrada ?? ''}
                    disabled={!d.laborable}
                    onChange={e => setDia(i, { entrada: e.target.value })}
                    className={cn(
                      'px-2 py-1 text-xs rounded-input border bg-transparent outline-none',
                      'border-[#2A2A2A] text-white focus:border-white disabled:opacity-40',
                      'light:border-[#E4E4E4] light:text-[#0A0A0A]',
                    )}
                  />
                  <span className="text-[#606060] text-xs">a</span>
                  <input
                    type="time"
                    value={d.salida ?? ''}
                    disabled={!d.laborable}
                    onChange={e => setDia(i, { salida: e.target.value })}
                    className={cn(
                      'px-2 py-1 text-xs rounded-input border bg-transparent outline-none',
                      'border-[#2A2A2A] text-white focus:border-white disabled:opacity-40',
                      'light:border-[#E4E4E4] light:text-[#0A0A0A]',
                    )}
                  />
                  <span className="text-[10px] text-[#606060] ml-auto">
                    {d.laborable ? 'Laborable' : 'No laborable'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Turno */}
        {tipoHorario === 'turno' && (
          <Select label="Turno asignado" value={turnoId} onChange={e => setTurnoId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="" className="bg-[#141414] light:bg-white">Seleccionar turno...</option>
            {turnos.map(t => (
              <option key={t.id} value={t.id} className="bg-[#141414] light:bg-white">{t.nombre} ({t.entrada}–{t.salida})</option>
            ))}
          </Select>
        )}

        {/* Estado */}
        <button
          type="button"
          onClick={() => setActivo(a => !a)}
          className="flex items-center gap-2 mt-1"
        >
          <span className={cn(
            'w-9 h-5 rounded-full transition-colors relative',
            activo ? 'bg-[#4CAF7D]' : 'bg-[#2A2A2A] light:bg-[#E4E4E4]',
          )}>
            <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', activo ? 'left-[18px]' : 'left-0.5')} />
          </span>
          <span className="text-[13px] text-[#A0A0A0] light:text-[#404040]">{activo ? 'Activo' : 'Inactivo'}</span>
        </button>
      </div>
    </Modal>
  )
}
