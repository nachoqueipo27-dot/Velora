import { useEffect, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { useOTStore } from '../../store/otStore'
import { MOTIVOS_CANCELACION_OT, type OrdenTrabajo, type ComponenteCancelacion } from '../../types/ordenesTrabajo'
import { AlertTriangle } from 'lucide-react'

interface ModalCancelacionProps {
  open: boolean
  onClose: () => void
  ot: OrdenTrabajo | null
}

export const ModalCancelacion = ({ open, onClose, ot }: ModalCancelacionProps) => {
  const { cancelarOT, componentesDeConjunto } = useOTStore()
  const [motivo, setMotivo] = useState('')
  const [motivoOtro, setMotivoOtro] = useState('')
  const [recuperarGlobal, setRecuperarGlobal] = useState(true)
  const [componentes, setComponentes] = useState<ComponenteCancelacion[]>([])
  const [confirmText, setConfirmText] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (!open || !ot) return
    setMotivo(''); setMotivoOtro(''); setRecuperarGlobal(true); setConfirmText('')
    if (ot.tipoItem === 'conjunto') {
      componentesDeConjunto(ot.productoId).then(setComponentes)
    } else {
      setComponentes([{ productoId: ot.productoId, nombre: ot.productoNombre, cantidad: 1, recuperar: true }])
    }
  }, [open, ot, componentesDeConjunto])

  if (!ot) return null
  const esConjunto = ot.tipoItem === 'conjunto'

  // Para simple: el checkbox global manda. Para conjunto: cada componente.
  const componentesEfectivos: ComponenteCancelacion[] = esConjunto
    ? componentes
    : componentes.map(c => ({ ...c, recuperar: recuperarGlobal }))

  const motivoFinal = motivo === 'Otro' ? motivoOtro.trim() : motivo
  const puedeConfirmar = motivoFinal !== '' && confirmText === 'CANCELAR' && !procesando

  const toggleComp = (productoId: number) =>
    setComponentes(cs => cs.map(c => c.productoId === productoId ? { ...c, recuperar: !c.recuperar } : c))

  const handleConfirmar = async () => {
    if (!puedeConfirmar) return
    setProcesando(true)
    try {
      await cancelarOT(ot.id, motivoFinal, componentesEfectivos)
      onClose()
    } finally {
      setProcesando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Cancelar OT #${String(ot.numero).padStart(3, '0')}`} maxWidth="max-w-lg"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={procesando}>Volver</Button>
        <Button variant="danger" onClick={handleConfirmar} disabled={!puedeConfirmar}>Confirmar</Button>
      </>}>
      <div className="flex flex-col gap-4 pb-1">
        <div className="flex items-start gap-2 rounded-input bg-[#C0392B]/10 px-3 py-2.5">
          <AlertTriangle size={16} className="text-[#C0392B] shrink-0 mt-0.5" />
          <p className="text-[13px] text-[#A0A0A0] light:text-[#404040]">Estás por cancelar esta orden de trabajo. Esta acción no se puede deshacer.</p>
        </div>

        {/* Motivo */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">¿Por qué se cancela?</span>
          <div className="flex flex-col gap-1">
            {MOTIVOS_CANCELACION_OT.map(m => (
              <label key={m} className="flex items-center gap-2 text-[13px] cursor-pointer text-[#A0A0A0] light:text-[#404040]">
                <input type="radio" name="motivo-cancel" checked={motivo === m} onChange={() => setMotivo(m)} className="accent-[#C0392B]" />
                {m}
              </label>
            ))}
          </div>
          {motivo === 'Otro' && <Input placeholder="Especificar motivo" value={motivoOtro} onChange={e => setMotivoOtro(e.target.value)} autoFocus />}
        </div>

        {/* Productos */}
        <div className="flex flex-col gap-2 pt-1 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">
            Productos en esta OT · <span className="text-[#606060]">{esConjunto ? 'Conjunto' : 'Simple'}</span>
          </span>

          {!esConjunto ? (
            <div className="flex gap-3">
              {[{ v: true, l: 'Se recuperan los productos' }, { v: false, l: 'Productos perdidos' }].map(opt => (
                <label key={String(opt.v)} className="flex items-center gap-2 text-[13px] cursor-pointer text-[#A0A0A0] light:text-[#404040]">
                  <input type="radio" name="recuperar-global" checked={recuperarGlobal === opt.v} onChange={() => setRecuperarGlobal(opt.v)} className="accent-[#4CAF7D]" />
                  {opt.l}
                </label>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-[#606060]">Tildá los componentes que se recuperan al stock:</span>
              {componentes.map(c => (
                <label key={c.productoId} className="flex items-center gap-2 text-[13px] cursor-pointer text-[#A0A0A0] light:text-[#404040]">
                  <input type="checkbox" checked={c.recuperar} onChange={() => toggleComp(c.productoId)} className="accent-[#4CAF7D]" />
                  {c.nombre} <span className="text-[11px] text-[#606060]">×{c.cantidad}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Resumen de stock en tiempo real */}
        <div className="flex flex-col gap-1 rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Resumen de stock</span>
          {componentesEfectivos.map(c => (
            <div key={c.productoId} className="flex items-center gap-2 text-[13px]">
              {c.recuperar
                ? <span className="text-[#4CAF7D]">+ {c.nombre} ×{c.cantidad} → se devuelve</span>
                : <span className="text-[#C0392B]">− {c.nombre} ×{c.cantidad} → se pierde</span>}
            </div>
          ))}
        </div>

        {/* Confirmación */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Para confirmar escribí: <span className="text-white light:text-black font-semibold">CANCELAR</span></span>
          <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="CANCELAR" />
        </div>
      </div>
    </Modal>
  )
}
