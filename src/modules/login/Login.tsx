import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { VeloraLogo } from '../../components/ui/VeloraLogo'
import { useSessionStore } from '../../store/sessionStore'

export const Login = () => {
  const { login, loginError, clearError } = useSessionStore()
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
        {/* Marca */}
        <div className="flex flex-col items-center gap-4">
          <VeloraLogo size={72} variant="auto" />
          <span className="text-2xl font-semibold tracking-widest uppercase text-white light:text-[#0A0A0A]">
            Velora
          </span>
          <p className="text-[11px] text-[#606060] -mt-2">Ingresá para continuar</p>
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

        <p className="text-[11px] text-[#606060]">
          Demo: <span className="text-[#A0A0A0]">Administrador</span> / <span className="text-[#A0A0A0]">admin123</span>
        </p>
      </div>

      {import.meta.env.DEV && (
        <button
          onClick={() => {
            localStorage.clear()
            window.location.reload()
          }}
          className="fixed bottom-4 right-4 px-3 py-1.5 text-[11px]
                     bg-[#C0392B]/20 text-[#C0392B] rounded-input
                     hover:bg-[#C0392B]/30 transition-all duration-150
                     border border-[#C0392B]/30"
        >
          DEV: Reset estado
        </button>
      )}
    </div>
  )
}
