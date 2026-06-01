import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { useDevolucionesStore } from '../../store/devolucionesStore'
import { usePDF } from '../../hooks/usePDF'
import { useNegocio } from '../../hooks/useNegocio'
import { PDFDevolucion } from '../../lib/pdf/documentos/PDFDevolucion'
import { Badge } from '../../components/ui/Badge'
import type { Devolucion, TipoDevolucion } from '../../types/devoluciones'
import { ChevronDown, ChevronRight, Download, RotateCcw, PackageOpen } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface HistorialDevolucionesProps {
  filtroOtId?: number
  filtroClienteId?: number
  compacto?: boolean
}

export const HistorialDevoluciones = ({ filtroOtId, filtroClienteId, compacto = false }: HistorialDevolucionesProps) => {
  const { devoluciones, cargarDevoluciones } = useDevolucionesStore()
  const negocio = useNegocio()
  const { descargar } = usePDF()
  const [expandida, setExpandida] = useState<number | null>(null)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoDevolucion>('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  useEffect(() => { cargarDevoluciones() }, [cargarDevoluciones])

  const lista = useMemo(() => {
    return devoluciones.filter(d => {
      if (filtroOtId != null && d.otId !== filtroOtId) return false
      if (filtroClienteId != null && d.clienteId !== filtroClienteId) return false
      if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return false
      const fechaDia = d.fecha.split('T')[0]
      if (desde && fechaDia < desde) return false
      if (hasta && fechaDia > hasta) return false
      return true
    })
  }, [devoluciones, filtroOtId, filtroClienteId, filtroTipo, desde, hasta])

  return (
    <div className="flex flex-col gap-3">
      {!compacto && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#606060]">Tipo</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
              className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black">
              <option value="todos">Todos</option>
              <option value="ot">Orden de trabajo</option>
              <option value="pos">Venta POS</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#606060]">Desde</label>
            <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
              className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#606060]">Hasta</label>
            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
              className="px-2.5 py-1.5 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
        </div>
      )}

      {lista.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <PackageOpen size={22} className="text-[#606060]" />
          <span className="text-[13px] text-[#606060]">Sin devoluciones registradas</span>
        </div>
      ) : (
        <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
                <th className="font-medium px-3 py-2.5 w-8"></th>
                <th className="font-medium px-3 py-2.5">#</th>
                <th className="font-medium px-3 py-2.5">Tipo</th>
                <th className="font-medium px-3 py-2.5">Productos</th>
                <th className="font-medium px-3 py-2.5">Motivo</th>
                <th className="font-medium px-3 py-2.5">Fecha</th>
                <th className="font-medium px-3 py-2.5 text-right">Total</th>
                <th className="font-medium px-3 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map(d => (
                <DevolucionRow key={d.id} d={d} abierta={expandida === d.id}
                  onToggle={() => setExpandida(expandida === d.id ? null : d.id)}
                  onPdf={() => descargar(<PDFDevolucion devolucion={d} negocio={negocio} />, `Devolucion-${String(d.numero).padStart(3, '0')}.pdf`)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const DevolucionRow = ({ d, abierta, onToggle, onPdf }: { d: Devolucion; abierta: boolean; onToggle: () => void; onPdf: () => void }) => {
  const nProductos = d.items.reduce((s, it) => s + it.cantidadDevuelta, 0)
  return (
    <>
      <tr className={cn('border-b border-[#1C1C1C] light:border-[#F0F0F0] cursor-pointer hover:bg-white/[0.02] light:hover:bg-black/[0.02]', abierta && 'bg-white/[0.02] light:bg-black/[0.02]')}
        onClick={onToggle}>
        <td className="px-3 py-2.5 text-[#606060]">{abierta ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
        <td className="px-3 py-2.5 text-white light:text-black font-medium tabular-nums">#{String(d.numero).padStart(3, '0')}</td>
        <td className="px-3 py-2.5"><Badge label={d.tipo === 'ot' ? 'OT' : 'POS'} variant={d.tipo === 'ot' ? 'info' : 'success'} /></td>
        <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{nProductos} u. · {d.items.length} ítem{d.items.length !== 1 ? 's' : ''}</td>
        <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040] truncate max-w-[160px]">{d.motivo}</td>
        <td className="px-3 py-2.5 text-[#606060] tabular-nums">{format(new Date(d.fecha), 'dd/MM/yyyy')}</td>
        <td className="px-3 py-2.5 text-right font-semibold text-[#4CAF7D] tabular-nums">{money(d.totalDevuelto)}</td>
        <td className="px-3 py-2.5 text-right">
          <button onClick={e => { e.stopPropagation(); onPdf() }}
            className="p-1 rounded text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all" title="Descargar PDF">
            <Download size={13} />
          </button>
        </td>
      </tr>
      {abierta && (
        <tr className="border-b border-[#1C1C1C] light:border-[#F0F0F0] bg-[#0F0F0F] light:bg-[#FAFAFA]">
          <td colSpan={8} className="px-4 py-3">
            <div className="flex flex-col gap-1.5">
              {d.items.map(it => (
                <div key={it.id} className="flex items-center gap-2 text-[12px]">
                  <RotateCcw size={11} className="text-[#4CAF7D]" />
                  <span className="text-white light:text-black">{it.cantidadDevuelta} / {it.cantidadOriginal}</span>
                  <span className="text-[#A0A0A0] light:text-[#404040]">{it.nombre}</span>
                  <span className="text-[#606060]">· {money(it.precioUnitario)} c/u</span>
                  <span className="ml-auto font-medium text-[#4CAF7D] tabular-nums">{money(it.subtotalDevuelto)}</span>
                </div>
              ))}
              {d.observacion && <p className="text-[12px] text-[#606060] mt-1">Obs: {d.observacion}</p>}
              <p className="text-[11px] text-[#606060] mt-0.5">Procesado por {d.procesadoPor}</p>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
