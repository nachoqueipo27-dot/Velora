import { useEffect, useState } from 'react'
import { Modal } from '../../../components/ui/Modal'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { useCajaStore } from '../../../store/cajaStore'
import { CATEGORIAS_GASTO, type GastoOperativo } from '../../../types/caja'
import { Paperclip } from 'lucide-react'

interface ModalGastoProps {
  open: boolean
  onClose: () => void
  gasto?: GastoOperativo | null
}

const hoy = () => new Date().toISOString().split('T')[0]

export const ModalGasto = ({ open, onClose, gasto }: ModalGastoProps) => {
  const { agregarGasto, editarGasto } = useCajaStore()
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_GASTO[0])
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoy())
  const [comprobante, setComprobante] = useState<string>('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!open) return
    if (gasto) {
      setCategoria(gasto.categoria)
      setDescripcion(gasto.descripcion ?? '')
      setMonto(String(gasto.monto))
      setFecha(gasto.fecha.split('T')[0])
      setComprobante(gasto.comprobante ?? '')
    } else {
      setCategoria(CATEGORIAS_GASTO[0]); setDescripcion(''); setMonto(''); setFecha(hoy()); setComprobante('')
    }
  }, [open, gasto])

  const montoNum = Number(monto) || 0
  const valido = montoNum > 0 && categoria

  const guardar = async () => {
    if (!valido || guardando) return
    setGuardando(true)
    const data = { monto: montoNum, categoria, descripcion, fecha, comprobante }
    if (gasto) await editarGasto(gasto.id, data)
    else await agregarGasto(data)
    setGuardando(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={gasto ? 'Editar gasto' : 'Nuevo gasto'} maxWidth="max-w-md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button onClick={guardar} disabled={!valido || guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
      </>}>
      <div className="flex flex-col gap-3 pb-1">
        <Select label="Categoría" value={categoria} onChange={e => setCategoria(e.target.value)}>
          {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Textarea label="Descripción (opcional)" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={2} />
        <div className="flex gap-3">
          <Input label="Monto" type="number" min={0} value={monto} onChange={e => setMonto(e.target.value)} placeholder="0" className="flex-1" />
          <Input label="Fecha" type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="flex-1" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Comprobante (opcional)</label>
          <label className="flex items-center gap-2 px-3 py-2 text-sm rounded-input border border-dashed cursor-pointer transition-all
            border-[#2A2A2A] text-[#A0A0A0] hover:border-white/40 light:border-[#E4E4E4] light:text-[#404040] light:hover:border-black/30">
            <Paperclip size={14} />
            <span className="truncate">{comprobante || 'Adjuntar archivo'}</span>
            <input type="file" className="hidden" onChange={e => setComprobante(e.target.files?.[0]?.name ?? '')} />
          </label>
        </div>
      </div>
    </Modal>
  )
}
