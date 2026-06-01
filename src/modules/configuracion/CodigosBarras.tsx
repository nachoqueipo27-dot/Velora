import { useState } from 'react'
import { cn } from '../../lib/utils'
import { useConfigStore, type CodigosBarrasConfig } from '../../store/configStore'
import { Button } from '../../components/ui/Button'
import { Check } from 'lucide-react'

const FORMATOS: CodigosBarrasConfig['formato'][] = ['EAN-13', 'EAN-8', 'Code128', 'QR']
const TAMANIOS: { value: CodigosBarrasConfig['tamanio']; label: string }[] = [
  { value: 'pequena', label: 'Pequeña' },
  { value: 'mediana', label: 'Mediana' },
  { value: 'grande', label: 'Grande' },
]

export const CodigosBarras = () => {
  const { codigos, guardarCodigos } = useConfigStore()
  const [cfg, setCfg] = useState<CodigosBarrasConfig>(codigos)
  const [ok, setOk] = useState(false)

  const guardar = async () => { await guardarCodigos(cfg); setOk(true); setTimeout(() => setOk(false), 2000) }

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Códigos de barras</h2>
        <p className="text-[12px] text-[#606060]">Formato y tamaño por defecto al imprimir etiquetas.</p>
      </header>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-[#606060]">Formato por defecto</span>
        <div className="flex flex-wrap gap-2">
          {FORMATOS.map(f => (
            <button key={f} onClick={() => setCfg(c => ({ ...c, formato: f }))}
              className={cn('px-3 py-2 text-[13px] rounded-input border transition-all',
                cfg.formato === f ? 'border-white bg-white text-black light:border-black light:bg-black light:text-white'
                  : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-white light:border-[#E4E4E4] light:text-[#404040]')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] uppercase tracking-wider text-[#606060]">Tamaño de etiqueta</span>
        <div className="flex flex-wrap gap-2">
          {TAMANIOS.map(t => (
            <button key={t.value} onClick={() => setCfg(c => ({ ...c, tamanio: t.value }))}
              className={cn('px-3 py-2 text-[13px] rounded-input border transition-all',
                cfg.tamanio === t.value ? 'border-white bg-white text-black light:border-black light:bg-black light:text-white'
                  : 'border-[#2A2A2A] text-[#A0A0A0] hover:border-white light:border-[#E4E4E4] light:text-[#404040]')}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Button className="self-start" onClick={guardar}>{ok ? <><Check size={15} className="mr-1.5" />Guardado</> : 'Guardar'}</Button>
    </div>
  )
}
