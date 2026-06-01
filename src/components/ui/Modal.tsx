import { cn } from '../../lib/utils'
import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export const Modal = ({ open, onClose, title, children, footer, maxWidth = 'max-w-md' }: ModalProps) => {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-[3px] animate-overlay-in"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={e => e.stopPropagation()}
        className={cn(
          'w-full rounded-modal border shadow-2xl animate-modal-in flex flex-col max-h-[90vh]',
          'border-[#2A2A2A] bg-[#141414]',
          'light:border-[#E4E4E4] light:bg-white',
          maxWidth,
        )}
      >
        <div className="flex items-center justify-between p-5 pb-3 shrink-0">
          <h3 className="text-base font-semibold text-white light:text-black">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1 rounded-input text-[#808080] hover:text-white hover:bg-white/10 light:text-[#707070] light:hover:text-black light:hover:bg-black/5 transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-5 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="flex justify-end gap-2 p-5 pt-4 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
