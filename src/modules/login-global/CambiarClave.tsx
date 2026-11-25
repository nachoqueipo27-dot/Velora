import { useState } from 'react'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { CLAVE_POR_DEFECTO } from '../../db/claves'
import { VeloraLogo } from '../../components/ui/VeloraLogo'

const LARGO_MINIMO = 6

const Campo = ({ label, value, onChange, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-[12px] font-medium text-texto-2 dark:text-oscuro-texto-2">{label}</span>
    <input
      type="password"
      autoComplete="new-password"
      autoFocus={autoFocus}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 text-cuerpo rounded-control border border-borde bg-superficie text-texto outline-none transition-colors duration-150 focus:border-acento dark:border-oscuro-borde dark:bg-oscuro-elevado dark:text-oscuro-texto"
    />
  </label>
)

/** Se muestra al ingresar con la contraseña por defecto: no se entra hasta elegir otra. */
export const CambiarClave = () => {
  const { pendienteClave, completarCambioClave, logout } = useAuthGlobalStore()
  const [clave, setClave] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (clave.trim().length < LARGO_MINIMO) { setError(`La contraseña tiene que tener al menos ${LARGO_MINIMO} caracteres.`); return }
    if (clave.trim().toLowerCase() === CLAVE_POR_DEFECTO) { setError('Elegí una contraseña distinta de la anterior.'); return }
    if (clave !== repetida) { setError('Las contraseñas no coinciden.'); return }
    setError(null)
    setGuardando(true)
    try {
      await completarCambioClave(clave)
    } catch (err) {
      console.error('CambiarClave', err)
      setError('No se pudo guardar la contraseña. Probá de nuevo.')
      setGuardando(false)
    }
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center p-6 bg-fondo text-texto dark:bg-oscuro-fondo dark:text-oscuro-texto">
      <form
        onSubmit={guardar}
        className="w-full max-w-sm flex flex-col gap-4 p-6 rounded-panel border border-borde bg-superficie dark:border-oscuro-borde dark:bg-oscuro-superficie"
      >
        <VeloraLogo size={40} variant="auto" />
        <div className="flex flex-col gap-1">
          <h1 className="text-titulo font-semibold">Elegí una contraseña nueva</h1>
          <p className="text-cuerpo text-texto-3 dark:text-oscuro-texto-2">
            {pendienteClave?.nombre}, tu usuario todavía tiene la contraseña por defecto. Cambiala para entrar (mínimo {LARGO_MINIMO} caracteres).
          </p>
        </div>

        <Campo label="Contraseña nueva" value={clave} onChange={v => { setClave(v); setError(null) }} autoFocus />
        <Campo label="Repetir contraseña" value={repetida} onChange={v => { setRepetida(v); setError(null) }} />

        {error && <p role="alert" className="text-cuerpo text-error dark:text-acento">{error}</p>}

        <button
          type="submit"
          disabled={guardando}
          className="w-full px-4 py-2 rounded-control bg-acento text-superficie text-cuerpo font-semibold transition-colors duration-150 hover:bg-acento-hover disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar y entrar'}
        </button>
        <button
          type="button"
          onClick={logout}
          disabled={guardando}
          className="self-center text-cuerpo text-texto-3 hover:text-texto dark:text-oscuro-texto-2 dark:hover:text-oscuro-texto transition-colors duration-150"
        >
          Volver al inicio de sesión
        </button>
      </form>
    </div>
  )
}
