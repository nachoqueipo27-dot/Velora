import { useOnboardingStore } from '../../store/onboardingStore'
import { useThemeStore } from '../../store/themeStore'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { useEffect } from 'react'
import type { PasoProps } from './types'

interface OptionGroupProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

function OptionGroup<T extends string>({ label, value, options, onChange }: OptionGroupProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {options.map(opt => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                'px-4 py-2.5 rounded-input border text-sm font-medium transition-all duration-150',
                selected
                  ? 'border-white bg-white/[0.08] text-white light:border-black light:bg-black/[0.06] light:text-black'
                  : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-[#3A3A3A] hover:text-white light:border-[#E4E4E4] light:text-[#404040] light:hover:text-black',
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const Paso3 = ({ onNext, onBack }: PasoProps) => {
  const { data, updateData } = useOnboardingStore()
  const { theme, setTheme } = useThemeStore()

  // Defaults iniciales si aún no se eligieron.
  useEffect(() => {
    const patch: Record<string, string> = {}
    if (!data.moneda) patch.moneda = 'ARS'
    if (!data.tema) patch.tema = theme
    if (Object.keys(patch).length) updateData(patch as any)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const moneda = data.moneda ?? 'ARS'

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white light:text-black">
          Preferencias iniciales
        </h2>
        <p className="text-[11px] text-[#606060] leading-relaxed">
          Configurá los valores por defecto. Podés cambiarlos luego desde Configuración.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <OptionGroup
          label="Moneda"
          value={moneda}
          options={[
            { value: 'ARS', label: 'Peso argentino (ARS)' },
            { value: 'USD', label: 'Dólar (USD)' },
          ]}
          onChange={v => updateData({ moneda: v })}
        />

        <OptionGroup
          label="Tema de la interfaz"
          value={theme}
          options={[
            { value: 'dark', label: 'Oscuro' },
            { value: 'light', label: 'Claro' },
          ]}
          onChange={v => { setTheme(v); updateData({ tema: v }) }}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>Anterior</Button>
        <Button onClick={onNext}>Siguiente</Button>
      </div>
    </div>
  )
}
