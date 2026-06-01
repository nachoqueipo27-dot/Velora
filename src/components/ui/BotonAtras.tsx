import { ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/utils'

interface BotonAtrasProps {
  onClick: () => void
  label?: string
}

// Flecha "atrás" para pantallas lineales de auth/selección (sin Navbar).
// Fija arriba a la izquierda.
export const BotonAtras = ({ onClick, label = 'Atrás' }: BotonAtrasProps) => (
  <button
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'fixed top-4 left-4 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-input text-[12px] transition-all duration-150',
      'text-[#808080] hover:text-white hover:bg-white/10',
      'light:text-[#707070] light:hover:text-black light:hover:bg-black/5',
    )}
  >
    <ArrowLeft size={16} />
    <span>{label}</span>
  </button>
)
