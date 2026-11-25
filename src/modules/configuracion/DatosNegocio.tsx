import { useState } from 'react'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useNegocioStore } from '../../store/negocioStore'
import { useSessionStore } from '../../store/sessionStore'
import { useAuthGlobalStore } from '../../store/authGlobalStore'
import { esClaveDelDueno } from '../../db/acceso'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ImagenCropper } from '../inventario/components/ImagenCropper'
import { registrarActividad } from '../../lib/registrarActividad'
import { realizarBackup } from '../../lib/backup'
import { getDb } from '../../db'
import { exigirEditar } from '../../lib/permisos'
import { AlertTriangle, Check, RotateCcw, Save } from 'lucide-react'

const TABLAS = [
  'clientes', 'log_comunicaciones', 'roles', 'permisos', 'empleados', 'horarios_fijos', 'turnos',
  'asignacion_turnos', 'fichajes', 'horas_extras', 'ausencias', 'categorias', 'productos',
  'conjunto_componentes', 'movimientos_stock', 'proveedores', 'ordenes_compra', 'items_orden_compra',
  'historial_precios', 'listas_precios_snapshot', 'presupuestos', 'items_presupuesto', 'etiquetas_ot',
  'plantillas_ot', 'ordenes_trabajo', 'ot_etiquetas', 'ot_notas', 'garantias', 'citas', 'ventas_pos',
  'items_venta_pos', 'cobros_caja', 'gastos_operativos', 'cierres_caja', 'cierres_mes', 'devoluciones',
  'items_devolucion', 'historial_actividad', 'backups', 'configuracion_ticket', 'configuracion_pdf',
  'motivos_cancelacion', 'tipos_cambio', 'configuracion',
]

