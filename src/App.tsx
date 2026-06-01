import { useEffect } from 'react'
import { useThemeStore } from './store/themeStore'
import { useAuthGlobalStore } from './store/authGlobalStore'
import { useOnboardingStore } from './store/onboardingStore'
import { useSessionStore } from './store/sessionStore'
import { useNegocioStore } from './store/negocioStore'
import { Layout } from './components/layout/Layout'
import { Onboarding } from './modules/onboarding/Onboarding'
import { Login } from './modules/login/Login'
import LoginGlobal from './modules/login-global/LoginGlobal'
import SeleccionNegocio from './modules/seleccion-negocio'
import { DevPanel } from './components/dev/DevPanel'

function App() {
  const { theme } = useThemeStore()
  const { usuario: usuarioGlobal } = useAuthGlobalStore()
  const { negocioActivo } = useNegocioStore()
  const { completado } = useOnboardingStore()
  const { usuario: usuarioLocal } = useSessionStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  // NIVEL 1: Auth global (admin master del sistema)
  // NIVEL 2: Selección de negocio (empresa/local)
  // NIVEL 3: Onboarding del local (primera vez)
  // NIVEL 4: Login local (empleados del negocio)
  // NIVEL 5: Sistema operativo
  const pantalla = !usuarioGlobal
    ? <LoginGlobal />
    : !negocioActivo
      ? <SeleccionNegocio />
      : !completado
        ? <Onboarding />
        : !usuarioLocal
          ? <Login />
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
