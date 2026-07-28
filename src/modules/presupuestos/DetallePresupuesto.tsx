import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Select } from '../../components/ui/Select'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { usePresupuestosStore } from '../../store/presupuestosStore'
import { MOTIVOS_RECHAZO, type Presupuesto } from '../../types/presupuestos'
import { UNIDADES_MEDIDA } from '../../types/inventario'
import { EstadoBadge } from './components/EstadoBadge'
import { VigenciaIndicador } from './components/VigenciaIndicador'
import { usePDF } from '../../hooks/usePDF'
import { useNegocio } from '../../hooks/useNegocio'
import { PDFPresupuesto } from '../../lib/pdf/documentos/PDFPresupuesto'
import { ArrowLeft, Download, Send, Check, X, RefreshCw, ArrowRightCircle } from 'lucide-react'
import { format } from 'date-fns'

interface DetallePresupuestoProps {
  onVolver: () => void
  onEditar: (p: Presupuesto) => void
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const numFmt = (n: number) => `#${String(n).padStart(3, '0')}`
const LABEL_UNIDAD: Record<string, string> = Object.fromEntries(UNIDADES_MEDIDA.map(u => [u.value, u.label]))

export const DetallePresupuesto = ({ onVolver, onEditar }: DetallePresupuestoProps) => {
  const { presupuestoActivo: p, items, cargarItems, cambiarEstado, reenviar, convertirAOT } = usePresupuestosStore()
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const [rechazar, setRechazar] = useState(false)
  const [motivo, setMotivo] = useState(MOTIVOS_RECHAZO[0])
  const [motivoOtro, setMotivoOtro] = useState('')
  const [convertir, setConvertir] = useState(false)

  useEffect(() => { if (p) cargarItems(p.id) }, [p, cargarItems])

  if (!p) return null

  const descargarPDF = async () => {
    await descargar(
      <PDFPresupuesto presupuesto={p} items={items} negocio={negocio} />,
      `Presupuesto-${String(p.numero).padStart(3, '0')}.pdf`,
    )
  }

  const confirmarRechazo = () => {
    const m = motivo === 'Otro' ? (motivoOtro.trim() || 'Otro') : motivo
    cambiarEstado(p.id, 'rechazado', m)
    setRechazar(false); setMotivoOtro(''); setMotivo(MOTIVOS_RECHAZO[0])
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onVolver} className="p-1.5 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all"><ArrowLeft size={16} /></button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white light:text-black">Presupuesto {numFmt(p.numero)}</h2>
              <EstadoBadge estado={p.estado} />
            </div>
            <span className="text-[11px] text-[#606060]">{p.clienteNombre} · creado {format(new Date(p.creadoEn), 'dd/MM/yyyy')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={descargarPDF} disabled={generando}><Download size={14} className="mr-1.5" /> {generando ? 'Generando...' : 'PDF'}</Button>
          {accionesEstado(p, { onEditar, cambiarEstado, reenviar, setRechazar, setConvertir })}
        </div>
      </div>

      {/* Vigencia */}
      <div className="mb-4">
        <VigenciaIndicador fechaVigencia={p.fechaVigencia} estado={p.estado} className="text-sm font-medium" />
        {p.estado === 'rechazado' && p.motivoRechazo && (
          <span className="ml-3 text-[11px] text-[#C0392B]">Motivo: {p.motivoRechazo}</span>
        )}
        {p.estado === 'convertido' && (
          <span className="ml-3 text-[11px] text-[#9B86FF]">{p.otId ? `Convertido en OT #${p.otId}` : 'Convertido (OT se vinculará en Paso 9)'}</span>
        )}
      </div>

      {p.descripcion && <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] mb-4">{p.descripcion}</p>}

      {/* Items */}
      <table className="w-full text-sm border-collapse mb-4">
        <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
          <th className="text-left font-medium px-3 py-2">Item</th>
          <th className="text-left font-medium px-3 py-2">Tipo</th>
          <th className="text-right font-medium px-3 py-2">Cant.</th>
          <th className="text-right font-medium px-3 py-2">P. unit.</th>
          <th className="text-right font-medium px-3 py-2">Desc.</th>
          <th className="text-right font-medium px-3 py-2">Subtotal</th>
        </tr></thead>
        <tbody>
          {items.map(i => (
            <tr key={i.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
              <td className="px-3 py-2.5 text-white light:text-black font-medium">{i.nombre}</td>
              <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{i.tipoItem === 'conjunto' ? 'Conjunto' : 'Simple'}</td>
              <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{i.cantidad} {LABEL_UNIDAD[i.unidadMedida] ?? ''}</td>
              <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(i.precioUnitario)}</td>
              <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{i.descuentoItem ? money(i.descuentoItem) : '—'}</td>
              <td className="px-3 py-2.5 text-right text-white light:text-black">{money(i.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Resumen financiero */}
      <Card className="self-end w-64 hover:border-[#2A2A2A]">
        <div className="flex justify-between text-sm py-1">
          <span className="text-[#606060]">Subtotal</span>
          <span className="text-white light:text-black">{money(p.subtotal)}</span>
        </div>
        {p.descuento > 0 && (
          <div className="flex justify-between text-sm py-1">
            <span className="text-[#606060]">Descuento</span>
            <span className="text-[#C0392B]">- {p.tipoDescuento === 'porcentaje' ? `${p.descuento}%` : money(p.descuento)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-2 mt-1 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
          <span className="text-[11px] uppercase tracking-wider text-[#606060]">Total final</span>
          <span className="text-xl font-bold text-white light:text-black">{money(p.totalFinal)}</span>
        </div>
      </Card>

      {/* Modal rechazo */}
      <Modal open={rechazar} onClose={() => setRechazar(false)} title="Rechazar presupuesto"
        footer={<>
          <Button variant="ghost" onClick={() => setRechazar(false)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmarRechazo}>Rechazar</Button>
        </>}>
        <div className="flex flex-col gap-3 pb-1">
          <Select label="Motivo del rechazo" value={motivo} onChange={e => setMotivo(e.target.value)}>
            {MOTIVOS_RECHAZO.map(m => <option key={m} value={m} className="bg-[#141414] light:bg-white">{m}</option>)}
          </Select>
          {motivo === 'Otro' && <Input label="Especificar" value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} autoFocus />}
        </div>
      </Modal>

      {/* Modal convertir */}
      <Modal open={convertir} onClose={() => setConvertir(false)} title="Convertir a Orden de Trabajo"
        footer={<>
          <Button variant="ghost" onClick={() => setConvertir(false)}>Cancelar</Button>
          <Button onClick={() => { convertirAOT(p.id); setConvertir(false) }}>Convertir</Button>
        </>}>
        <p className="text-sm text-white light:text-black pb-1">¿Convertir este presupuesto en una Orden de Trabajo?</p>
        <p className="text-[11px] text-[#606060] pb-2">Se creará la OT con los productos del presupuesto.</p>
      </Modal>
    </div>
  )
}

function accionesEstado(
  p: Presupuesto,
  h: {
    onEditar: (p: Presupuesto) => void
    cambiarEstado: (id: number, estado: any, motivo?: string) => void
    reenviar: (id: number) => void
    setRechazar: (v: boolean) => void
    setConvertir: (v: boolean) => void
  },
) {
  if (p.estado === 'borrador') return (
    <>
      <Button size="sm" variant="secondary" onClick={() => h.onEditar(p)}>Editar</Button>
      <Button size="sm" onClick={() => h.cambiarEstado(p.id, 'enviado')}><Send size={14} className="mr-1.5" /> Enviar</Button>
    </>
  )
  if (p.estado === 'enviado') return (
    <>
      <Button size="sm" variant="secondary" onClick={() => h.reenviar(p.id)}><RefreshCw size={14} className="mr-1.5" /> Reenviar</Button>
      <Button size="sm" variant="danger" onClick={() => h.setRechazar(true)}><X size={14} className="mr-1.5" /> Rechazar</Button>
      <Button size="sm" onClick={() => h.cambiarEstado(p.id, 'aprobado')}><Check size={14} className="mr-1.5" /> Aprobar</Button>
    </>
  )
  if (p.estado === 'aprobado') return (
    <Button size="sm" onClick={() => h.setConvertir(true)}><ArrowRightCircle size={14} className="mr-1.5" /> Convertir a OT</Button>
  )
  return null
}
