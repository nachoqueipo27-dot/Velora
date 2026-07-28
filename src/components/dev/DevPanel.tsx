import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { useSessionStore } from '../../store/sessionStore'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useNavigationStore } from '../../store/navigationStore'
import { useThemeStore } from '../../store/themeStore'
import { useToastStore } from '../../store/toastStore'
import { getDb } from '../../db'
import { getMasterDb } from '../../db/master'
import { X, Terminal, Database, Navigation, TriangleAlert, Info } from 'lucide-react'

interface ConfirmState {
  accion: string
  fn: () => Promise<void>
  detalle?: string
}

// Tablas cuyo contenido sobrevive al Reset Total: son exactamente las que siembran
// seedRolesBase() y seedConfiguracionBase() en src/db/index.ts. Sin esto la app
// arranca sin roles, sin plantillas de ticket/PDF ni motivos de cancelación.
const TABLAS_CONFIG_BASE = [
  'roles',
  'configuracion',
  'configuracion_ticket',
  'configuracion_pdf',
  'motivos_cancelacion',
  'tipos_cambio',
]

// Única clave de la tabla `configuracion` que crea seedConfiguracionBase. El resto
// (alertas, backup) son preferencias del usuario y sí se borran en un reset de fábrica.
const CLAVE_CONFIG_BASE = 'categorias_gastos'

