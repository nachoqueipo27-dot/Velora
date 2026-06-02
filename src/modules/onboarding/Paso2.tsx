import { useOnboardingStore } from '../../store/onboardingStore'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { useState } from 'react'
import type { PasoProps } from './types'

export const Paso2 = ({ onNext, onBack }: PasoProps) => {
  const { data, updateData } = useOnboardingStore()
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)

  const nombre = data.adminNombre ?? ''
  const dni = data.adminDni ?? ''
  const password = data.adminPassword ?? ''
  const dniValido = /^\d{7,}$/.test(dni.trim())
  const mismatch = touched && confirm !== '' && password !== confirm
  const valido = nombre.trim() !== '' && dniValido && password !== '' && password === confirm

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-white light:text-black">
          Usuario administrador
        </h2>
        <p className="text-[11px] text-[#606060] leading-relaxed">
          Esta cuenta tendrá acceso completo al sistema. Guardá la contraseña en un lugar seguro.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Input
          label="Nombre completo *"
          placeholder="Ej. María González"
          value={nombre}
          onChange={e => updateData({ adminNombre: e.target.value })}
        />
        <Input
          label="DNI *"
          placeholder="Solo números (mín. 7 dígitos)"
          inputMode="numeric"
          value={dni}
          onChange={e => updateData({ adminDni: e.target.value.replace(/\D/g, '') })}
          error={dni !== '' && !dniValido ? 'DNI inválido (mínimo 7 dígitos)' : undefined}
        />
        <Input
          label="Contraseña *"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={e => updateData({ adminPassword: e.target.value })}
        />
        <Input
          label="Confirmar contraseña *"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setTouched(true) }}
          error={mismatch ? 'Las contraseñas no coinciden' : undefined}
        />
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>Anterior</Button>
        <Button disabled={!valido} onClick={onNext}>Siguiente</Button>
      </div>
    </div>
  )
}
