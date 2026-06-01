import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../../lib/utils'
import { Badge } from '../../../components/ui/Badge'
import { useEmpleadosStore } from '../../../store/empleadosStore'
import { useOTStore } from '../../../store/otStore'
import { getDb } from '../../../db'
import { Check } from 'lucide-react'

interface SelectorEmpleadoProps {
  value: number | null
  onChange: (id: number | null) => void
}

const cargaBadge = (n: number) => {
  if (n <= 2) return <Badge label="Libre" variant="success" />
  if (n <= 5) return <Badge label="Moderado" variant="warning" />
  return <Badge label="Saturado" variant="error" />
}

export const SelectorEmpleado = ({ value, onChange }: SelectorEmpleadoProps) => {
  const { empleados, cargarEmpleados } = useEmpleadosStore()
  const { cargaPorEmpleado } = useOTStore()
  const [carga, setCarga] = useState<Map<number, number>>(new Map())
  const [ausentes, setAusentes] = useState<Set<number>>(new Set())

  useEffect(() => {
    cargarEmpleados()
    cargaPorEmpleado().then(setCarga)
    // Empleados con ausencia vigente hoy
    ;(async () => {
      try {
        const db = await getDb()
        const hoy = new Date().toISOString().slice(0, 10)
        const rows = await db.select<any[]>(
          `SELECT DISTINCT empleado_id FROM ausencias WHERE date(fecha_inicio) <= ? AND date(fecha_fin) >= ?`,
          [hoy, hoy]
        )
        setAusentes(new Set(rows.map(r => r.empleado_id)))
      } catch { /* noop */ }
    })()
  }, [cargarEmpleados, cargaPorEmpleado])

  const activos = useMemo(() => empleados.filter(e => e.activo), [empleados])

  const sugerido = useMemo(() => {
    const disponibles = activos.filter(e => !ausentes.has(e.id))
    if (disponibles.length === 0) return null
    return disponibles.reduce((min, e) => ((carga.get(e.id) ?? 0) < (carga.get(min.id) ?? 0) ? e : min), disponibles[0])
  }, [activos, ausentes, carga])

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Empleado asignado</span>
        {sugerido && <span className="text-[11px] text-[#606060]">Sugerido: <span className="text-[#4CAF7D]">{sugerido.nombre}</span></span>}
      </div>
      <div className="flex flex-col gap-1 max-h-44 overflow-y-auto rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] p-1">
        <BotonEmp activo={value === null} onClick={() => onChange(null)} label="Sin asignar" />
        {activos.map(e => {
          const ausente = ausentes.has(e.id)
          const sel = value === e.id
          return (
            <button key={e.id} type="button" disabled={ausente} onClick={() => onChange(e.id)}
              className={cn('flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-input text-[13px] transition-all',
                ausente ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/[0.04] light:hover:bg-black/[0.03]',
                sel && 'bg-white/[0.06] light:bg-black/[0.04]')}>
              <span className="flex items-center gap-2">
                {sel && <Check size={13} className="text-[#4CAF7D]" />}
                <span className={cn(sel ? 'text-white light:text-black' : 'text-[#A0A0A0] light:text-[#404040]')}>{e.nombre}</span>
              </span>
              {ausente ? <Badge label="Ausente" variant="default" /> : cargaBadge(carga.get(e.id) ?? 0)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const BotonEmp = ({ activo, onClick, label }: { activo: boolean; onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick}
    className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-input text-[13px] transition-all',
      'hover:bg-white/[0.04] light:hover:bg-black/[0.03]',
      activo ? 'bg-white/[0.06] text-white light:bg-black/[0.04] light:text-black' : 'text-[#A0A0A0] light:text-[#404040]')}>
    {activo && <Check size={13} className="text-[#4CAF7D]" />}{label}
  </button>
)