export const DatosNegocio = () => {
  const { updateData, resetOnboarding, relanzarOnboarding } = useOnboardingStore()
  const { datos, guardar: guardarNegocio } = useNegocioStore()
  const dueno = useAuthGlobalStore(s => s.usuario?.esAdminGeneral ? s.usuario : null)
  const { cerrarSesion } = useSessionStore()
  const [form, setForm] = useState({
    nombreNegocio: datos.nombreNegocio, rubro: datos.rubro, direccion: datos.direccion,
    telefono: datos.telefono, email: datos.email,
  })
  const [logo, setLogo] = useState<string | null>(datos.logo)
  const [guardado, setGuardado] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmTexto, setConfirmTexto] = useState('')
  const [reseteando, setReseteando] = useState(false)
  // Resetear y volver a correr la configuración inicial: solo el dueño, con su contraseña.
  const [relanzarOpen, setRelanzarOpen] = useState(false)
  const [clave, setClave] = useState('')
  const [errorClave, setErrorClave] = useState<string | undefined>()

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    exigirEditar('configuracion')
    await guardarNegocio({ ...form, logo })
    await registrarActividad({ modulo: 'Configuración', accion: 'Editó datos del negocio' })
    setGuardado(true); setTimeout(() => setGuardado(false), 2200)
  }

  const claveCorrecta = async () => {
    const ok = await esClaveDelDueno(dueno?.dni ?? null, clave)
    setErrorClave(ok ? undefined : 'Contraseña incorrecta')
    return ok
  }

  const relanzar = async () => {
    if (!dueno || !(await claveCorrecta())) return
    await registrarActividad({ modulo: 'Configuración', accion: 'Volvió a correr la configuración inicial' })
    // El onboarding arranca con los datos actuales de la base (al terminar se vuelven a guardar ahí).
    updateData({ ...datos, funcionesHabilitadas: datos.funcionesHabilitadas ?? undefined })
    relanzarOnboarding(dueno)
  }

  const ejecutarReset = async () => {
    exigirEditar('configuracion')
    if (confirmTexto !== 'RESETEAR' || !dueno) return
    setReseteando(true)
    try {
      if (!(await claveCorrecta())) { setReseteando(false); return }
      const db = await getDb()
      for (const t of TABLAS) {
        try { await db.execute(`DROP TABLE IF EXISTS ${t}`) } catch (e) { console.warn('drop', t, e) }
      }
      resetOnboarding()
      relanzarOnboarding(dueno)
      cerrarSesion()
      window.location.reload()
    } catch (e) {
      console.error('reset', e)
      setReseteando(false)
    }
  }

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Datos del negocio</h2>
        <p className="text-[12px] text-[#606060]">Aparecen en PDFs, tickets y documentos.</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Input label="Nombre del negocio" value={form.nombreNegocio} onChange={e => set('nombreNegocio', e.target.value)} />
        <Input label="Rubro" value={form.rubro} onChange={e => set('rubro', e.target.value)} />
        <Input label="Dirección" value={form.direccion} onChange={e => set('direccion', e.target.value)} />
        <Input label="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
        <Input label="Email" value={form.email} onChange={e => set('email', e.target.value)} className="col-span-2" />
      </div>

      <div>
        <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040] mb-2 block">Logo</span>
        <ImagenCropper value={logo} onChange={setLogo} />
      </div>

      <div>
        <Button onClick={guardar}>{guardado ? <><Check size={15} className="mr-1.5" />Guardado</> : <><Save size={15} className="mr-1.5" />Guardar cambios</>}</Button>
      </div>

      {dueno && <>
      {/* Volver a correr el onboarding, sin borrar nada */}
      <div className="mt-4 rounded-tarjeta border border-borde bg-superficie p-4 flex flex-col gap-3 dark:border-oscuro-borde dark:bg-oscuro-superficie">
        <p className="text-seccion font-semibold text-texto dark:text-oscuro-texto">Configuración inicial</p>
        <p className="text-cuerpo text-texto-3 dark:text-oscuro-texto-2">
          Vuelve a mostrar los pasos del primer uso (negocio, tu cuenta, preferencias y funciones). No borra ningún dato.
        </p>
        <Button variant="secondary" className="self-start" onClick={() => { setClave(''); setErrorClave(undefined); setRelanzarOpen(true) }}>
          <RotateCcw size={15} className="mr-1.5" />Volver a correrla
        </Button>
      </div>

      <Modal open={relanzarOpen} onClose={() => setRelanzarOpen(false)} title="Volver a correr la configuración inicial" maxWidth="max-w-sm"
        footer={<>
          <Button variant="ghost" onClick={() => setRelanzarOpen(false)}>Cancelar</Button>
          <Button onClick={relanzar} disabled={clave === ''}>Continuar</Button>
        </>}>
        <div className="pb-1">
          <Input label="Tu contraseña" type="password" value={clave} autoFocus error={errorClave}
            hint="Solo el dueño puede hacerlo." onChange={e => { setClave(e.target.value); setErrorClave(undefined) }} />
        </div>
      </Modal>

      {/* Zona de peligro */}
      <div className="mt-4 rounded-card border border-[#C0392B]/40 bg-[#C0392B]/[0.05] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#C0392B]">
          <AlertTriangle size={16} /><span className="text-[13px] font-semibold uppercase tracking-wider">Zona de peligro</span>
        </div>
        <p className="text-[12px] text-[#A0A0A0] light:text-[#404040]">
          Resetear Velora elimina todos los datos (clientes, productos, OTs, ventas, caja, configuración) y vuelve al onboarding inicial.
        </p>
        <Button variant="danger" className="self-start" onClick={() => { setConfirmTexto(''); setClave(''); setErrorClave(undefined); setResetOpen(true) }}>Resetear Velora</Button>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Resetear Velora" maxWidth="max-w-md"
        footer={<>
          <Button variant="ghost" onClick={() => setResetOpen(false)} disabled={reseteando}>Cancelar</Button>
          <Button variant="danger" onClick={ejecutarReset} disabled={confirmTexto !== 'RESETEAR' || clave === '' || reseteando}>{reseteando ? 'Reseteando...' : 'Resetear todo'}</Button>
        </>}>
        <div className="flex flex-col gap-3 pb-1">
          <p className="text-[13px] text-[#A0A0A0] light:text-[#404040]">Se eliminará de forma permanente:</p>
          <ul className="text-[12px] text-[#606060] list-disc pl-5 space-y-0.5">
            <li>Clientes, empleados y proveedores</li>
            <li>Inventario y movimientos de stock</li>
            <li>Presupuestos, OTs, ventas y devoluciones</li>
            <li>Caja, cierres e historial de actividad</li>
            <li>Toda la configuración del sistema</li>
          </ul>
          <Button variant="secondary" size="sm" className="self-start" onClick={() => realizarBackup('manual')}>Hacer backup antes de resetear</Button>
          <div className="flex flex-col gap-1">
            <label className="text-[12px] text-[#C0392B]">Escribí <b>RESETEAR</b> para confirmar</label>
            <input value={confirmTexto} onChange={e => setConfirmTexto(e.target.value)} placeholder="RESETEAR"
              className="px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-[#C0392B] light:border-[#E4E4E4] light:text-black" />
          </div>
          <Input label="Tu contraseña" type="password" value={clave} error={errorClave}
            hint="Solo el dueño puede resetear Velora." onChange={e => { setClave(e.target.value); setErrorClave(undefined) }} />
        </div>
      </Modal>
      </>}
    </div>
  )
}
