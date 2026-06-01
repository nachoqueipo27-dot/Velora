import { useState } from 'react'
import { Store } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { VeloraLogo } from '../../components/ui/VeloraLogo'
import { useSessionStore } from '../../store/sessionStore'
import { useNegocioStore } from '../../store/negocioStore'

export const Login = () => {
  const { login, loginError, clearError } = useSessionStore()
  const { negocioActivo } = useNegocioStore()
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (nombre.trim() === '' || password === '') return
    setCargando(true)
    try {
      await login(nombre.trim(), password)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className={cn(
      'h-screen w-screen flex items-center justify-center p-6',
      'bg-[#0A0A0A] text-white',
      'light:bg-[#FAFAFA] light:text-[#0A0A0A]',
    )}>
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Contexto del local — distingue este login del global (Acceso al sistema) */}
        <div className="flex flex-col items-center gap-4">
          <VeloraLogo size={48} variant="auto" />
          {negocioActivo && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border',
              'border-[#2A2A2A] bg-[#141414]',
              'light:border-[#E4E4E4] light:bg-white',
            )}>
              <Store size={13} className="text-[#808080]" />
              <span className="text-[12px] font-medium text-white light:text-black truncate max-w-[160px]">
                {negocioActivo.localNombre}
              </span>
              <span className="text-[11px] text-[#606060] truncate max-w-[120px]">· {negocioActivo.empresaNombre}</span>
            </div>
          )}
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[16px] font-semibold text-white light:text-black">Ingreso de empleados</span>
            <p className="text-[11px] text-[#606060]">Iniciá sesión con tu usuario del local</p>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={cn(
          'w-full rounded-modal border p-6 flex flex-col gap-4',
          'border-[#2A2A2A] bg-[#141414]',
          'light:border-[#E4E4E4] light:bg-white',
        )}>
          <Input
            label="Nombre de usuario"
            placeholder="Ej. Administrador"
            value={nombre}
            onChange={e => { setNombre(e.target.value); if (loginError) clearError() }}
            autoFocus
          />
          <Input
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => { setPassword(e.target.value); if (loginError) clearError() }}
          />

          {loginError && (
            <div className="text-xs text-[#C0392B] bg-[#C0392B]/10 rounded-input px-3 py-2">
              {loginError}
            </div>
          )}

          <Button type="submit" size="lg" disabled={cargando} className="w-full mt-1">
            {cargando ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        {import.meta.env.DEV && (
          <p className="text-[11px] text-[#606060]">
            Demo: <span className="text-[#A0A0A0]">Administrador</span> / <span className="text-[#A0A0A0]">admin123</span>
          </p>
        )}
      </div>
    </div>
  )
}
