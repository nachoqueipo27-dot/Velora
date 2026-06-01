import { useOnboardingStore } from '../../store/onboardingStore'
import { cn } from '../../lib/utils'
import { VeloraLogo } from '../../components/ui/VeloraLogo'
import { Paso1 } from './Paso1'
import { Paso2 } from './Paso2'
import { Paso3 } from './Paso3'
import { Paso4 } from './Paso4'
import { ResumenFinal } from './ResumenFinal'

const TOTAL_PASOS = 4

export const Onboarding = () => {
  const { paso, setPaso } = useOnboardingStore()

  const goNext = () => setPaso(Math.min(paso + 1, TOTAL_PASOS + 1))
  const goBack = () => setPaso(Math.max(paso - 1, 1))

  const renderPaso = () => {
    switch (paso) {
      case 1: return <Paso1 onNext={goNext} />
      case 2: return <Paso2 onNext={goNext} onBack={goBack} />
      case 3: return <Paso3 onNext={goNext} onBack={goBack} />
      case 4: return <Paso4 onNext={goNext} onBack={goBack} />
      default: return <ResumenFinal onBack={() => setPaso(TOTAL_PASOS)} />
    }
  }

  const enResumen = paso > TOTAL_PASOS
  const pasoActual = Math.min(paso, TOTAL_PASOS)

  return (
    <div className={cn(
      'h-screen w-screen flex items-center justify-center p-6 overflow-hidden',
      'bg-[#0A0A0A] text-white',
      'light:bg-[#FAFAFA] light:text-[#0A0A0A]',
    )}>
      <div className="w-full max-w-lg flex flex-col gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <VeloraLogo size={56} variant="auto" />
          <span className="text-base font-semibold tracking-[0.3em] uppercase text-white light:text-black">
            Velora
          </span>
          {/* Progreso */}
          <div className="flex items-center gap-2 w-full max-w-[240px]">
            {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all duration-300',
                  i < pasoActual
                    ? 'bg-white light:bg-black'
                    : 'bg-[#2A2A2A] light:bg-[#E4E4E4]',
                )}
              />
            ))}
          </div>
          <span className="text-[11px] text-[#606060]">
            {enResumen ? 'Revisión final' : `Paso ${pasoActual} de ${TOTAL_PASOS}`}
          </span>
        </div>

        {/* Contenido del paso */}
        <div
          key={paso}
          className={cn(
            'rounded-modal border p-6 animate-fade-slide-down',
            'border-[#2A2A2A] bg-[#141414]',
            'light:border-[#E4E4E4] light:bg-white',
          )}
        >
          {renderPaso()}
        </div>
      </div>
    </div>
  )
}
