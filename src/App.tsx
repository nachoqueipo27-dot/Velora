import { useEffect } from 'react'
import { useThemeStore } from './store/themeStore'
import { useAuthGlobalStore } from './store/authGlobalStore'
import { useOnboardingStore } from './store/onboardingStore'
import { useSessionStore } from './store/sessionStore'
import { useNegocioStore } from './store/negocioStore'
import { Layout } from './components/layout/Layout'
import { Onboarding } from './modules/onboarding/Onboarding'
import LoginGlobal from './modules/login-global/LoginGlobal'
import SeleccionNegocio from './modules/seleccion-negocio'
import { DevPanel } from './components/dev/DevPanel'

function App() {
  const { theme } = useThemeStore()
  const { usuario: usuarioGlobal } = useAuthGlobalStore()
  const { negocioActivo } = useNegocioStore()
  const { completado } = useOnboardingStore()
  const { usuario: usuarioLocal, setUsuario, cerrarSesion } = useSessionStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  // Sesión única: la sesión operativa refleja al admin global (login único).
  // Mientras hay login global hay sesión (rol Admin); si el global cierra, se limpia.
  useEffect(() => {
    if (usuarioGlobal && !usuarioLocal) {
      setUsuario({ id: usuarioGlobal.id, nombre: usuarioGlobal.nombre, rol: 'Admin', avatar: null })
    } else if (!usuarioGlobal && usuarioLocal) {
      cerrarSesion()
    }
  }, [usuarioGlobal, usuarioLocal, setUsuario, cerrarSesion])

  // NIVEL 1: Auth global (único login del sistema)
  // NIVEL 2: Selección de negocio (empresa/local)
  // NIVEL 3: Onboarding del local (primera vez)
  // NIVEL 4: Sistema operativo (sesión = admin global)
  const pantalla = !usuarioGlobal
    ? <LoginGlobal />
    : !negocioActivo
      ? <SeleccionNegocio />
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
