import { useState } from 'react'
import { cn } from '../../lib/utils'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { VeloraLogo } from '../../components/ui/VeloraLogo'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { obtenerPreguntaSeguridad, cambiarPassword } from '../../db/master'
import { verifyPassword } from '../../lib/crypto'
import { labelPreguntaSeguridad } from '../../lib/preguntasSeguridad'
import { toast } from '../../store/toastStore'

type PasoRecuperar = 1 | 2 | 3

const RecuperarPassword = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [paso, setPaso] = useState<PasoRecuperar>(1)
  const [dni, setDni] = useState('')
  const [preguntaId, setPreguntaId] = useState('')
  const [respuestaHash, setRespuestaHash] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const reset = () => {
    setPaso(1); setDni(''); setPreguntaId(''); setRespuestaHash('')
    setRespuesta(''); setNuevaPassword(''); setConfirmar(''); setError(null); setCargando(false)
  }
  const cerrar = () => { reset(); onClose() }

  const buscarPregunta = async () => {
    setError(null)
    if (!/^\d{7,}$/.test(dni.trim())) { setError('DNI inválido.'); return }
    setCargando(true)
    try {
      const datos = await obtenerPreguntaSeguridad(dni.trim())
      if (!datos) {
        setError('No encontramos una pregunta de seguridad configurada para ese DNI.')
        return
      }
      setPreguntaId(datos.preguntaId)
      setRespuestaHash(datos.respuestaHash)
      setPaso(2)
    } finally {
      setCargando(false)
    }
  }

  const verificarRespuesta = async () => {
    setError(null)
    if (respuesta.trim() === '') { setError('Ingresá una respuesta.'); return }
    setCargando(true)
    try {
      const ok = await verifyPassword(respuesta, respuestaHash)
      if (!ok) { setError('Respuesta incorrecta.'); return }
      setPaso(3)
    } finally {
      setCargando(false)
    }
  }

  const guardarNuevaPassword = async () => {
    setError(null)
    if (nuevaPassword === '' || nuevaPassword !== confirmar) { setError('Las contraseñas no coinciden.'); return }
    setCargando(true)
    try {
      await cambiarPassword(dni.trim(), nuevaPassword)
      toast.success('Contraseña actualizada')
      cerrar()
    } finally {
      setCargando(false)
    }
  }

  return (
    <Modal open={open} onClose={cerrar} title="Recuperar contraseña" maxWidth="max-w-sm">
      <div className="flex flex-col gap-3 pb-1">
        {paso === 1 && (
          <>
            <p className="text-[12px] text-[#808080]">Ingresá tu DNI para buscar tu pregunta de seguridad.</p>
            <Input label="DNI" placeholder="Tu DNI" inputMode="numeric" autoFocus
              value={dni} onChange={e => setDni(e.target.value.replace(/\D/g, ''))} />
          </>
        )}
        {paso === 2 && (
          <>
            <p className="text-[12px] text-[#808080]">{labelPreguntaSeguridad(preguntaId)}</p>
            <Input label="Respuesta" placeholder="Tu respuesta" autoFocus
              value={respuesta} onChange={e => setRespuesta(e.target.value)} />
          </>
        )}
        {paso === 3 && (
          <>
            <p className="text-[12px] text-[#808080]">Elegí una contraseña nueva.</p>
            <Input label="Contraseña nueva" type="password" placeholder="••••••••" autoFocus
              value={nuevaPassword} onChange={e => setNuevaPassword(e.target.value)} />
            <Input label="Confirmar contraseña" type="password" placeholder="••••••••"
              value={confirmar} onChange={e => setConfirmar(e.target.value)} />
          </>
        )}

        {error && (
          <div className="text-xs text-[#C0392B] bg-[#C0392B]/10 rounded-input px-3 py-2">{error}</div>
        )}

        <Button
          className="w-full mt-1"
          disabled={cargando}
          onClick={paso === 1 ? buscarPregunta : paso === 2 ? verificarRespuesta : guardarNuevaPassword}
        >
          {cargando ? 'Procesando...' : paso === 3 ? 'Guardar contraseña' : 'Continuar'}
        </Button>
      </div>
    </Modal>
  )
}

const LoginGlobal = () => {
  const { login, loginError, clearError } = useAuthGlobalStore()
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [recuperarOpen, setRecuperarOpen] = useState(false)

  const dniValido = /^\d{7,}$/.test(dni.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dniValido || password === '') return
    setCargando(true)
    try {
      await login(dni.trim(), password)
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
          <p className="text-[11px] text-[#606060] -mt-2">Acceso al sistema</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className={cn(
          'w-full rounded-modal border p-6 flex flex-col gap-4',
          'border-[#2A2A2A] bg-[#141414]',
          'light:border-[#E4E4E4] light:bg-white',
        )}>
          <Input
            label="DNI"
            placeholder="Ingresá tu DNI"
            inputMode="numeric"
            value={dni}
            onChange={e => { setDni(e.target.value.replace(/\D/g, '')); if (loginError) clearError() }}
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

          <button
            type="button"
            onClick={() => setRecuperarOpen(true)}
            className="text-[11px] text-[#606060] hover:text-white light:hover:text-black transition-colors self-center"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>
      </div>

      <RecuperarPassword open={recuperarOpen} onClose={() => setRecuperarOpen(false)} />
    </div>
  )
}

export default LoginGlobal
