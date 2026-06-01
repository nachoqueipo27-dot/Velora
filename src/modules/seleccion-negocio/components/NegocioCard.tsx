import { cn } from '../../../lib/utils'

interface NegocioCardProps {
  nombre: string
  logo?: string | null
  subtitulo?: string
  onClick: () => void
  activo?: boolean
}

const iniciales = (n: string) =>
  n.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || 'V'

export const NegocioCard = ({ nombre, logo, subtitulo, onClick, activo }: NegocioCardProps) => (
  <button
    onClick={onClick}
    className={cn(
      'group flex flex-col items-start gap-3 w-full rounded-card border p-5 text-left transition-all duration-200',
      'border-[#2A2A2A] bg-[#141414] hover:-translate-y-0.5 hover:border-[#3A3A3A] hover:shadow-lg hover:scale-[1.02]',
      'light:border-[#E4E4E4] light:bg-white light:hover:border-[#D0D0D0]',
      activo && 'border-l-2 border-l-white light:border-l-black',
    )}
  >
    <div className="w-12 h-12 rounded-modal overflow-hidden flex items-center justify-center shrink-0
      bg-[#1C1C1C] text-[#A0A0A0] light:bg-[#F4F4F4] light:text-[#404040]">
      {logo
        ? <img src={logo} alt="" className="w-full h-full object-cover" />
        : <span className="text-sm font-bold">{iniciales(nombre)}</span>}
    </div>
    <div className="min-w-0 w-full">
      <div className="text-[15px] font-semibold text-white light:text-black truncate">{nombre}</div>
      {subtitulo && <div className="text-[12px] text-[#808080] light:text-[#707070] truncate mt-0.5">{subtitulo}</div>}
    </div>
  </button>
)
