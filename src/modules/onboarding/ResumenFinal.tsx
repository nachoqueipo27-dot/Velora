import { useOnboardingStore } from '../../store/onboardingStore'
import { useSessionStore } from '../../store/sessionStore'
import { Button } from '../../components/ui/Button'
import { cn } from '../../lib/utils'
import { FUNCIONES_DISPONIBLES } from './types'

interface ResumenFinalProps {
  onBack: () => void
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-1.5 text-sm">
    <span className="text-[#606060]">{label}</span>
    <span className="text-white light:text-black font-medium text-right max-w-[60%] truncate">
      {value || '—'}
    </span>
  </div>
)

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className={cn(
    'rounded-card border p-4 flex flex-col',
    'border-[#2A2A2A] bg-[#141414]',
    'light:border-[#E4E4E4] light:bg-white',
  )}>
    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060] mb-1">{title}</span>
    {children}
  </div>
)

export const ResumenFinal = ({ onBack }: ResumenFinalProps) => {
  const { data, completarOnboarding } = useOnboardingStore()
  const { setUsuario } = useSessionStore()

  const habilitadas = data.funcionesHabilitadas ?? []
  const modulosActivos = FUNCIONES_DISPONIBLES.filter(f => habilitadas.includes(f.id)).length

  const handleConfirm = () => {
    setUsuario({
      id: 1,
      nombre: data.adminNombre ?? 'Administrador',
      rol: 'Administrador',
      avatar: data.logo ?? null,
    })
    completarOnboarding()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white light:text-black">Todo listo</h2>
        <p className="text-[11px] text-[#606060] leading-relaxed">
          Revisá la configuración antes de comenzar. Todo se puede modificar después desde Configuración.
        </p>
      </div>

      <div className="flex flex-col gap-3 max-h-[340px] overflow-y-auto pr-1">
        <Section title="Negocio">
          <Row label="Nombre" value={data.nombreNegocio ?? ''} />
          <Row label="Rubro" value={data.rubro ?? ''} />
          <Row label="Dirección" value={data.direccion ?? ''} />
          <Row label="Teléfono" value={data.telefono ?? ''} />
          <Row label="Email" value={data.email ?? ''} />
          <Row label="Logo" value={data.logo ? 'Cargado' : 'Sin logo'} />
        </Section>

        <Section title="Administrador">
          <Row label="Nombre" value={data.adminNombre ?? ''} />
          <Row label="Contraseña" value={data.adminPassword ? '••••••••' : ''} />
        </Section>

        <Section title="Preferencias">
          <Row label="Moneda" value={data.moneda ?? ''} />
          <Row label="Tema" value={data.tema === 'light' ? 'Claro' : data.tema === 'dark' ? 'Oscuro' : ''} />
          <Row label="Ancho de papel" value={data.anchoPapel ?? ''} />
        </Section>

        <Section title="Funciones">
          <Row label="Módulos habilitados" value={`${modulosActivos} de ${FUNCIONES_DISPONIBLES.length}`} />
          <Row label="Funciones totales" value={`${habilitadas.length} activas`} />
        </Section>
      </div>

      <div className="flex justify-between pt-1">
        <Button variant="ghost" onClick={onBack}>Volver</Button>
        <Button onClick={handleConfirm}>Confirmar y comenzar</Button>
      </div>
    </div>
  )
}
