import { useEffect, useState } from 'react'
import { useThemeStore } from './store/themeStore'
import { useAuthGlobalStore } from './store/authGlobalStore'
import { useOnboardingStore } from './store/onboardingStore'
import { useSessionStore } from './store/sessionStore'
import { existeUsuarioMaster } from './db/master'
import { Layout } from './components/layout/Layout'
import { Onboarding } from './modules/onboarding/Onboarding'
import LoginGlobal from './modules/login-global/LoginGlobal'
import { DevPanel } from './components/dev/DevPanel'
import { VeloraLogo } from './components/ui/VeloraLogo'

function App() {
  const { theme } = useThemeStore()
  const { usuario: usuarioGlobal } = useAuthGlobalStore()
  const { completado } = useOnboardingStore()
  const { usuario: usuarioLocal, setUsuario, cerrarSesion } = useSessionStore()
  const [hayUsuarioMaster, setHayUsuarioMaster] = useState<boolean | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  // Se vuelve a chequear cuando el onboarding se completa: recién ahí nace el
  // primer usuario (Admin General) en master.db.
  useEffect(() => {
    existeUsuarioMaster().then(setHayUsuarioMaster)
  }, [completado])

  // Sesión única: la sesión operativa refleja al admin global (login único).
  // Mientras hay login global hay sesión (rol Admin); si el global cierra, se limpia.
  useEffect(() => {
    if (usuarioGlobal && !usuarioLocal) {
      setUsuario({ id: 1, nombre: usuarioGlobal.nombre, rol: 'Admin', avatar: null })
    } else if (!usuarioGlobal && usuarioLocal) {
      cerrarSesion()
    }
  }, [usuarioGlobal, usuarioLocal, setUsuario, cerrarSesion])

  if (hayUsuarioMaster === null) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-[#0A0A0A] light:bg-[#FAFAFA]">
        <div className="animate-pulse">
          <VeloraLogo size={64} variant="auto" />
        </div>
      </div>
    )
  }

  // NIVEL 1: ¿existe algún usuario? si no, Onboarding crea el primero (Admin General)
  // NIVEL 2: Auth global (login único del sistema)
  // NIVEL 3: Onboarding del negocio (si por algún motivo no está completado)
  // NIVEL 4: Sistema operativo (sesión = admin global)
  const pantalla = !hayUsuarioMaster
    ? <Onboarding />
    : !usuarioGlobal
      ? <LoginGlobal />
      : !completado
        ? <Onboarding />
        : <Layout />

  return (
    <>
      {pantalla}
      {/* Panel DEV (CTRL+K) — disponible en TODAS las pantallas, solo en desarrollo */}
      {import.meta.env.DEV && <DevPanel />}
    </>
  )
}

export default App
