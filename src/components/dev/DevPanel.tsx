import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useNegocioStore } from '../../store/negocioStore'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { useSessionStore } from '../../store/sessionStore'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useNavigationStore } from '../../store/navigationStore'
import { useSyncStore } from '../../store/syncStore'
import { useThemeStore } from '../../store/themeStore'
import { useToastStore } from '../../store/toastStore'
import { getDb } from '../../db'
import { X, Terminal, Database, RefreshCw, Navigation, FlaskConical, Info } from 'lucide-react'

interface ConfirmState {
  accion: string
  fn: () => Promise<void>
}

export const DevPanel = () => {
  const [abierto, setAbierto] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [log, setLog] = useState<string[]>([])

  const { negocioActivo, limpiarNegocio } = useNegocioStore()
  const { usuario: usuarioGlobal } = useAuthGlobalStore()
  const { usuario, cerrarSesion } = useSessionStore()
  const { resetOnboarding, completado } = useOnboardingStore()
  const { activeModule, setModule } = useNavigationStore()
  const { pendientes, sincronizar, heartbeat } = useSyncStore()
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

  const confirmar = (accion: string, fn: () => Promise<void>) => setConfirm({ accion, fn })

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
  const borrarDBActiva = async () => {
    addLog('Borrando DB activa...')
    localStorage.clear()
    toast('DB activa borrada — recargando', 'warning')
    setTimeout(() => window.location.reload(), 800)
  }

  const borrarTodo = async () => {
    addLog('Borrando TODO...')
    localStorage.clear()
    const dbs = await window.indexedDB.databases?.() ?? []
    for (const db of dbs) {
      if (db.name) window.indexedDB.deleteDatabase(db.name)
    }
    toast('Todo borrado — recargando', 'warning')
    setTimeout(() => window.location.reload(), 800)
  }

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
  const irASeleccion = async () => {
    addLog('Navegando a SeleccionNegocio')
    toast('Yendo a SeleccionNegocio', 'info')
    limpiarNegocio()
  }

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

  // SYNC
  const syncAhora = async () => {
    addLog('Iniciando sync manual...')
    toast('Sincronizando...', 'info')
    try {
      await sincronizar()
      addLog('Sync completado')
      toast('Sync completado', 'success')
    } catch (e) {
      addLog(`Sync error: ${e}`)
      toast('Error en sync', 'error')
    }
  }

  const heartbeatManual = async () => {
    addLog('Enviando heartbeat...')
    await heartbeat()
    addLog('Heartbeat enviado')
    toast('Heartbeat enviado', 'success')
  }

  const marcarTodoPendiente = async () => {
    try {
      const db = await getDb()
      const tablas = [
        'clientes', 'empleados', 'productos', 'ordenes_trabajo',
        'presupuestos', 'cobros_caja', 'gastos_operativos',
        'cierres_caja', 'cierres_mes', 'fichajes',
        'movimientos_stock', 'proveedores', 'ordenes_compra',
      ]
      for (const tabla of tablas) {
        try { await db.execute(`UPDATE ${tabla} SET sync_status = 'pendiente'`) } catch { /* tabla sin columna */ }
      }
      addLog('Todo marcado como pendiente')
      toast('Todo marcado como pendiente', 'warning')
    } catch (e) {
      addLog(`Error: ${e}`)
    }
  }

  const verPendientes = async () => {
    try {
      const db = await getDb()
      const tablas = [
        'clientes', 'empleados', 'productos', 'ordenes_trabajo',
        'presupuestos', 'cobros_caja', 'gastos_operativos',
      ]
      const counts: Record<string, number> = {}
      for (const tabla of tablas) {
        try {
          const r = await db.select<{ count: number }[]>(
            `SELECT COUNT(*) as count FROM ${tabla} WHERE sync_status = 'pendiente'`
          )
          counts[tabla] = r[0]?.count ?? 0
        } catch { /* ignore */ }
      }
      console.table(counts)
      addLog('Pendientes por tabla — ver consola')
      toast('Pendientes en consola', 'info')
    } catch (e) {
      addLog(`Error: ${e}`)
    }
  }

  // DATOS DE PRUEBA
  const seedClientesExtra = async () => {
    try {
      const db = await getDb()
      const now = new Date().toISOString()
      const clientes = [
        ['Juan Prueba', '011-1234-5678', 'juan@test.com', 'Buenos Aires', 'Frecuente'],
        ['María Testing', '011-8765-4321', 'maria@test.com', 'Palermo', 'VIP'],
        ['Carlos Demo', '011-5555-9999', '', 'San Telmo', 'Ocasional'],
      ]
      for (const [nombre, telefono, email, direccion, categoria] of clientes) {
        await db.execute(
          `INSERT INTO clientes (nombre, telefono, email, direccion, categoria, creado_en, actualizado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [nombre, telefono, email, direccion, categoria, now, now]
        )
      }
      addLog('3 clientes de prueba insertados')
      toast('3 clientes insertados', 'success')
    } catch (e) {
      addLog(`Error: ${e}`)
      toast('Error al insertar clientes', 'error')
    }
  }

  const seedOTsExtra = async () => {
    try {
      const db = await getDb()
      const now = new Date().toISOString()
      const ots = [
        [5, 1, 5, 'simple', 'Gaseosa 500ml', 'recepcion', 400],
        [6, 2, 7, 'simple', 'Cable USB-C', 'en_proceso', 2500],
        [7, 1, 9, 'conjunto', 'Combo Hamburguesa', 'finalizado', 2500],
      ]
      for (const [numero, clienteId, productoId, tipo, nombre, estado, precio] of ots) {
        await db.execute(
          `INSERT INTO ordenes_trabajo
           (numero, cliente_id, producto_id, tipo_item, producto_nombre,
            estado, precio, total_final, creado_por, creado_en, actualizado_en)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DEV', ?, ?)`,
          [numero, clienteId, productoId, tipo, nombre, estado, precio, precio, now, now]
        )
      }
      addLog('3 OTs de prueba insertadas')
      toast('3 OTs insertadas', 'success')
    } catch (e) {
      addLog(`Error: ${e}`)
      toast('Error al insertar OTs', 'error')
    }
  }

  const seedCobrosHoy = async () => {
    try {
      const db = await getDb()
      const now = new Date().toISOString()
      const cobros = [
        [2500, 'efectivo', 'OT demo #1'],
        [1600, 'transferencia', 'Venta POS demo'],
        [800, 'tarjeta', 'Cobro manual demo'],
      ]
      for (const [monto, forma, concepto] of cobros) {
        await db.execute(
          `INSERT INTO cobros_caja (fecha, monto, forma_pago, concepto, creado_en)
           VALUES (?, ?, ?, ?, ?)`,
          [now, monto, forma, concepto, now]
        )
      }
      addLog('3 cobros del día insertados')
      toast('3 cobros insertados', 'success')
    } catch (e) {
      addLog(`Error: ${e}`)
      toast('Error al insertar cobros', 'error')
    }
  }

  // INFO
  const copiarInfo = () => {
    const info = {
      version: '1.0.0',
      entorno: 'DEV',
      negocio: negocioActivo ? `${negocioActivo.empresaNombre} / ${negocioActivo.localNombre}` : 'Sin negocio',
      usuario: usuario ? `${usuario.nombre} (${usuario.rol})` : 'Sin sesión',
      modulo: activeModule,
      tema: theme,
      pendientesSync: pendientes,
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
        { label: 'Borrar DB activa', fn: async () => confirmar('Borrar DB activa', borrarDBActiva), danger: true },
        { label: 'Borrar TODO (DB + storage)', fn: async () => confirmar('Borrar absolutamente todo', borrarTodo), danger: true },
        { label: 'Listar tablas en consola', fn: listarTablas },
        { label: 'Contar registros por tabla', fn: contarRegistros },
      ],
    },
    {
      icon: <Navigation size={12} />,
      titulo: 'Navegación',
      acciones: [
        { label: 'Ir a LoginGlobal', fn: async () => { useAuthGlobalStore.getState().logout(); window.location.reload() } },
        { label: 'Ir a SeleccionNegocio', fn: irASeleccion },
        { label: 'Ir a Onboarding', fn: irAOnboarding },
        { label: 'Ir a Login', fn: irALogin },
        { label: 'Ir a Dashboard', fn: async () => { setModule('dashboard'); setAbierto(false) } },
      ],
    },
    {
      icon: <RefreshCw size={12} />,
      titulo: 'Sync',
      acciones: [
        { label: 'Sincronizar ahora', fn: syncAhora },
        { label: 'Enviar heartbeat manual', fn: heartbeatManual },
        { label: 'Marcar todo como pendiente', fn: marcarTodoPendiente },
        { label: 'Ver pendientes por tabla', fn: verPendientes },
      ],
    },
    {
      icon: <FlaskConical size={12} />,
      titulo: 'Datos de prueba',
      acciones: [
        { label: 'Seed: 3 clientes extra', fn: seedClientesExtra },
        { label: 'Seed: 3 OTs extra', fn: seedOTsExtra },
        { label: 'Seed: cobros del día', fn: seedCobrosHoy },
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
              ['Negocio', negocioActivo ? `${negocioActivo.empresaNombre} / ${negocioActivo.localNombre}` : '—'],
              ['DB activa', negocioActivo ? `velora_e${negocioActivo.empresaId}_l${negocioActivo.localId}.db` : 'velora.db (default)'],
              ['Usuario', usuario ? `${usuario.nombre} — ${usuario.rol}` : '—'],
              ['Onboarding', completado ? 'Completado' : 'Pendiente'],
              ['Módulo', activeModule],
              ['Sync pendientes', String(pendientes)],
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
