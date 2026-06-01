import type { ReactNode } from 'react'

interface SeccionUsoProps {
  titulo: string
  children: ReactNode
}

export const SeccionUso = ({ titulo, children }: SeccionUsoProps) => (
  <section className="animate-fade-slide-down">
    <h3 className="text-[18px] font-semibold text-white light:text-black">{titulo}</h3>
    <div className="mt-2 mb-4 h-px bg-[#2A2A2A] light:bg-[#E4E4E4]" />
    <div className="flex flex-col gap-3 text-[14px] leading-relaxed text-[#B8B8B8] light:text-[#404040]">
      {children}
    </div>
  </section>
)
