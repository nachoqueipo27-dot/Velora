interface PasoUsoProps {
  numero: number
  titulo: string
  descripcion: string
  ultimo?: boolean
}

export const PasoUso = ({ numero, titulo, descripcion, ultimo }: PasoUsoProps) => (
  <div className="flex gap-3">
    {/* Número + línea conectora */}
    <div className="flex flex-col items-center shrink-0">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold
        bg-[#4A7FA5]/15 text-[#6FA8D0] light:bg-[#4A7FA5]/15 light:text-[#3A6585]">
        {numero}
      </div>
      {!ultimo && <div className="w-px flex-1 my-1 bg-[#2A2A2A] light:bg-[#E4E4E4]" />}
    </div>
    {/* Contenido */}
    <div className={ultimo ? 'pb-0' : 'pb-4'}>
      <div className="text-[14px] font-semibold text-white light:text-black">{titulo}</div>
      <p className="text-[14px] leading-relaxed text-[#B8B8B8] light:text-[#404040] mt-0.5">{descripcion}</p>
    </div>
  </div>
)
