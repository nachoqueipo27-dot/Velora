import { useState } from 'react'
import { cn } from '../../lib/utils'
import { useDashboardStore } from '../../store/dashboardStore'
import { useNavigationStore } from '../../store/navigationStore'
import { useOTStore } from '../../store/otStore'
import type { OrdenTrabajo } from '../../types/ordenesTrabajo'
import { CardMetrica } from './components/CardMetrica'
import { KanbanResumen } from './components/KanbanResumen'
import { BarraProgreso } from './components/BarraProgreso'
import { Badge } from '../../components/ui/Badge'
import {
  ClipboardList, DollarSign, PackageX, FileWarning, Clock, Users,
  AlertTriangle, ShieldAlert, X, CheckCircle2,
} from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const NIVEL_COLOR = { libre: '#4CAF7D', moderado: '#D4921A', saturado: '#C0392B' }
const NIVEL_VARIANT = { libre: 'success', moderado: 'warning', saturado: 'error' } as const

export const VistaGeneral = () => {
  const { data } = useDashboardStore()
  const { setModule } = useNavigationStore()
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set())

  if (!data) return <div className="text-[13px] text-[#606060] p-2">Cargando dashboard…</div>

  const verOT = (ot: OrdenTrabajo) => { useOTStore.getState().seleccionar(ot); setModule('ordenes-trabajo') }
  const irOTs = () => { useOTStore.getState().seleccionar(null); setModule('ordenes-trabajo') }

  const alertas = [
    data.itemsStockCritico.length > 0 && {
      key: 'stock', icon: <AlertTriangle size={15} className="text-[#C0392B]" />,
      texto: `${data.itemsStockCritico.length} item${data.itemsStockCritico.length !== 1 ? 's' : ''} con stock crítico`,
      accion: 'Ver inventario', onClick: () => setModule('inventario'), tono: 'error' as const,
    },
    data.presupuestosVencidos > 0 && {
      key: 'presup', icon: <FileWarning size={15} className="text-[#D4921A]" />,
      texto: `${data.presupuestosVencidos} presupuesto${data.presupuestosVencidos !== 1 ? 's' : ''} vencido${data.presupuestosVencidos !== 1 ? 's' : ''} sin respuesta`,
      accion: 'Ver presupuestos', onClick: () => setModule('presupuestos'), tono: 'warning' as const,
    },
    data.garantiasProximasVencer > 0 && {
      key: 'gar', icon: <ShieldAlert size={15} className="text-[#D4921A]" />,
      texto: `${data.garantiasProximasVencer} garantía${data.garantiasProximasVencer !== 1 ? 's' : ''} próxima${data.garantiasProximasVencer !== 1 ? 's' : ''} a vencer (≤7 días)`,
      accion: 'Ver garantías', onClick: () => setModule('ordenes-trabajo'), tono: 'warning' as const,
    },
  ].filter(Boolean).filter(a => !descartadas.has((a as any).key)) as {
    key: string; icon: React.ReactNode; texto: string; accion: string; onClick: () => void; tono: 'error' | 'warning'
  }[]

  const maxCarga = Math.max(6, ...data.cargaPorEmpleado.map(c => c.otsActivas))

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1 pb-4">
      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="flex flex-col gap-2">
          {alertas.map(a => (
            <div key={a.key} className={cn('flex items-center gap-3 rounded-card border px-4 py-2.5',
              a.tono === 'error'
                ? 'border-[#C0392B]/30 bg-[#C0392B]/[0.06]'
                : 'border-[#D4921A]/30 bg-[#D4921A]/[0.06]')}>
              {a.icon}
              <span className="text-[13px] text-white light:text-black flex-1">{a.texto}</span>
              <button onClick={a.onClick} className="text-[12px] font-medium text-[#A0A0A0] light:text-[#404040] hover:text-white light:hover:text-black transition-colors">{a.accion}</button>
              <button onClick={() => setDescartadas(s => new Set(s).add(a.key))} className="p-1 rounded text-[#606060] hover:text-white light:hover:text-black hover:bg-white/10 light:hover:bg-black/5 transition-all"><X size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Sección 1 — Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardMetrica titulo="OTs activas" valor={data.totalOTsActivas} subtitulo="en curso"
          icono={<ClipboardList size={15} />} onClick={irOTs} />
        <CardMetrica titulo="Ingresos hoy" valor={data.ingresosHoy} formato={money} subtitulo={`${data.cobrosHoy} cobro${data.cobrosHoy !== 1 ? 's' : ''}`}
          color="success" icono={<DollarSign size={15} />} onClick={() => setModule('caja-diaria')} />
        <CardMetrica titulo="Stock crítico" valor={data.itemsStockCritico.length} subtitulo="bajo mínimo"
          color={data.itemsStockCritico.length > 0 ? 'error' : 'default'} icono={<PackageX size={15} />} onClick={() => setModule('inventario')} />
        <CardMetrica titulo="Presup. vencidos" valor={data.presupuestosVencidos} subtitulo="sin respuesta"
          color={data.presupuestosVencidos > 0 ? 'warning' : 'default'} icono={<FileWarning size={15} />} onClick={() => setModule('presupuestos')} />
      </div>

      {/* Sección 2 — Kanban resumen */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2">Órdenes de trabajo</h3>
        <KanbanResumen porEstado={data.otsActivasPorEstado} onVerOT={verOT} onVerTodas={irOTs} />
      </div>

      {/* Sección 3 — Dos columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* OTs sin movimiento */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2 flex items-center gap-1.5">
            <Clock size={12} /> OTs sin movimiento
          </h3>
          {data.otsSinMovimiento.length === 0 ? (
            <div className="flex items-center gap-2 rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] px-4 py-6 text-[13px] text-[#4CAF7D]">
              <CheckCircle2 size={16} /> Todo al día
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {data.otsSinMovimiento.slice(0, 6).map(o => (
                <div key={o.id} className="flex items-center justify-between gap-2 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-white light:text-black truncate">#{String(o.numero).padStart(3, '0')} · {o.clienteNombre}</div>
                    <div className="text-[11px] text-[#606060] truncate">{o.productoNombre}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge label={`${o.diasSinMovimiento}d`} variant={o.diasSinMovimiento >= 7 ? 'error' : 'warning'} />
                    <button onClick={() => verOT(o)} className="text-[11px] text-[#606060] hover:text-white light:hover:text-black transition-colors">Ver OT</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Carga por empleado */}
        <div className="flex flex-col">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2 flex items-center gap-1.5">
            <Users size={12} /> Carga del equipo
          </h3>
          {data.cargaPorEmpleado.length === 0 ? (
            <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] px-4 py-6 text-[13px] text-[#606060]">Sin empleados activos</div>
          ) : (
            <div className="flex flex-col gap-3 rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-4">
              {data.cargaPorEmpleado.map(c => (
                <BarraProgreso key={c.empleadoId} label={c.nombre} valor={c.otsActivas} maximo={maxCarga}
                  color={NIVEL_COLOR[c.nivel]}
                  sufijo={<Badge label={c.nivel === 'libre' ? 'Libre' : c.nivel === 'moderado' ? 'Moderado' : 'Saturado'} variant={NIVEL_VARIANT[c.nivel]} />} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
