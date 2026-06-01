import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Card } from '../../components/ui/Card'
import { useEmpleadosStore } from '../../store/empleadosStore'
import { ModalAusencia } from './ModalAusencia'
import { TIPOS_AUSENCIA, type TipoAusencia } from '../../types/empleados'
import { Plus, CalendarOff, FileSpreadsheet } from 'lucide-react'
import { format } from 'date-fns'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const tipoLabel = (t: TipoAusencia) => TIPOS_AUSENCIA.find(x => x.value === t)?.label ?? t

type Tab = 'registro' | 'dashboard'

export const AusenciasVacaciones = () => {
  const { empleados, ausencias, cargarEmpleados, cargarAusencias } = useEmpleadosStore()
  const [tab, setTab] = useState<Tab>('registro')
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [filtroEmp, setFiltroEmp] = useState<number | ''>('')
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [modal, setModal] = useState(false)

  useEffect(() => { cargarEmpleados() }, [cargarEmpleados])
  useEffect(() => {
    cargarAusencias({ year, month, empleadoId: filtroEmp === '' ? null : Number(filtroEmp), tipo: filtroTipo || null })
  }, [year, month, filtroEmp, filtroTipo, cargarAusencias, modal])

  const nombreEmp = (id: number) => empleados.find(e => e.id === id)?.nombre ?? `#${id}`

  const contadores = useMemo(() => {
    const c = { injustificada: 0, justificada: 0, vacaciones: 0, licencias: 0 }
    ausencias.forEach(a => {
      if (a.tipo === 'injustificada') c.injustificada++
      else if (a.tipo === 'justificada') c.justificada++
      else if (a.tipo === 'vacaciones') c.vacaciones++
      else c.licencias++
    })
    return c
  }, [ausencias])

  const porEmpleado = useMemo(() => {
    const map = new Map<number, { injustificada: number; justificada: number; vacaciones: number; licencias: number; total: number }>()
    ausencias.forEach(a => {
      const cur = map.get(a.empleadoId) ?? { injustificada: 0, justificada: 0, vacaciones: 0, licencias: 0, total: 0 }
      if (a.tipo === 'injustificada') cur.injustificada++
      else if (a.tipo === 'justificada') cur.justificada++
      else if (a.tipo === 'vacaciones') cur.vacaciones++
      else cur.licencias++
      cur.total++
      map.set(a.empleadoId, cur)
    })
    return Array.from(map.entries())
  }, [ausencias])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
          {(['registro', 'dashboard'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-3 py-1.5 text-[13px] rounded-[6px] transition-all duration-150 capitalize',
                tab === t ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040] light:hover:text-black')}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32"><Select value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MESES.map((m, i) => <option key={i} value={i + 1} className="bg-[#141414] light:bg-white">{m}</option>)}
          </Select></div>
          <div className="w-20"><Select value={year} onChange={e => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y} className="bg-[#141414] light:bg-white">{y}</option>)}
          </Select></div>
          {tab === 'registro' ? (
            <Button size="sm" onClick={() => setModal(true)}><Plus size={14} className="mr-1.5" /> Nueva falta/vacación</Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => console.log('Exportar ausencias:', porEmpleado)}>
              <FileSpreadsheet size={14} className="mr-1.5" /> Excel
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'registro' ? (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-48"><Select value={filtroEmp} onChange={e => setFiltroEmp(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="" className="bg-[#141414] light:bg-white">Todos los empleados</option>
                {empleados.map(e => <option key={e.id} value={e.id} className="bg-[#141414] light:bg-white">{e.nombre}</option>)}
              </Select></div>
              <div className="w-48"><Select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                <option value="" className="bg-[#141414] light:bg-white">Todos los tipos</option>
                {TIPOS_AUSENCIA.map(t => <option key={t.value} value={t.value} className="bg-[#141414] light:bg-white">{t.label}</option>)}
              </Select></div>
            </div>
            {ausencias.length === 0 ? (
              <EmptyState texto="No hay ausencias registradas con estos filtros" />
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                    <th className="text-left font-medium px-3 py-2">Empleado</th>
                    <th className="text-left font-medium px-3 py-2">Tipo</th>
                    <th className="text-left font-medium px-3 py-2">Desde</th>
                    <th className="text-left font-medium px-3 py-2">Hasta</th>
                    <th className="text-left font-medium px-3 py-2">Horario</th>
                    <th className="text-left font-medium px-3 py-2">Observación</th>
                  </tr>
                </thead>
                <tbody>
                  {ausencias.map(a => (
                    <tr key={a.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                      <td className="px-3 py-2.5 text-white light:text-black font-medium">{nombreEmp(a.empleadoId)}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{tipoLabel(a.tipo)}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(a.fechaInicio), 'dd/MM/yyyy')}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(a.fechaFin), 'dd/MM/yyyy')}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{a.horarioAfectado}</td>
                      <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040] max-w-[200px] truncate">{a.observacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-4 gap-3">
              <Contador label="Injustificadas" value={contadores.injustificada} color="text-[#C0392B]" />
              <Contador label="Justificadas" value={contadores.justificada} color="text-[#4A7FA5]" />
              <Contador label="Vacaciones" value={contadores.vacaciones} color="text-[#4CAF7D]" />
              <Contador label="Licencias" value={contadores.licencias} color="text-[#D4921A]" />
            </div>

            {porEmpleado.length === 0 ? (
              <EmptyState texto="Sin datos para este mes" />
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                    <th className="text-left font-medium px-3 py-2">Empleado</th>
                    <th className="text-center font-medium px-3 py-2">Injust.</th>
                    <th className="text-center font-medium px-3 py-2">Justif.</th>
                    <th className="text-center font-medium px-3 py-2">Vacac.</th>
                    <th className="text-center font-medium px-3 py-2">Licenc.</th>
                    <th className="text-center font-medium px-3 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porEmpleado.map(([id, c]) => (
                    <tr key={id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                      <td className="px-3 py-2.5 text-white light:text-black font-medium">{nombreEmp(id)}</td>
                      <td className="px-3 py-2.5 text-center text-[#A0A0A0] light:text-[#404040]">{c.injustificada}</td>
                      <td className="px-3 py-2.5 text-center text-[#A0A0A0] light:text-[#404040]">{c.justificada}</td>
                      <td className="px-3 py-2.5 text-center text-[#A0A0A0] light:text-[#404040]">{c.vacaciones}</td>
                      <td className="px-3 py-2.5 text-center text-[#A0A0A0] light:text-[#404040]">{c.licencias}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-white light:text-black">{c.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <ModalAusencia open={modal} onClose={() => setModal(false)} />
    </div>
  )
}

const Contador = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <Card className="flex flex-col gap-1 hover:border-[#2A2A2A]">
    <span className="text-[11px] uppercase tracking-wider text-[#606060]">{label}</span>
    <span className={cn('text-2xl font-bold', color)}>{value}</span>
  </Card>
)

const EmptyState = ({ texto }: { texto: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]">
      <CalendarOff size={20} className="text-[#606060]" />
    </div>
    <p className="text-sm text-[#A0A0A0] light:text-[#404040]">{texto}</p>
  </div>
)
