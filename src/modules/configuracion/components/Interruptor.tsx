import { cn } from '../../../lib/utils'

interface InterruptorProps {
  titulo: string
  /** Línea de ayuda que explica qué hace la opción (obligatoria en Configuración). */
  ayuda: string
  activo: boolean
  onChange: (activo: boolean) => void
  disabled?: boolean
  title?: string
}

/** Opción de encendido/apagado con su línea de ayuda (diseño nuevo). */
export const Interruptor = ({ titulo, ayuda, activo, onChange, disabled, title }: InterruptorProps) => (
  <label className={cn('flex items-start gap-3 py-3.5', disabled ? 'opacity-60' : 'cursor-pointer')} title={title}>
    <button type="button" role="switch" aria-checked={activo} disabled={disabled}
      onClick={() => onChange(!activo)}
      className={cn('relative mt-0.5 h-5 w-9 shrink-0 rounded-pastilla transition-colors duration-150',
        activo ? 'bg-acento' : 'bg-borde-fuerte')}>
      <span className={cn('absolute top-0.5 h-4 w-4 rounded-pastilla bg-superficie shadow transition-all duration-150',
        activo ? 'left-[18px]' : 'left-0.5')} />
    </button>
    <span>
      <span className="block text-seccion font-medium text-texto">{titulo}</span>
      <span className="mt-0.5 block text-[13px] text-texto-2">{ayuda}</span>
    </span>
  </label>
)
