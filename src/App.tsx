import { useEffect } from 'react'
import { useThemeStore } from './store/themeStore'
import { useOnboardingStore } from './store/onboardingStore'
import { useSessionStore } from './store/sessionStore'
import { useNegocioStore } from './store/negocioStore'
import { Layout } from './components/layout/Layout'
import { Onboarding } from './modules/onboarding/Onboarding'
import { Login } from './modules/login/Login'
import SeleccionNegocio from './modules/seleccion-negocio'

function App() {
  const { theme } = useThemeStore()
  const { completado } = useOnboardingStore()
  const { usuario } = useSessionStore()
  const { negocioActivo } = useNegocioStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  // 1. Sin negocio seleccionado → selección de empresa/local
  // 2. Sin onboarding del local → Onboarding
  // 3. Sin usuario logueado → Login
  // 4. Todo ok → app
  if (!negocioActivo) return <SeleccionNegocio />
  if (!completado)    return <Onboarding />
  if (!usuario)       return <Login />
  return <Layout />
}

export default App
