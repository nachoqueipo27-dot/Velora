import { useEffect, useMemo } from 'react'
import { cn } from '../../lib/utils'
import { Badge } from '../../components/ui/Badge'
import { useOTStore } from '../../store/otStore'
import { ShieldCheck, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

export const GarantiasActivas = () => {
  const { garantias, cargarGarantias } = useOTStore()
  useEffect(() => { cargarGarantias() }, [cargarGarantias])

  const conDias = useMemo(() => garantias.map(g => ({
    ...g, diasRestantes: Math.ceil((new Date(g.fechaVence).getTime() - Date.now()) / 86400000),
  })), [garantias])

  const proximas = conDias.filter(g => g.diasRestantes >= 0 && g.diasRestantes <= 7).length

  const badge = (dias: number) => {
    if (dias < 0) return <Badge label="Vencida" variant="error" />
    if (dias <= 7) return <Badge label="Por vencer" variant="warning" />
    return <Badge label="Activa" variant="success" />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white light:text-black">Garantías activas</h2>
        {proximas > 0 && (
          <div className="flex items-center gap-2 rounded-input bg-[#D4921A]/10 px-3 py-1.5 text-[13px] text-[#D4921A]">
            <AlertTriangle size={15} /> {proximas} garantía{proximas === 1 ? '' : 's'} próxima{proximas === 1 ? '' : 's'} a vencer
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conDias.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><ShieldCheck size={20} className="text-[#606060]" /></div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">No hay garantías activas</p>
            <p className="text-[11px] text-[#606060]">Se crean automáticamente al entregar una OT con días de garantía.</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
              <th className="text-left font-medium px-3 py-2">Cliente</th>
              <th className="text-left font-medium px-3 py-2">Producto</th>
              <th className="text-left font-medium px-3 py-2">OT</th>
              <th className="text-right font-medium px-3 py-2">Días</th>
              <th className="text-left font-medium px-3 py-2">Vence</th>
              <th className="text-right font-medium px-3 py-2">Restantes</th>
              <th className="text-left font-medium px-3 py-2">Estado</th>
            </tr></thead>
            <tbody>
              {conDias.map(g => (
                <tr key={g.id} className={cn('border-t border-[#2A2A2A] light:border-[#E4E4E4]', g.diasRestantes < 0 && 'bg-[#C0392B]/[0.06]')}>
                  <td className="px-3 py-2.5 text-white light:text-black font-medium">{g.clienteNombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{g.productoNombre}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">#{String(g.otId).padStart(3, '0')}</td>
                  <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{g.diasGarantia}</td>
                  <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(g.fechaVence), 'dd/MM/yyyy')}</td>
                  <td className={cn('px-3 py-2.5 text-right', g.diasRestantes < 0 ? 'text-[#C0392B]' : g.diasRestantes <= 7 ? 'text-[#D4921A]' : 'text-[#A0A0A0] light:text-[#404040]')}>
                    {g.diasRestantes < 0 ? `vencida` : `${g.diasRestantes}d`}
                  </td>
                  <td className="px-3 py-2.5">{badge(g.diasRestantes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
