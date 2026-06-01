import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { useDevolucionesStore } from '../../store/devolucionesStore'
import { usePDF } from '../../hooks/usePDF'
import { useNegocio } from '../../hooks/useNegocio'
import { PDFDevolucion } from '../../lib/pdf/documentos/PDFDevolucion'
import { MOTIVOS_DEVOLUCION, type Devolucion, type OrigenDevolucion, type TipoDevolucion } from '../../types/devoluciones'
import { ArrowLeft, ArrowRight, Search, Minus, Plus, CheckCircle2, Download, RotateCcw, User, Package, CalendarDays } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface ModalDevolucionProps {
  open: boolean
  onClose: () => void
  otNumeroInicial?: number
  onDevolucion?: (d: Devolucion) => void
}

export const ModalDevolucion = ({ open, onClose, otNumeroInicial, onDevolucion }: ModalDevolucionProps) => {
  const { buscarOT, buscarVentaPOS, crearDevolucion } = useDevolucionesStore()
  const negocio = useNegocio()
  const { descargar, generando } = usePDF()

  const [paso, setPaso] = useState<1 | 2 | 3>(1)
  const [tipo, setTipo] = useState<TipoDevolucion>('ot')
  const [numeroInput, setNumeroInput] = useState('')
  const [origen, setOrigen] = useState<OrigenDevolucion | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')

  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [motivo, setMotivo] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [observacion, setObservacion] = useState('')

  const [procesando, setProcesando] = useState(false)
  const [creada, setCreada] = useState<Devolucion | null>(null)

  const reset = () => {
    setPaso(1); setTipo('ot'); setNumeroInput(''); setOrigen(null); setBuscando(false); setErrorBusqueda('')
    setCantidades({}); setMotivo(''); setMotivoOtro(''); setObservacion(''); setProcesando(false); setCreada(null)
  }

  // Pre-carga desde DetalleOT
  useEffect(() => {
    if (!open) return
    reset()
    if (otNumeroInicial != null) {
      setTipo('ot'); setNumeroInput(String(otNumeroInicial))
      ;(async () => {
        setBuscando(true)
        const o = await buscarOT(otNumeroInicial)
        setBuscando(false)
        if (o) { aplicarOrigen(o); setPaso(2) }
      })()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, otNumeroInicial])

  const aplicarOrigen = (o: OrigenDevolucion) => {
    setOrigen(o)
    const init: Record<number, number> = {}
    o.items.forEach(it => { init[it.productoId] = it.cantidadOriginal })
    setCantidades(init)
  }

  const buscar = async () => {
    const num = Number(numeroInput)
    if (!num) return
    setBuscando(true); setErrorBusqueda(''); setOrigen(null)
    const o = tipo === 'ot' ? await buscarOT(num) : await buscarVentaPOS(num)
    setBuscando(false)
    if (o) aplicarOrigen(o)
    else setErrorBusqueda(tipo === 'ot' ? `No se encontró la OT #${num}` : `No se encontró la venta POS #${num}`)
  }

  const setCantidad = (productoId: number, cant: number, max: number) =>
    setCantidades(c => ({ ...c, [productoId]: Math.max(0, Math.min(max, cant)) }))

  const totalDevuelto = useMemo(() => {
    if (!origen) return 0
    return origen.items.reduce((s, it) => s + (cantidades[it.productoId] ?? 0) * it.precioUnitario, 0)
  }, [origen, cantidades])

  const itemsADevolver = useMemo(() =>
    origen ? origen.items.filter(it => (cantidades[it.productoId] ?? 0) > 0) : [],
  [origen, cantidades])

  const motivoFinal = motivo === 'Otro' ? motivoOtro.trim() : motivo
  const puedeConfirmar = itemsADevolver.length > 0 && motivoFinal !== '' && !procesando

  const confirmar = async () => {
    if (!origen || !puedeConfirmar) return
    setProcesando(true)
    const d = await crearDevolucion({
      tipo: origen.tipo,
      otId: origen.otId,
      ventaPosId: origen.ventaPosId,
      clienteId: origen.clienteId,
      clienteNombre: origen.clienteNombre,
      motivo: motivoFinal,
      observacion: observacion.trim() || null,
      items: itemsADevolver.map(it => {
        const cd = cantidades[it.productoId] ?? 0
        return {
          productoId: it.productoId, nombre: it.nombre, cantidadOriginal: it.cantidadOriginal,
          cantidadDevuelta: cd, precioUnitario: it.precioUnitario, subtotalDevuelto: cd * it.precioUnitario,
        }
      }),
    })
    setProcesando(false)
    if (d) { setCreada(d); onDevolucion?.(d) }
  }

  const cerrar = () => { onClose() }

  // ─── Vista de éxito ──────────────────────────────────────────
  if (creada) {
    return (
      <Modal open={open} onClose={cerrar} title="Devolución registrada" maxWidth="max-w-md"
        footer={<Button onClick={cerrar}>Cerrar</Button>}>
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="w-12 h-12 rounded-full bg-[#4CAF7D]/15 flex items-center justify-center"><CheckCircle2 size={26} className="text-[#4CAF7D]" /></div>
          <div>
            <div className="text-base font-semibold text-white light:text-black">Devolución #{String(creada.numero).padStart(3, '0')}</div>
            <div className="text-[12px] text-[#606060]">Stock recuperado · Total devuelto {money(creada.totalDevuelto)}</div>
          </div>
          <Button variant="secondary" size="sm" disabled={generando}
            onClick={() => descargar(<PDFDevolucion devolucion={creada} negocio={negocio} />, `Devolucion-${String(creada.numero).padStart(3, '0')}.pdf`)}>
            <Download size={14} className="mr-1.5" />{generando ? 'Generando...' : 'Descargar documento'}
          </Button>
        </div>
      </Modal>
    )
  }

  // ─── Footer dinámico por paso ────────────────────────────────
  const footer = (
    <div className="flex items-center justify-between w-full">
      {paso > 1 ? (
        <Button variant="ghost" onClick={() => setPaso(p => (p - 1) as 1 | 2 | 3)}><ArrowLeft size={14} className="mr-1" />Anterior</Button>
      ) : <span />}
      {paso === 1 && <Button onClick={() => setPaso(2)} disabled={!origen}>Siguiente<ArrowRight size={14} className="ml-1" /></Button>}
      {paso === 2 && <Button onClick={() => setPaso(3)} disabled={itemsADevolver.length === 0}>Siguiente<ArrowRight size={14} className="ml-1" /></Button>}
      {paso === 3 && <Button onClick={confirmar} disabled={!puedeConfirmar}>{procesando ? 'Procesando...' : 'Confirmar devolución'}</Button>}
    </div>
  )

  return (
    <Modal open={open} onClose={cerrar} title="Nueva devolución" maxWidth="max-w-lg" footer={footer}>
      {/* Indicador de pasos */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3].map(p => (
          <div key={p} className="flex items-center gap-2 flex-1">
            <div className={cn('h-1 flex-1 rounded-full transition-all',
              p <= paso ? 'bg-white light:bg-black' : 'bg-[#2A2A2A] light:bg-[#E4E4E4]')} />
          </div>
        ))}
        <span className="text-[11px] text-[#606060] shrink-0">Paso {paso} de 3</span>
      </div>

      {/* ─── PASO 1 ─── */}
      {paso === 1 && (
        <div className="flex flex-col gap-4 pb-1">
          <p className="text-[13px] text-[#A0A0A0] light:text-[#404040]">¿De dónde viene la devolución?</p>

          <div className="flex flex-col gap-2">
            {([['ot', 'Orden de trabajo'], ['pos', 'Venta POS']] as const).map(([val, label]) => (
              <button key={val} onClick={() => { setTipo(val); setOrigen(null); setErrorBusqueda('') }}
                className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-input border text-left text-[13px] transition-all',
                  tipo === val
                    ? 'border-white text-white bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                    : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-[#3A3A3A] light:border-[#E4E4E4] light:text-[#404040]')}>
                <span className={cn('w-3.5 h-3.5 rounded-full border flex items-center justify-center',
                  tipo === val ? 'border-white light:border-black' : 'border-[#606060]')}>
                  {tipo === val && <span className="w-1.5 h-1.5 rounded-full bg-white light:bg-black" />}
                </span>
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] text-[#606060]">{tipo === 'ot' ? 'Número de OT' : 'Número de venta'}</label>
              <input type="number" min={1} value={numeroInput} onChange={e => setNumeroInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Ej: 1"
                className="px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
            </div>
            <Button variant="secondary" onClick={buscar} disabled={buscando || !numeroInput}>
              <Search size={14} className="mr-1.5" />{buscando ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {errorBusqueda && <p className="text-[12px] text-[#C0392B]">{errorBusqueda}</p>}

          {origen && (
            <div className="rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-3 flex flex-col gap-2 animate-fade-slide-down">
              <div className="flex items-center gap-2 text-[13px] text-white light:text-black"><User size={13} className="text-[#606060]" />{origen.clienteNombre ?? 'Sin cliente'}</div>
              <div className="flex items-start gap-2 text-[13px] text-[#A0A0A0] light:text-[#404040]"><Package size={13} className="text-[#606060] mt-0.5" />
                <span>{origen.items.map(it => `${it.cantidadOriginal}× ${it.nombre}`).join(', ')}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#606060]"><CalendarDays size={12} />{format(new Date(origen.fecha), 'dd/MM/yyyy')}</div>
              <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                <span className="text-[11px] uppercase tracking-wider text-[#606060]">Total original</span>
                <span className="text-base font-bold text-white light:text-black">{money(origen.totalOriginal)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── PASO 2 ─── */}
      {paso === 2 && origen && (
        <div className="flex flex-col gap-3 pb-1">
          <p className="text-[13px] text-[#A0A0A0] light:text-[#404040]">Seleccioná los items y la cantidad a devolver.</p>
          <div className="flex flex-col gap-2">
            {origen.items.map(it => {
              const cd = cantidades[it.productoId] ?? 0
              return (
                <div key={it.productoId} className="rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-white light:text-black truncate">{it.nombre}</div>
                    <div className="text-[11px] text-[#606060]">Original: {it.cantidadOriginal} · {money(it.precioUnitario)} c/u</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCantidad(it.productoId, cd - 1, it.cantidadOriginal)} disabled={cd <= 0}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-white/10 disabled:opacity-30 light:hover:text-black light:hover:bg-black/5"><Minus size={12} /></button>
                      <span className="w-6 text-center text-[13px] text-white light:text-black tabular-nums">{cd}</span>
                      <button onClick={() => setCantidad(it.productoId, cd + 1, it.cantidadOriginal)} disabled={cd >= it.cantidadOriginal}
                        className="w-6 h-6 rounded flex items-center justify-center text-[#A0A0A0] hover:text-white hover:bg-white/10 disabled:opacity-30 light:hover:text-black light:hover:bg-black/5"><Plus size={12} /></button>
                    </div>
                    <span className="w-20 text-right text-[13px] font-semibold text-white light:text-black tabular-nums">{money(cd * it.precioUnitario)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
            <span className="text-[11px] uppercase tracking-wider text-[#606060]">Total a devolver</span>
            <span className="text-xl font-bold text-[#4CAF7D] tabular-nums">{money(totalDevuelto)}</span>
          </div>
        </div>
      )}

      {/* ─── PASO 3 ─── */}
      {paso === 3 && origen && (
        <div className="flex flex-col gap-4 pb-1">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] text-white light:text-black">Motivo de devolución *</span>
            {MOTIVOS_DEVOLUCION.map(m => (
              <button key={m} onClick={() => setMotivo(m)}
                className={cn('flex items-center gap-2.5 px-3 py-2 rounded-input border text-left text-[13px] transition-all',
                  motivo === m
                    ? 'border-white text-white bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                    : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-[#3A3A3A] light:border-[#E4E4E4] light:text-[#404040]')}>
                <span className={cn('w-3.5 h-3.5 rounded-full border flex items-center justify-center',
                  motivo === m ? 'border-white light:border-black' : 'border-[#606060]')}>
                  {motivo === m && <span className="w-1.5 h-1.5 rounded-full bg-white light:bg-black" />}
                </span>
                {m}
              </button>
            ))}
            {motivo === 'Otro' && (
              <input value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} placeholder="Especificá el motivo..."
                className="px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-[#606060]">Observación (opcional)</label>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2} placeholder="Detalle adicional..."
              className="w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none resize-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>

          <div className="rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white p-3 flex flex-col gap-2">
            <span className="text-[11px] uppercase tracking-wider text-[#606060]">Resumen</span>
            <div className="flex justify-between text-[13px]"><span className="text-[#A0A0A0] light:text-[#404040]">Items a devolver</span><span className="text-white light:text-black">{itemsADevolver.length}</span></div>
            <div className="flex flex-col gap-1">
              {itemsADevolver.map(it => (
                <div key={it.productoId} className="flex items-center gap-1.5 text-[12px] text-[#606060]">
                  <RotateCcw size={11} className="text-[#4CAF7D]" />
                  <span className="text-[#A0A0A0] light:text-[#404040]">+{cantidades[it.productoId]} {it.nombre}</span>
                  <span className="ml-auto">stock recuperado</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
              <span className="text-[11px] uppercase tracking-wider text-[#606060]">Total a devolver</span>
              <span className="text-lg font-bold text-[#4CAF7D] tabular-nums">{money(totalDevuelto)}</span>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