export const DevPanel = () => {
  const [abierto, setAbierto] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [log, setLog] = useState<string[]>([])

  const { usuario: usuarioGlobal } = useAuthGlobalStore()
  const { usuario, cerrarSesion } = useSessionStore()
  const { resetOnboarding, completado } = useOnboardingStore()
  const { activeModule, setModule } = useNavigationStore()
  const { theme } = useThemeStore()
  const { agregar: toast } = useToastStore()

  const addLog = (msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)])
    console.log(`[DEV] ${msg}`)
  }

  // CTRL+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setAbierto(prev => !prev)
      }
      if (e.key === 'Escape') setAbierto(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  if (!abierto) return null

  // ── ACCIONES ──────────────────────────────────────

  const confirmar = (accion: string, fn: () => Promise<void>, detalle?: string) => setConfirm({ accion, fn, detalle })

  const ejecutarConFirm = async () => {
    if (!confirm) return
    await confirm.fn()
    setConfirm(null)
  }

  // STORAGE
  const resetLocalStorage = async () => {
    addLog('Limpiando localStorage...')
    localStorage.clear()
    toast('localStorage limpiado — recargando', 'success')
    setTimeout(() => window.location.reload(), 800)
  }

  const verLocalStorage = async () => {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      try { data[key] = JSON.parse(localStorage.getItem(key)!) } catch { data[key] = localStorage.getItem(key) }
    }
    console.table(data)
    addLog(`localStorage: ${localStorage.length} keys — ver consola`)
    toast(`${localStorage.length} keys en consola`, 'info')
  }

  const exportarLocalStorage = async () => {
    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!
      try { data[key] = JSON.parse(localStorage.getItem(key)!) } catch { data[key] = localStorage.getItem(key) }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `velora-localStorage-${Date.now()}.json`
    a.click()
    addLog('localStorage exportado')
    toast('localStorage exportado', 'success')
  }

  // BASE DE DATOS
  const listarTablas = async () => {
    try {
      const db = await getDb()
      const tablas = await db.select<{ name: string }[]>(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
      )
      console.table(tablas)
      addLog(`${tablas.length} tablas — ver consola`)
      toast(`${tablas.length} tablas en consola`, 'info')
    } catch (e) {
      addLog(`Error: ${e}`)
      toast('Error al listar tablas', 'error')
    }
  }

  const contarRegistros = async () => {
    try {
      const db = await getDb()
      const tablas = await db.select<{ name: string }[]>(
        `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
      )
      const counts: Record<string, number> = {}
      for (const t of tablas) {
        if (t.name === 'sqlite_sequence') continue
        const r = await db.select<{ count: number }[]>(`SELECT COUNT(*) as count FROM ${t.name}`)
        counts[t.name] = r[0]?.count ?? 0
      }
      console.table(counts)
      addLog(`Conteo de ${tablas.length} tablas — ver consola`)
      toast('Conteo en consola', 'info')
    } catch (e) {
      addLog(`Error: ${e}`)
      toast('Error al contar registros', 'error')
    }
  }

  // NAVEGACIÓN
  const irAOnboarding = async () => {
    resetOnboarding()
    addLog('Reseteando onboarding')
    toast('Onboarding reseteado — recargando', 'info')
    setTimeout(() => window.location.reload(), 500)
  }

  const irALogin = async () => {
    cerrarSesion()
    addLog('Cerrando sesión')
    toast('Sesión cerrada', 'info')
    setAbierto(false)
  }

  // RESET TOTAL — vuelta a estado de fábrica.
  // Vacía todas las tablas de negocio de velora.db, borra los usuarios de master.db
  // (incluido el Admin General) y limpia localStorage. Al recargar, App.tsx encuentra
  // existeUsuarioMaster() === false y arranca el Onboarding desde cero.
  const resetTotal = async () => {
    try {
      addLog('Reset Total: vaciando tablas de negocio...')
      const db = await getDb()

      const tablas = await db.select<{ name: string }[]>(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
      )

      // Borrado en varias pasadas en lugar de "PRAGMA foreign_keys = OFF".
      // Ese PRAGMA no sirve acá por dos motivos: es por CONEXIÓN y tauri-plugin-sql
      // usa un pool de sqlx (el PRAGMA puede caer en una conexión distinta de la del
      // DELETE), y además es un no-op si se ejecuta dentro de una transacción.
      // Con FK activas hay que vaciar las hijas antes que las padres; cada pasada
      // destraba el nivel siguiente (clientes/productos/proveedores son las raíces).
      let pendientes = tablas.map(t => t.name).filter(n => !TABLAS_CONFIG_BASE.includes(n))
      let vaciadas = 0
      for (let pasada = 0; pasada < 10 && pendientes.length > 0; pasada++) {
        const fallaron: string[] = []
        for (const nombre of pendientes) {
          try {
            await db.execute(`DELETE FROM ${nombre}`)
            vaciadas++
          } catch {
            fallaron.push(nombre) // casi siempre una FK todavía sin resolver
          }
        }
        if (fallaron.length === pendientes.length) break // sin progreso: no insistir
        pendientes = fallaron
      }

      // Si algo quedó sin vaciar, cortar ANTES de tocar master.db: es preferible dejar
      // la instalación como estaba a dejarla sin usuario pero con datos viejos adentro.
      if (pendientes.length > 0) {
        addLog(`No se pudieron vaciar: ${pendientes.join(', ')}`)
        toast('Reset abortado: quedaron tablas sin vaciar — ver log', 'error')
        return
      }

      // De `configuracion` sobrevive sólo la clave base; alertas/backup vuelven a default.
      await db.execute('DELETE FROM configuracion WHERE clave <> ?', [CLAVE_CONFIG_BASE])
      // Reiniciar los AUTOINCREMENT de lo vaciado para que los IDs arranquen en 1.
      try {
        await db.execute(
          `DELETE FROM sqlite_sequence WHERE name NOT IN (${TABLAS_CONFIG_BASE.map(() => '?').join(',')})`,
          TABLAS_CONFIG_BASE
        )
      } catch { /* la DB puede no tener sqlite_sequence todavía */ }
      addLog(`${vaciadas} tablas vaciadas (${TABLAS_CONFIG_BASE.length} de config base preservadas)`)

      // Verificación: releer los conteos y confirmar que quedaron en cero. Sin esto un
      // borrado parcial pasaría desapercibido, que es justo lo que costó detectar antes.
      const sobrantes: string[] = []
      for (const t of tablas) {
        if (TABLAS_CONFIG_BASE.includes(t.name)) continue
        const r = await db.select<{ n: number }[]>(`SELECT COUNT(*) as n FROM ${t.name}`)
        if ((r[0]?.n ?? 0) > 0) sobrantes.push(`${t.name}(${r[0].n})`)
      }
      if (sobrantes.length > 0) {
        addLog(`Verificación FALLIDA, con filas: ${sobrantes.join(', ')}`)
        toast('Reset abortado: la verificación encontró filas — ver log', 'error')
        return
      }
      addLog('Verificación OK: todas las tablas de negocio en cero')

      addLog('Reset Total: borrando usuarios de master.db...')
      const master = await getMasterDb()
      await master.execute('DELETE FROM usuarios_master')
      try { await master.execute(`DELETE FROM sqlite_sequence WHERE name = 'usuarios_master'`) } catch { /* idem */ }

      // Resetear los stores persistidos ANTES de limpiar localStorage: si se hiciera al
      // revés, el middleware `persist` de zustand reescribiría las claves recién borradas.
      useAuthGlobalStore.getState().logout()
      cerrarSesion()
      resetOnboarding()
      localStorage.clear()

      addLog('Reset Total completado — reiniciando en Onboarding')
      toast('Reset total completado — reiniciando', 'warning')
      setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      addLog(`Error en Reset Total: ${e}`)
      toast('Error en el Reset Total — ver log', 'error')
    }
  }

  // INFO
  const copiarInfo = () => {
    const info = {
      version: '1.0.0',
      entorno: 'DEV',
      usuario: usuario ? `${usuario.nombre} (${usuario.rol})` : 'Sin sesión',
      modulo: activeModule,
      tema: theme,
      timestamp: new Date().toISOString(),
    }
    navigator.clipboard.writeText(JSON.stringify(info, null, 2))
    addLog('Info copiada al portapapeles')
    toast('Info copiada', 'success')
  }

  // ── RENDER ──────────────────────────────────────

  const secciones = [
    {
      icon: <Database size={12} />,
      titulo: 'Storage',
      acciones: [
        { label: 'Reset localStorage', fn: resetLocalStorage, danger: true },
        { label: 'Ver localStorage en consola', fn: verLocalStorage },
        { label: 'Exportar localStorage', fn: exportarLocalStorage },
      ],
    },
    {
      icon: <Database size={12} />,
      titulo: 'Base de datos',
      acciones: [
        { label: 'Listar tablas en consola', fn: listarTablas },
        { label: 'Contar registros por tabla', fn: contarRegistros },
      ],
    },
    {
      icon: <Navigation size={12} />,
      titulo: 'Navegación',
      acciones: [
        { label: 'Ir a LoginGlobal', fn: async () => { addLog('Ir a LoginGlobal'); useAuthGlobalStore.getState().logout(); window.location.reload() } },
        { label: 'Ir a Onboarding', fn: irAOnboarding },
        { label: 'Ir a Login', fn: irALogin },
        { label: 'Ir a Resumen General', fn: async () => { setModule('dashboard'); setAbierto(false) } },
      ],
    },
    {
      icon: <TriangleAlert size={12} />,
      titulo: 'Zona peligrosa',
      acciones: [
        {
          label: 'Reset Total (borra TODO)',
          danger: true,
          fn: async () => confirmar(
            'Reset Total — volver a estado de fábrica',
            resetTotal,
            'Esto borrará TODOS los datos: negocio, usuarios (incluido el Admin General), '
            + 'clientes, empleados, productos, proveedores, órdenes de trabajo, presupuestos, caja, todo. '
            + 'Sólo se conserva la configuración base del sistema. La app va a reiniciar en el Onboarding. '
            + 'Esta acción no se puede deshacer. ¿Continuar?',
          ),
        },
      ],
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-[4px]" onClick={() => setAbierto(false)} />

      {/* Panel */}
      <div className={cn(
        'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]',
        'w-[480px] max-h-[80vh] overflow-y-auto',
        'rounded-modal border shadow-2xl',
        'bg-[#0A0A0A] border-[#2A2A2A]',
        'light:bg-white light:border-[#E4E4E4]',
        'animate-fade-slide-down',
      )}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-[#2A2A2A] light:border-[#E4E4E4] bg-[#0A0A0A] light:bg-white">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-[#D4921A]" />
            <span className="text-sm font-semibold text-white light:text-black">Velora Dev Tools</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4921A]/20 text-[#D4921A] font-medium">DEV</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#606060]">CTRL+K para cerrar</span>
            <button onClick={() => setAbierto(false)}
              className="text-[#606060] hover:text-white light:hover:text-black transition-all duration-150 p-1 rounded-input hover:bg-white/10 light:hover:bg-black/5">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* ESTADO ACTUAL */}
          <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] p-3 space-y-1">
            <p className="text-[10px] font-semibold text-[#606060] uppercase tracking-wider mb-2">Estado actual</p>
            {[
              ['Auth global', usuarioGlobal ? `${usuarioGlobal.nombre} (${usuarioGlobal.rol})` : '—'],
              ['DNI', usuarioGlobal?.dni ?? '—'],
              ['Usuario', usuario ? `${usuario.nombre} — ${usuario.rol}` : '—'],
              ['Onboarding', completado ? 'Completado' : 'Pendiente'],
              ['Módulo', activeModule],
              ['Tema', theme],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[11px] text-[#606060]">{label}</span>
                <span className="text-[11px] text-white light:text-black font-medium">{value}</span>
              </div>
            ))}
          </div>

          {/* Confirmación inline */}
          {confirm && (
            <div className="rounded-card border border-[#D4921A]/40 bg-[#D4921A]/10 p-3">
              <p className="text-[11px] text-[#D4921A] mb-2">¿Seguro? Esta acción no se puede deshacer.</p>
              <p className="text-[11px] text-white light:text-black mb-3 font-medium">{confirm.accion}</p>
              {confirm.detalle && (
                <p className="text-[11px] text-[#A0A0A0] light:text-[#404040] mb-3 leading-5">{confirm.detalle}</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setConfirm(null)}
                  className="flex-1 py-1.5 text-[11px] rounded-input border border-[#2A2A2A] text-[#A0A0A0] hover:bg-white/5 transition-all duration-150">
                  Cancelar
                </button>
                <button onClick={ejecutarConFirm}
                  className="flex-1 py-1.5 text-[11px] rounded-input bg-[#C0392B]/20 text-[#C0392B] border border-[#C0392B]/30 hover:bg-[#C0392B]/30 transition-all duration-150">
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* SECCIONES */}
          {secciones.map(({ icon, titulo, acciones }) => (
            <div key={titulo}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[#606060]">{icon}</span>
                <span className="text-[10px] font-semibold text-[#606060] uppercase tracking-wider">{titulo}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {acciones.map(({ label, fn, danger }) => (
                  <button key={label} onClick={fn}
                    className={cn(
                      'px-3 py-2 text-[11px] rounded-input text-left border transition-all duration-150',
                      danger
                        ? 'border-[#C0392B]/30 text-[#C0392B] hover:bg-[#C0392B]/10'
                        : 'border-[#2A2A2A] text-[#A0A0A0] hover:text-white hover:bg-white/[0.06] light:border-[#E4E4E4] light:text-[#606060] light:hover:text-black light:hover:bg-black/[0.04]',
                    )}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* INFO + LOG */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Info size={12} className="text-[#606060]" />
              <span className="text-[10px] font-semibold text-[#606060] uppercase tracking-wider">Info</span>
            </div>
            <div className="flex gap-2 mb-3 items-center">
              <span className="text-[11px] text-[#606060]">Velora 1.0.0 · DEV · Tauri 2</span>
              <button onClick={copiarInfo}
                className="text-[11px] text-[#4A7FA5] hover:text-white light:hover:text-black transition-all duration-150">
                Copiar info
              </button>
            </div>
            {log.length > 0 && (
              <div className="rounded-input border border-[#2A2A2A] light:border-[#E4E4E4] bg-[#0A0A0A] light:bg-[#F4F4F4] p-2 max-h-28 overflow-y-auto">
                {log.map((line, i) => (
                  <p key={i} className="text-[10px] text-[#606060] font-mono leading-5">{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
