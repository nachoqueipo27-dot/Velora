import { useOnboardingStore } from '../../store/onboardingStore'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { ImagePlus, X } from 'lucide-react'
import { useRef } from 'react'
import type { PasoProps } from './types'

export const Paso1 = ({ onNext }: PasoProps) => {
  const { data, updateData } = useOnboardingStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const nombreNegocio = data.nombreNegocio ?? ''

  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateData({ logo: reader.result as string })
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white light:text-black">
          Datos de tu negocio
        </h2>
        <p className="text-[11px] text-[#606060] leading-relaxed">
          Estos datos aparecerán automáticamente en todos los documentos que genere Velora:
          tickets de venta, facturas, presupuestos, remitos y recibos de pago. Podés editarlos
          en cualquier momento desde Configuración &gt; Datos del negocio.
        </p>
      </div>

      {/* Logo */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className={cn(
            'relative w-16 h-16 rounded-card border border-dashed flex items-center justify-center overflow-hidden shrink-0',
            'border-[#2A2A2A] text-[#606060] transition-all duration-150',
            'hover:border-[#3A3A3A] hover:text-[#A0A0A0]',
            'light:border-[#E4E4E4] light:text-[#888888] light:hover:border-[#D0D0D0]',
          )}
        >
          {data.logo ? (
            <img src={data.logo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <ImagePlus size={20} />
          )}
        </button>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Logo del negocio</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              {data.logo ? 'Cambiar' : 'Subir imagen'}
            </Button>
            {data.logo && (
              <button
                type="button"
                onClick={() => updateData({ logo: null })}
                className="flex items-center gap-1 text-[11px] text-[#606060] hover:text-[#C0392B] transition-colors"
              >
                <X size={12} /> Quitar
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden" />
      </div>

      <div className="flex flex-col gap-3">
        <Input
          label="Nombre del negocio *"
          placeholder="Ej. Taller Mecánico San Martín"
          value={nombreNegocio}
          onChange={e => updateData({ nombreNegocio: e.target.value })}
        />
        <Input
          label="Rubro"
          placeholder="Ej. Reparación de electrodomésticos"
          value={data.rubro ?? ''}
          onChange={e => updateData({ rubro: e.target.value })}
        />
        <Input
          label="Dirección"
          placeholder="Ej. Av. Siempre Viva 742"
          value={data.direccion ?? ''}
          onChange={e => updateData({ direccion: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Teléfono"
            placeholder="Ej. 11 5555-5555"
            value={data.telefono ?? ''}
            onChange={e => updateData({ telefono: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            placeholder="Ej. contacto@negocio.com"
            value={data.email ?? ''}
            onChange={e => updateData({ email: e.target.value })}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button disabled={nombreNegocio.trim() === ''} onClick={onNext}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
