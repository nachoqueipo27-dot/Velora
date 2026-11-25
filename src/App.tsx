import { useEffect, useState } from 'react'
import { useThemeStore } from './store/themeStore'
import { useAuthGlobalStore } from './store/authGlobalStore'
import { useOnboardingStore } from './store/onboardingStore'
import { useSessionStore } from './store/sessionStore'
import { existeUsuarioMaster } from './db/master'
import { Layout } from './components/layout/Layout'
import { Onboarding } from './modules/onboarding/Onboarding'
import LoginGlobal from './modules/login-global/LoginGlobal'
import { CambiarClave } from './modules/login-global/CambiarClave'
import { DevPanel } from './components/dev/DevPanel'
import { VeloraLogo } from './components/ui/VeloraLogo'

function App() {
  const { theme } = useThemeStore()
  const { usuario: usuarioGlobal, pendienteClave, revalidar } = useAuthGlobalStore()
  const { completado } = useOnboardingStore()
  const { usuario: usuarioLocal, setUsuario, cerrarSesion } = useSessionStore()
  const [hayUsuarioMaster, setHayUsuarioMaster] = useState<boolean | null>(null)
  // La sesión queda guardada entre aperturas: antes de usarla se confirma que la persona
  // siga activa y con qué rol.
  const [sesionVerificada, setSesionVerificada] = useState(() => useAuthGlobalStore.getState().usuario === null)

  useEffect(() => {
    if (!sesionVerificada) revalidar().finally(() => setSesionVerificada(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  // Se vuelve a chequear cuando el onboarding se completa: recién ahí nace el
  // primer usuario (Admin General) en master.db.
  useEffect(() => {
    existeUsuarioMaster().then(setHayUsuarioMaster)
  }, [completado])

  // Sesión única: la sesión operativa refleja al usuario global (login único por DNI).
  // El dueño es Admin; el resto lleva el rol de su empleado. Si el global cierra, se limpia.
  useEffect(() => {
    if (!sesionVerificada) return
    if (usuarioGlobal) {
      const id = usuarioGlobal.empleadoId ?? 1
      const rol = usuarioGlobal.esAdminGeneral ? 'Admin' : usuarioGlobal.rol
      const { nombre } = usuarioGlobal
      if (!usuarioLocal || usuarioLocal.id !== id || usuarioLocal.rol !== rol || usuarioLocal.nombre !== nombre) {
        setUsuario({ id, nombre, rol, avatar: null })
      }
    } else if (!usuarioGlobal && usuarioLocal) {
      cerrarSesion()
    }
  }, [sesionVerificada, usuarioGlobal, usuarioLocal, setUsuario, cerrarSesion])

  if (hayUsuarioMaster === null || !sesionVerificada) {
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
  //          con la contraseña por defecto, antes de entrar tiene que elegir otra
  // NIVEL 3: Onboarding del negocio (si por algún motivo no está completado)
  // NIVEL 4: Sistema operativo (sesión = usuario global)
  const pantalla = !hayUsuarioMaster
    ? <Onboarding />
    : pendienteClave
      ? <CambiarClave />
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
