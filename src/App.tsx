import { useEffect } from 'react'
import { useThemeStore } from './store/themeStore'
import { useOnboardingStore } from './store/onboardingStore'
import { useSessionStore } from './store/sessionStore'
import { Layout } from './components/layout/Layout'
import { Onboarding } from './modules/onboarding/Onboarding'
import { Login } from './modules/login/Login'

function App() {
  const { theme } = useThemeStore()
  const { completado } = useOnboardingStore()
  const { usuario } = useSessionStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  if (!completado) return <Onboarding />
  if (!usuario)    return <Login />
  return <Layout />
}

export default App
