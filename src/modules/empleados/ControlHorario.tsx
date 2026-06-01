import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { useEmpleadosStore } from '../../store/empleadosStore'
import { ModalHoraExtra } from './ModalHoraExtra'
import { formatMinutos } from '../../lib/time'
import { Plus, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const TIPO_LABEL: Record<string, string> = { comun: 'Común', nocturna: 'Nocturna', feriado: 'Feriado' }

type Tab = 'fichajes' | 'extras'

export const ControlHorario = () => {
  const { empleados, fichajes, horasExtras, cargarEmpleados, cargarFichajes, cargarHorasExtras } = useEmpleadosStore()
  const [tab, setTab] = useState<Tab>('extras')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [empleadoId, setEmpleadoId] = useState<number | ''>('')
  const [modalExtra, setModalExtra] = useState(false)

  useEffect(() => { cargarEmpleados() }, [cargarEmpleados])
  useEffect(() => { cargarHorasExtras(year, month) }, [year, month, cargarHorasExtras, modalExtra])
  useEffect(() => {
    if (empleadoId !== '') cargarFichajes(Number(empleadoId), year, month)
  }, [empleadoId, year, month, cargarFichajes])

  const nombreEmp = (id: number) => empleados.find(e => e.id === id)?.nombre ?? `#${id}`

  const totales = useMemo(() => {
    const acc: Record<string, number> = { comun: 0, nocturna: 0, feriado: 0 }
    horasExtras.forEach(h => { acc[h.tipo] = (acc[h.tipo] ?? 0) + h.minutosExtra })
    return acc
  }, [horasExtras])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
          {(['extras', 'fichajes'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1.5 text-[13px] rounded-[6px] transition-all duration-150',
                tab === t ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040] light:hover:text-black',
              )}>
              {t === 'extras' ? 'Horas extras' : 'Fichajes'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36"><Select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={i} value={i + 1} className="bg-[#141414] light:bg-white">{m}</option>)}
          </Select></div>
          <div className="w-24"><Select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y} className="bg-[#141414] light:bg-white">{y}</option>)}
          </Select></div>
          {tab === 'extras' && (
            <Button size="sm" onClick={() => setModalExtra(true)}><Plus size={14} className="mr-1.5" /> Registrar hora extra</Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'extras' ? (
          horasExtras.length === 0 ? (
            <EmptyState texto="No hay horas extras registradas este mes" />
          ) : (
            <>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                    <th className="text-left font-medium px-3 py-2">Empleado</th>
                    <th className="text-left font-medium px-3 py-2">Fecha</th>
                    <th className="text-left font-medium px-3 py-2">Horario vigente</th>
                    <th className="text-left font-medium px-3 py-2">Salida real</th>
                    <th className="text-left font-medium px-3 py-2">Extra</th>
                    <th className="text-left font-medium px-3 py-2">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {horasExtras.map(h => (
                    <tr key={h.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                      <td className="px-3 py-2.5 text-white light:text-black font-medium">{nombreEmp(h.empleadoId)}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(h.fecha), 'dd/MM/yyyy', { locale: es })}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{h.horarioVigente}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{h.horaSalidaReal}</td>
                      <td className="px-3 py-2.5 text-[#4CAF7D] font-medium">+{formatMinutos(h.minutosExtra)}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{TIPO_LABEL[h.tipo]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-4 mt-4 pt-3 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                {Object.entries(totales).map(([tipo, min]) => (
                  <div key={tipo} className="flex flex-col">
                    <span className="text-[11px] text-[#606060]">{TIPO_LABEL[tipo]}</span>
                    <span className="text-sm font-semibold text-white light:text-black">{formatMinutos(min)}</span>
                  </div>
                ))}
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col gap-3">
            <div className="w-64">
              <Select label="Empleado" value={empleadoId} onChange={e => setEmpleadoId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="" className="bg-[#141414] light:bg-white">Seleccionar empleado...</option>
                {empleados.map(e => <option key={e.id} value={e.id} className="bg-[#141414] light:bg-white">{e.nombre}</option>)}
              </Select>
            </div>
            {empleadoId === '' ? (
              <EmptyState texto="Seleccioná un empleado para ver sus fichajes" />
            ) : fichajes.length === 0 ? (
              <EmptyState texto="Sin fichajes registrados este mes" />
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                    <th className="text-left font-medium px-3 py-2">Fecha</th>
                    <th className="text-left font-medium px-3 py-2">Entrada</th>
                    <th className="text-left font-medium px-3 py-2">Salida</th>
                    <th className="text-left font-medium px-3 py-2">Horas</th>
                  </tr>
                </thead>
                <tbody>
                  {fichajes.map(f => (
                    <tr key={f.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                      <td className="px-3 py-2.5 text-white light:text-black">{format(new Date(f.fecha), 'dd/MM/yyyy', { locale: es })}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{f.entrada ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{f.salida ?? '—'}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{f.horasTrabajadas != null ? `${f.horasTrabajadas}h` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <ModalHoraExtra open={modalExtra} onClose={() => setModalExtra(false)} />
    </div>
  )
}

const EmptyState = ({ texto }: { texto: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]">
      <Clock size={20} className="text-[#606060]" />
    </div>
    <p className="text-sm text-[#A0A0A0] light:text-[#404040]">{texto}</p>
  </div>
)
