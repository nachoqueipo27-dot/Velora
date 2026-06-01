import { cn } from '../../lib/utils'
import { useToastStore, type ToastVariant } from '../../store/toastStore'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const CONFIG: Record<ToastVariant, { icon: React.ReactNode; color: string; barra: string }> = {
  success: { icon: <CheckCircle2 size={16} />, color: '#4CAF7D', barra: 'bg-[#4CAF7D]' },
  error:   { icon: <XCircle size={16} />,      color: '#E0594A', barra: 'bg-[#C0392B]' },
  warning: { icon: <AlertTriangle size={16} />, color: '#D4921A', barra: 'bg-[#D4921A]' },
  info:    { icon: <Info size={16} />,         color: '#6FA8D0', barra: 'bg-[#4A7FA5]' },
}

export const ToastContainer = () => {
  const { toasts, eliminar } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[1000] flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)]"
      aria-live="polite" aria-atomic="false">
      {toasts.map(t => {
        const c = CONFIG[t.variante]
        return (
          <div key={t.id} role="status"
            className={cn(
              'relative overflow-hidden flex items-start gap-2.5 rounded-card border p-3 shadow-2xl animate-toast-in',
              'border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white',
            )}>
            <span className="shrink-0 mt-0.5" style={{ color: c.color }}>{c.icon}</span>
            <p className="flex-1 text-sm leading-snug text-white light:text-black break-words">{t.mensaje}</p>
            <button onClick={() => eliminar(t.id)} aria-label="Cerrar notificación"
              className="shrink-0 p-0.5 rounded text-[#808080] hover:text-white light:hover:text-black transition-colors">
              <X size={14} />
            </button>
            {/* Barra de progreso */}
            <span
              className={cn('absolute bottom-0 left-0 h-0.5 origin-left', c.barra)}
              style={{ width: '100%', animation: `toastBar ${t.duracion}ms linear forwards` }}
            />
          </div>
        )
      })}
      {/* Keyframe local para la barra (depende de la duración) */}
      <style>{`@keyframes toastBar { from { transform: scaleX(1) } to { transform: scaleX(0) } }`}</style>
    </div>
  )
}
