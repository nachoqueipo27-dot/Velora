import { Button } from '../../../components/ui/Button'
import { horaDe } from '../../../lib/fecha'
import type { Cita } from '../../../types/agenda'
import { AlertTriangle } from 'lucide-react'

interface AlertaSuperposicionProps {
  conflictos: Cita[]
  onCambiar: () => void
  onGuardarIgual: () => void
}

export const AlertaSuperposicion = ({ conflictos, onCambiar, onGuardarIgual }: AlertaSuperposicionProps) => (
  <div className="rounded-input bg-[#D4921A]/10 border border-[#D4921A]/30 px-3 py-2.5 flex flex-col gap-2">
    <div className="flex items-start gap-2">
      <AlertTriangle size={15} className="text-[#D4921A] shrink-0 mt-0.5" />
      <div className="flex flex-col gap-1">
        <span className="text-[13px] text-[#D4921A] font-medium">Este empleado ya tiene una cita en este horario:</span>
        <ul className="flex flex-col gap-0.5">
          {conflictos.map(c => (
            <li key={c.id} className="text-[12px] text-[#A0A0A0] light:text-[#404040]">
              {horaDe(c.fechaInicio)}–{horaDe(c.fechaFin)} · {c.titulo}
            </li>
          ))}
        </ul>
      </div>
    </div>
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="ghost" onClick={onCambiar}>Cambiar horario</Button>
      <Button size="sm" onClick={onGuardarIgual}>Guardar igual</Button>
    </div>
  </div>
)
