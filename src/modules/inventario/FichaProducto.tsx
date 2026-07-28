import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useInventarioStore } from '../../store/inventarioStore'
import { UNIDADES_MEDIDA, type ComponenteConjunto } from '../../types/inventario'
import { StockBadge } from './components/StockBadge'
import { ArrowLeft, Package, Boxes, ImageOff } from 'lucide-react'
import { format } from 'date-fns'

interface FichaProductoProps {
  onVolver: () => void
}

const TIPO_MOV: Record<string, string> = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' }
const LABEL_UNIDAD: Record<string, string> = Object.fromEntries(UNIDADES_MEDIDA.map(u => [u.value, u.label]))

export const FichaProducto = ({ onVolver }: FichaProductoProps) => {
  const { productoSeleccionado, movimientos, cargarMovimientos, cargarComponentes, ajustarStock } = useInventarioStore()
  const [comps, setComps] = useState<ComponenteConjunto[]>([])
  const [ajuste, setAjuste] = useState(false)

  const p = productoSeleccionado

  useEffect(() => {
    if (!p) return
    cargarMovimientos(p.id)
    if (p.tipo === 'conjunto') cargarComponentes(p.id).then(setComps)
  }, [p, cargarMovimientos, cargarComponentes])

  if (!p) return null
  const margen = p.precio - p.precioCosto
  const margenPct = p.precio > 0 ? (margen / p.precio) * 100 : 0

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={onVolver} className="p-1.5 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all">
            <ArrowLeft size={16} />
          </button>
          <div className="w-14 h-14 rounded-card overflow-hidden flex items-center justify-center bg-[#1C1C1C] light:bg-[#F4F4F4] shrink-0">
            {p.imagen ? <img src={p.imagen} className="w-full h-full object-cover" alt="" /> : <ImageOff size={18} className="text-[#606060]" />}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-white light:text-black">{p.nombre}</h2>
            <div className="flex items-center gap-1.5">
              <Badge label={p.tipo === 'conjunto' ? 'Conjunto' : 'Simple'} variant="info" />
              {p.categoriaNombre && <Badge label={p.categoriaNombre} variant="default" />}
              {p.trazabilidad !== 'ninguna' && <Badge label={p.trazabilidad === 'serie' ? 'Serie' : 'Lote'} variant="warning" />}
            </div>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setAjuste(true)}>Ajustar stock</Button>
      </div>

      {/* Datos */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card className="hover:border-[#2A2A2A]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Precios</span>
          <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
            <span className="text-[#606060]">Venta</span><span className="text-white light:text-black text-right">${p.precio.toLocaleString('es-AR')}</span>
            <span className="text-[#606060]">Costo</span><span className="text-white light:text-black text-right">${p.precioCosto.toLocaleString('es-AR')} {p.monedaCosto}</span>
            <span className="text-[#606060]">Margen</span>
            <span className={cn('text-right font-medium', margen >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>
              ${margen.toLocaleString('es-AR')} ({margenPct.toFixed(0)}%)
            </span>
          </div>
        </Card>
        <Card className="hover:border-[#2A2A2A]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Identificación y stock</span>
          <div className="grid grid-cols-2 gap-y-2 mt-3 text-sm">
            <span className="text-[#606060]">SKU</span><span className="text-white light:text-black text-right">{p.codigoSku || '—'}</span>
            <span className="text-[#606060]">Unidad de medida</span>
            <span className="text-white light:text-black text-right">{LABEL_UNIDAD[p.unidadMedida] ?? p.unidadMedida}</span>
            <span className="text-[#606060]">Stock</span>
            <span className="text-right flex items-center justify-end gap-2">
              <span className="text-white light:text-black">
                {p.tipo === 'conjunto' ? '—' : `${p.stock} ${LABEL_UNIDAD[p.unidadMedida] ?? ''}`}
              </span>
              {p.tipo === 'simple' && <StockBadge stock={p.stock} stockMinimo={p.stockMinimo} />}
            </span>
          </div>
        </Card>
      </div>

      {/* Componentes (conjunto) */}
      {p.tipo === 'conjunto' && (
        <Card className="mb-4 hover:border-[#2A2A2A]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] flex items-center gap-1.5"><Boxes size={13} /> Componentes</span>
          <div className="flex flex-col gap-1.5 mt-3">
            {comps.map(c => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span className="text-white light:text-black">{c.cantidad}× {c.componenteNombre}</span>
                <StockBadge stock={c.stockComponente} stockMinimo={0} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Movimientos */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2 flex items-center gap-1.5"><Package size={13} /> Historial de movimientos</span>
      {movimientos.length === 0 ? (
        <p className="text-sm text-[#606060] py-4">Sin movimientos registrados.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-[#606060]">
              <th className="text-left font-medium px-3 py-2">Tipo</th>
              <th className="text-left font-medium px-3 py-2">Cantidad</th>
              <th className="text-left font-medium px-3 py-2">Motivo</th>
              <th className="text-left font-medium px-3 py-2">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map(m => (
              <tr key={m.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                <td className="px-3 py-2.5 text-white light:text-black">{TIPO_MOV[m.tipo]}</td>
                <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{m.cantidad} {LABEL_UNIDAD[p.unidadMedida] ?? ''}</td>
                <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{m.motivo || '—'}</td>
                <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(m.fecha), 'dd/MM/yyyy HH:mm')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ModalAjuste open={ajuste} onClose={() => setAjuste(false)} onConfirm={(cant, tipo, motivo) => { ajustarStock(p.id, cant, tipo, motivo); setAjuste(false) }} stockActual={p.stock} />
    </div>
  )
}

const ModalAjuste = ({ open, onClose, onConfirm, stockActual }: {
  open: boolean; onClose: () => void; onConfirm: (cant: number, tipo: 'entrada' | 'salida' | 'ajuste', motivo: string) => void; stockActual: number
}) => {
  const [tipo, setTipo] = useState<'entrada' | 'salida' | 'ajuste'>('entrada')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  useEffect(() => { if (open) { setTipo('entrada'); setCantidad(''); setMotivo('') } }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Ajustar stock"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={cantidad === ''} onClick={() => onConfirm(Number(cantidad), tipo, motivo.trim() || 'Ajuste manual')}>Confirmar</Button>
      </>}>
      <div className="flex flex-col gap-3 pb-1">
        <p className="text-[11px] text-[#606060]">Stock actual: <span className="text-[#A0A0A0]">{stockActual}</span></p>
        <Select label="Tipo de movimiento" value={tipo} onChange={e => setTipo(e.target.value as any)}>
          <option value="entrada" className="bg-[#141414] light:bg-white">Entrada (sumar)</option>
          <option value="salida" className="bg-[#141414] light:bg-white">Salida (restar)</option>
          <option value="ajuste" className="bg-[#141414] light:bg-white">Ajuste (fijar valor)</option>
        </Select>
        <Input label={tipo === 'ajuste' ? 'Nuevo stock' : 'Cantidad'} type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} />
        <Input label="Motivo" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Recepción de mercadería" />
      </div>
    </Modal>
  )
}
