import { useState } from 'react'
import { useConfigStore, type AlertasConfig } from '../../store/configStore'
import { Button } from '../../components/ui/Button'
import { Check } from 'lucide-react'

const CAMPOS: { key: keyof AlertasConfig; label: string; hint: string }[] = [
  { key: 'diasSinMovimiento', label: 'Días sin movimiento (alerta OT)', hint: 'OTs sin actualización por más de N días.' },
  { key: 'stockMinimoDefault', label: 'Stock mínimo por defecto', hint: 'Para nuevos productos.' },
  { key: 'cargaLibreMax', label: 'Carga "libre" hasta', hint: 'OTs activas para considerar al empleado libre.' },
  { key: 'cargaModeradoMax', label: 'Carga "moderado" hasta', hint: 'Por encima → saturado.' },
  { key: 'faltasMes', label: 'Faltas injustificadas/mes (alerta)', hint: 'Límite antes de alertar.' },
  { key: 'umbralVariacion', label: 'Variación significativa (%)', hint: 'Resalta variaciones en comparativos.' },
]

export const AlertasGlobales = () => {
  const { alertas, guardarAlertas } = useConfigStore()
  const [cfg, setCfg] = useState<AlertasConfig>(alertas)
  const [ok, setOk] = useState(false)

  const guardar = async () => { await guardarAlertas(cfg); setOk(true); setTimeout(() => setOk(false), 2000) }

  return (
    <div className="max-w-xl flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Alertas globales</h2>
        <p className="text-[12px] text-[#606060]">Umbrales que disparan alertas en el dashboard y otros módulos.</p>
      </header>

      <div className="flex flex-col gap-3">
        {CAMPOS.map(c => (
          <div key={c.key} className="flex items-center justify-between gap-4 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] px-4 py-2.5">
            <div className="min-w-0">
              <div className="text-[13px] text-white light:text-black">{c.label}</div>
              <div className="text-[11px] text-[#606060]">{c.hint}</div>
            </div>
            <input type="number" min={0} value={cfg[c.key]} onChange={e => setCfg(s => ({ ...s, [c.key]: Number(e.target.value) }))}
              className="w-20 px-2.5 py-1.5 text-sm text-right rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          </div>
        ))}
      </div>

      <Button className="self-start" onClick={guardar}>{ok ? <><Check size={15} className="mr-1.5" />Guardado</> : 'Guardar alertas'}</Button>
    </div>
  )
}
