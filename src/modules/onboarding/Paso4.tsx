import { useOnboardingStore } from '../../store/onboardingStore'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { Check, Minus, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FUNCIONES_DISPONIBLES, TODOS_LOS_IDS, type FuncionDisponible, type PasoProps } from './types'

interface CheckBoxProps {
  state: 'on' | 'off' | 'partial'
  onClick: () => void
}

const CheckBox = ({ state, onClick }: CheckBoxProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all duration-120',
      state !== 'off'
        ? 'bg-white border-white text-black light:bg-black light:border-black light:text-white'
        : 'border-[#2A2A2A] text-transparent hover:border-[#3A3A3A] light:border-[#E4E4E4] light:hover:border-[#D0D0D0]',
    )}
  >
    {state === 'on' && <Check size={11} strokeWidth={3} />}
    {state === 'partial' && <Minus size={11} strokeWidth={3} />}
  </button>
)

export const Paso4 = ({ onNext, onBack }: PasoProps) => {
  const { data, updateData } = useOnboardingStore()
  const [expanded, setExpanded] = useState<string[]>([])

  // Default: todo tildado.
  useEffect(() => {
    if (data.funcionesHabilitadas === undefined) {
      updateData({ funcionesHabilitadas: TODOS_LOS_IDS })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enabled = data.funcionesHabilitadas ?? TODOS_LOS_IDS

  const setEnabled = (next: string[]) => updateData({ funcionesHabilitadas: next })

  const moduleState = (f: FuncionDisponible): 'on' | 'off' | 'partial' => {
    const moduleOn = enabled.includes(f.id)
    if (f.subfunciones.length === 0) return moduleOn ? 'on' : 'off'
    const subsOn = f.subfunciones.filter(s => enabled.includes(s.id)).length
    if (!moduleOn && subsOn === 0) return 'off'
    if (moduleOn && subsOn === f.subfunciones.length) return 'on'
    return 'partial'
  }

  const toggleModule = (f: FuncionDisponible) => {
    const turningOn = !enabled.includes(f.id) || moduleState(f) !== 'on'
    const ids = [f.id, ...f.subfunciones.map(s => s.id)]
    if (turningOn) {
      setEnabled(Array.from(new Set([...enabled, ...ids])))
    } else {
      setEnabled(enabled.filter(id => !ids.includes(id)))
    }
  }

  const toggleSub = (f: FuncionDisponible, subId: string) => {
    if (enabled.includes(subId)) {
      setEnabled(enabled.filter(id => id !== subId))
    } else {
      setEnabled(Array.from(new Set([...enabled, subId, f.id])))
    }
  }

  const toggleExpand = (id: string) =>
    setExpanded(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white light:text-black">
          Funciones a habilitar
        </h2>
        <p className="text-[11px] text-[#606060] leading-relaxed">
          Seleccioná las funciones que querés habilitar. Podés cambiarlas en cualquier momento
          desde Configuración &gt; Funciones.
        </p>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => setEnabled([...TODOS_LOS_IDS])}>
          Activar todas las funciones
        </Button>
      </div>

      <div className={cn(
        'flex flex-col rounded-card border overflow-y-auto max-h-[320px]',
        'border-[#2A2A2A] light:border-[#E4E4E4]',
      )}>
        {FUNCIONES_DISPONIBLES.map((f, idx) => {
          const hasSubs = f.subfunciones.length > 0
          const isExpanded = expanded.includes(f.id)
          return (
            <div
              key={f.id}
              className={cn(
                idx !== 0 && 'border-t border-[#2A2A2A] light:border-[#E4E4E4]',
              )}
            >
              <div className="flex items-center gap-3 px-4 py-2.5">
                <CheckBox state={moduleState(f)} onClick={() => toggleModule(f)} />
                <button
                  type="button"
                  onClick={() => hasSubs && toggleExpand(f.id)}
                  className={cn(
                    'flex-1 flex items-center justify-between text-left text-sm',
                    'text-white light:text-black',
                    hasSubs ? 'cursor-pointer' : 'cursor-default',
                  )}
                >
                  <span>{f.label}</span>
                  {hasSubs && (
                    <span className="text-[#606060]">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  )}
                </button>
              </div>

              {hasSubs && isExpanded && (
                <div className="flex flex-col pb-2">
                  {f.subfunciones.map(s => (
                    <div key={s.id} className="flex items-center gap-3 pl-11 pr-4 py-1.5">
                      <CheckBox
                        state={enabled.includes(s.id) ? 'on' : 'off'}
                        onClick={() => toggleSub(f, s.id)}
                      />
                      <span className="text-[13px] text-[#A0A0A0] light:text-[#404040]">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between pt-1">
        <Button variant="ghost" onClick={onBack}>Anterior</Button>
        <Button onClick={onNext}>Finalizar</Button>
      </div>
    </div>
  )
}
