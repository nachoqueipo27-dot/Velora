import { useEffect, useState } from 'react'
import { cn, iniciales } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { useEmpleadosStore, type HorarioVigente } from '../../store/empleadosStore'
import { DIAS_SEMANA, type HorarioFijo } from '../../types/empleados'
import { ModalEmpleado } from './ModalEmpleado'
import { ArrowLeft, Pencil, ClipboardList, Timer, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface FichaEmpleadoProps {
  onVolver: () => void
}

const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0]

const Metrica = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <Card className="flex flex-col gap-1.5 hover:border-[#2A2A2A]">
    <div className="flex items-center gap-1.5 text-[#606060]">
      {icon}<span className="text-[11px] uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xl font-semibold text-white light:text-black">{value}</span>
  </Card>
)

export const FichaEmpleado = ({ onVolver }: FichaEmpleadoProps) => {
  const { empleadoSeleccionado, cargarHorarioFijo, obtenerHorarioVigente } = useEmpleadosStore()
  const [horarioFijo, setHorarioFijo] = useState<HorarioFijo[]>([])
  const [turnoVigente, setTurnoVigente] = useState<HorarioVigente | null>(null)
  const [editar, setEditar] = useState(false)

  const e = empleadoSeleccionado

  useEffect(() => {
    if (!e) return
    if (e.tipoHorario === 'fijo') {
      cargarHorarioFijo(e.id).then(setHorarioFijo)
    } else {
      obtenerHorarioVigente(e.id, new Date().toISOString()).then(setTurnoVigente)
    }
  }, [e, cargarHorarioFijo, obtenerHorarioVigente])

  if (!e) return null

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={onVolver} className="p-1.5 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold bg-[#2A2A2A] text-[#A0A0A0] light:bg-[#E4E4E4] light:text-[#404040]">
            {iniciales(e.nombre)}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white light:text-black">{e.nombre}</h2>
              <Badge label={e.activo ? 'Activo' : 'Inactivo'} variant={e.activo ? 'success' : 'default'} />
            </div>
            <span className="text-[11px] text-[#606060]">{e.rolNombre}</span>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setEditar(true)}>
          <Pencil size={14} className="mr-1.5" /> Editar empleado
        </Button>
      </div>

      {/* Datos */}
      <Card className="mb-4 hover:border-[#2A2A2A]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Datos</span>
        <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
          <span className="text-[#606060]">Tipo de horario</span>
          <span className="text-white light:text-black capitalize">{e.tipoHorario === 'fijo' ? 'Fijo' : 'Por turno'}</span>
          <span className="text-[#606060]">Fecha de ingreso</span>
          <span className="text-white light:text-black">{format(new Date(e.creadoEn), "d 'de' MMMM yyyy", { locale: es })}</span>
        </div>
      </Card>

      {/* Horario configurado */}
      <Card className="mb-4 hover:border-[#2A2A2A]">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Horario configurado</span>
        {e.tipoHorario === 'fijo' ? (
          <div className="flex flex-col gap-1 mt-3">
            {ORDEN_DIAS.map(d => {
              const h = horarioFijo.find(x => x.diaSemana === d)
              const laborable = h?.laborable && h.entrada && h.salida
              return (
                <div key={d} className="flex items-center justify-between text-sm py-0.5">
                  <span className="text-[#A0A0A0] light:text-[#404040] w-24">{DIAS_SEMANA[d]}</span>
                  <span className={cn(laborable ? 'text-white light:text-black' : 'text-[#606060]')}>
                    {laborable ? `${h!.entrada} – ${h!.salida}` : 'No laborable'}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="mt-3 text-sm">
            {turnoVigente ? (
              <div className="flex items-center gap-2">
                <span className="text-white light:text-black font-medium">{turnoVigente.entrada} – {turnoVigente.salida}</span>
                <span className="text-[11px] text-[#606060]">({turnoVigente.descripcion})</span>
              </div>
            ) : (
              <span className="text-[#606060]">Sin turno asignado actualmente</span>
            )}
          </div>
        )}
      </Card>

      {/* Métricas placeholder */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2">Métricas de rendimiento</span>
      <div className="grid grid-cols-3 gap-3 mb-2">
        <Metrica icon={<ClipboardList size={13} />} label="OTs completadas" value="0" />
        <Metrica icon={<Timer size={13} />} label="Tiempo promedio" value="—" />
        <Metrica icon={<DollarSign size={13} />} label="Ventas POS" value="$0" />
      </div>
      <p className="text-[11px] text-[#606060]">Las métricas se calcularán al cruzarse con las Órdenes de Trabajo (Paso 9).</p>

      <ModalEmpleado open={editar} empleado={e} onClose={() => setEditar(false)} />
    </div>
  )
}
