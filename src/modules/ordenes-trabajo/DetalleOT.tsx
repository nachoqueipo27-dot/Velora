import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Textarea } from '../../components/ui/Textarea'
import { useOTStore } from '../../store/otStore'
import type { OrdenTrabajo } from '../../types/ordenesTrabajo'
import { EstadoBadgeOT } from './components/EstadoBadgeOT'
import { EtiquetaChip } from './components/EtiquetaChip'
import { ModalCancelacion } from './ModalCancelacion'
import { ModalDevolucion } from '../devoluciones/ModalDevolucion'
import { HistorialDevoluciones } from '../devoluciones/HistorialDevoluciones'
import type { Devolucion } from '../../types/devoluciones'
import { usePDF } from '../../hooks/usePDF'
import { useNegocio } from '../../hooks/useNegocio'
import { useOnboardingStore } from '../../store/onboardingStore'
import { PDFOrdenTrabajo } from '../../lib/pdf/documentos/PDFOrdenTrabajo'
import { imprimirTicket } from '../../lib/ticket/generarTicket'
import { toast } from '../../store/toastStore'
import { ArrowLeft, User, ShieldCheck, Printer, Download, Copy, Play, Check, PackageCheck, X, RotateCcw } from 'lucide-react'
import { format } from 'date-fns'

