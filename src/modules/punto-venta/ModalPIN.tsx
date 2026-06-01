import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { Modal } from '../../components/ui/Modal'
import { usePosStore } from '../../store/posStore'
import { Delete } from 'lucide-react'

interface ModalPINProps {
  open: boolean
  onClose: () => void
  onOk?: () => void
}

const TECLAS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export const ModalPIN = ({ open, onClose, onOk }: ModalPINProps) => {
  const { verificarPIN } = usePosStore()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => { if (open) { setPin(''); setError(false) } }, [open])

  const presionar = (d: string) => {
    if (pin.length >= 4) return
    const next = pin + d
    setPin(next); setError(false)
    if (next.length === 4) verificar(next)
  }

  const verificar = async (codigo: string) => {
    const ok = await verificarPIN(codigo)
    if (ok) { onOk?.(); onClose() }
    else { setError(true); setTimeout(() => { setPin(''); setError(false) }, 600) }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ingresar PIN" maxWidth="max-w-xs">
      <div className="flex flex-col items-center gap-5 pb-3">
        <p className="text-[11px] text-[#606060]">Ingresá tu PIN de 4 dígitos</p>

        {/* Puntos */}
        <div className="flex gap-3">
          {[0, 1, 2, 3].map(i => (
            <span key={i} className={cn('w-3.5 h-3.5 rounded-full border transition-all',
              error ? 'border-[#C0392B]' : 'border-[#606060]',
              i < pin.length && (error ? 'bg-[#C0392B] border-[#C0392B]' : 'bg-white border-white light:bg-black light:border-black'))} />
          ))}
        </div>
        {error && <span className="text-[12px] text-[#C0392B] -mt-2">PIN incorrecto</span>}

        {/* Teclado */}
        <div className="grid grid-cols-3 gap-2">
          {TECLAS.map(t => (
            <button key={t} onClick={() => presionar(t)}
              className={cn('w-16 h-14 rounded-input border text-lg font-medium transition-all',
                'border-[#2A2A2A] text-white hover:bg-white/[0.06] active:scale-95',
                'light:border-[#E4E4E4] light:text-black light:hover:bg-black/[0.04]')}>
              {t}
            </button>
          ))}
          <div />
          <button onClick={() => presionar('0')}
            className={cn('w-16 h-14 rounded-input border text-lg font-medium transition-all',
              'border-[#2A2A2A] text-white hover:bg-white/[0.06] active:scale-95',
              'light:border-[#E4E4E4] light:text-black light:hover:bg-black/[0.04]')}>0</button>
          <button onClick={() => setPin(p => p.slice(0, -1))}
            className={cn('w-16 h-14 rounded-input border flex items-center justify-center transition-all',
              'border-[#2A2A2A] text-[#A0A0A0] hover:bg-white/[0.06] active:scale-95',
              'light:border-[#E4E4E4] light:text-[#404040] light:hover:bg-black/[0.04]')}><Delete size={18} /></button>
        </div>
      </div>
    </Modal>
  )
}