interface DetalleOTProps { onVolver: () => void }

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const DetalleOT = ({ onVolver }: DetalleOTProps) => {
  const { otActiva: o, notas, cargarNotas, agregarNota, cambiarEstado, duplicarOT } = useOTStore()
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()
  const anchoPapel = useOnboardingStore(s => s.data.anchoPapel) ?? '80mm'
  const [nota, setNota] = useState('')
  const [cancelar, setCancelar] = useState(false)
  const [devolucion, setDevolucion] = useState(false)

  useEffect(() => { if (o) cargarNotas(o.id) }, [o, cargarNotas])

  if (!o) return null

  const garantiaDiasRestantes = o.garantiaVence ? Math.ceil((new Date(o.garantiaVence).getTime() - Date.now()) / 86400000) : null
  const permiteDevolucion = o.estado === 'entregado' || o.estado === 'finalizado'

  const onDevolucion = (d: Devolucion) => toast.success(`Devolución #${String(d.numero).padStart(3, '0')} registrada`)

  const descargarPDF = async () => {
    await descargar(
      <PDFOrdenTrabajo ot={o} negocio={negocio} fecha={format(new Date(), 'dd/MM/yyyy HH:mm')} />,
      `OT-${String(o.numero).padStart(3, '0')}.pdf`,
    )
  }

  const imprimir = async () => {
    await imprimirTicket({
      negocio: { nombre: negocio.nombre, direccion: negocio.direccion, telefono: negocio.telefono },
      numero: String(o.numero).padStart(3, '0'),
      cliente: o.clienteNombre,
      items: [{ nombre: o.productoNombre, cantidad: 1, precio: o.totalFinal }],
      subtotal: o.precio, descuento: Math.max(0, o.precio - o.totalFinal), total: o.totalFinal,
      formaPago: '—', fecha: format(new Date(), 'dd/MM/yyyy HH:mm'), anchoPapel,
    })
    toast.success('Ticket enviado a impresión')
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onVolver} className="p-1.5 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all"><ArrowLeft size={16} /></button>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-white light:text-black">OT #{String(o.numero).padStart(3, '0')}</h2>
              <EstadoBadgeOT estado={o.estado} />
            </div>
            <span className="text-[11px] text-[#606060] flex items-center gap-1.5">{o.clienteNombre} · <User size={11} /> {o.empleadoNombre ?? 'Sin asignar'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => duplicarOT(o.id)}><Copy size={14} className="mr-1.5" /> Duplicar</Button>
          {permiteDevolucion && (
            <Button size="sm" variant="secondary" onClick={() => setDevolucion(true)}><RotateCcw size={14} className="mr-1.5" /> Registrar devolución</Button>
          )}
          {accionesOT(o, { cambiarEstado, setCancelar })}
        </div>
      </div>

      {/* Producto */}
      <Card className="mb-4 hover:border-[#2A2A2A]">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Producto</span>
            <div className="text-base text-white light:text-black font-medium mt-1">{o.productoNombre}</div>
            <div className="text-[11px] text-[#606060]">{o.tipoItem === 'conjunto' ? 'Conjunto' : 'Simple'}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-[#A0A0A0] light:text-[#404040]">Precio: {money(o.precio)}</div>
            {o.descuento > 0 && <div className="text-[11px] text-[#C0392B]">Desc: {o.tipoDescuento === 'porcentaje' ? `${o.descuento}%` : money(o.descuento)}</div>}
            <div className="text-xl font-bold text-white light:text-black mt-1">{money(o.totalFinal)}</div>
          </div>
        </div>
      </Card>

      {o.etiquetas.length > 0 && <div className="flex gap-1.5 mb-4">{o.etiquetas.map(e => <EtiquetaChip key={e.id} etiqueta={e} />)}</div>}
      {o.descripcion && <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] mb-4">{o.descripcion}</p>}

      {/* Garantía */}
      {o.garantiaVence && (
        <div className="flex items-center gap-2 mb-4 rounded-input bg-[#4CAF7D]/10 px-3 py-2 text-[13px] text-[#4CAF7D]">
          <ShieldCheck size={15} /> Garantía vigente hasta {format(new Date(o.garantiaVence), 'dd/MM/yyyy')}
          {garantiaDiasRestantes !== null && garantiaDiasRestantes >= 0 && <span className="text-[#606060]">({garantiaDiasRestantes} días restantes)</span>}
        </div>
      )}

      {o.estado === 'cancelado' && o.motivoCancelacion && (
        <div className="rounded-input bg-[#C0392B]/10 px-3 py-2 text-[13px] text-[#C0392B] mb-4">Cancelada · Motivo: {o.motivoCancelacion}</div>
      )}

      {/* Ticket térmico + PDF */}
      <div className="flex gap-2 mb-4">
        <Button size="sm" variant="secondary" onClick={imprimir}><Printer size={14} className="mr-1.5" /> Imprimir ticket</Button>
        <Button size="sm" variant="secondary" onClick={descargarPDF} disabled={generando}><Download size={14} className="mr-1.5" /> {generando ? 'Generando...' : 'Descargar PDF'}</Button>
      </div>

      {/* Notas internas */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-2">Notas internas</span>
      <div className="flex gap-2 mb-3">
        <Textarea rows={1} value={nota} onChange={e => setNota(e.target.value)} placeholder="Agregar nota interna..." className="flex-1" />
        <Button size="sm" onClick={() => { if (nota.trim()) { agregarNota(o.id, nota.trim()); setNota('') } }} disabled={nota.trim() === ''}>Agregar</Button>
      </div>
      <div className="flex flex-col gap-2">
        {notas.length === 0 ? <p className="text-[13px] text-[#606060]">Sin notas todavía.</p> : notas.map(n => (
          <div key={n.id} className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] px-3 py-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] font-medium text-white light:text-black">{n.creadoPor}</span>
              <span className="text-[10px] text-[#606060]">{format(new Date(n.creadoEn), 'dd/MM/yyyy HH:mm')}</span>
            </div>
            <p className="text-[13px] text-[#A0A0A0] light:text-[#404040]">{n.nota}</p>
          </div>
        ))}
      </div>

      {/* Devoluciones */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Devoluciones</span>
          {permiteDevolucion && (
            <button onClick={() => setDevolucion(true)} className="text-[11px] text-[#606060] hover:text-white light:hover:text-black transition-colors flex items-center gap-1">
              <RotateCcw size={11} /> Registrar
            </button>
          )}
        </div>
        <HistorialDevoluciones filtroOtId={o.id} compacto />
      </div>

      <ModalCancelacion open={cancelar} ot={o} onClose={() => setCancelar(false)} />
      <ModalDevolucion open={devolucion} onClose={() => setDevolucion(false)} otNumeroInicial={o.numero} onDevolucion={onDevolucion} />
    </div>
  )
}

function accionesOT(o: OrdenTrabajo, h: { cambiarEstado: (id: number, e: any) => void; setCancelar: (v: boolean) => void }) {
  const cancelarBtn = <Button key="cancel" size="sm" variant="danger" onClick={() => h.setCancelar(true)}><X size={14} className="mr-1.5" /> Cancelar</Button>
  if (o.estado === 'recepcion') return <>
    <Button size="sm" onClick={() => h.cambiarEstado(o.id, 'en_proceso')}><Play size={14} className="mr-1.5" /> En proceso</Button>
    {cancelarBtn}
  </>
  if (o.estado === 'en_proceso') return <>
    <Button size="sm" onClick={() => h.cambiarEstado(o.id, 'finalizado')}><Check size={14} className="mr-1.5" /> Finalizar</Button>
    <Button size="sm" variant="secondary" onClick={() => h.cambiarEstado(o.id, 'entregado')}><PackageCheck size={14} className="mr-1.5" /> Entregar</Button>
    {cancelarBtn}
  </>
  if (o.estado === 'finalizado') return <>
    <Button size="sm" onClick={() => h.cambiarEstado(o.id, 'entregado')}><PackageCheck size={14} className="mr-1.5" /> Entregar</Button>
    {cancelarBtn}
  </>
  return null
}
