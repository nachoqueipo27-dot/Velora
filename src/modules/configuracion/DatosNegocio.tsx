import { useState } from 'react'
import { useOnboardingStore } from '../../store/onboardingStore'
import { useSessionStore } from '../../store/sessionStore'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ImagenCropper } from '../inventario/components/ImagenCropper'
import { registrarActividad } from '../../lib/registrarActividad'
import { realizarBackup } from '../../lib/backup'
import { getDb } from '../../db'
import { AlertTriangle, Check, Save } from 'lucide-react'

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
  const { data, updateData, resetOnboarding } = useOnboardingStore()
  const { cerrarSesion } = useSessionStore()
  const [form, setForm] = useState({
    nombreNegocio: data.nombreNegocio ?? '', rubro: data.rubro ?? '', direccion: data.direccion ?? '',
    telefono: data.telefono ?? '', email: data.email ?? '',
  })
  const [logo, setLogo] = useState<string | null>(data.logo ?? null)
  const [guardado, setGuardado] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [confirmTexto, setConfirmTexto] = useState('')
  const [reseteando, setReseteando] = useState(false)

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const guardar = async () => {
    updateData({ ...form, logo })
    await registrarActividad({ modulo: 'Configuración', accion: 'Editó datos del negocio' })
    setGuardado(true); setTimeout(() => setGuardado(false), 2200)
  }

  const ejecutarReset = async () => {
    if (confirmTexto !== 'RESETEAR') return
    setReseteando(true)
    try {
      const db = await getDb()
      for (const t of TABLAS) {
        try { await db.execute(`DROP TABLE IF EXISTS ${t}`) } catch (e) { console.warn('drop', t, e) }
      }
      resetOnboarding()
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

      {/* Zona de peligro */}
      <div className="mt-4 rounded-card border border-[#C0392B]/40 bg-[#C0392B]/[0.05] p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-[#C0392B]">
          <AlertTriangle size={16} /><span className="text-[13px] font-semibold uppercase tracking-wider">Zona de peligro</span>
        </div>
        <p className="text-[12px] text-[#A0A0A0] light:text-[#404040]">
          Resetear Velora elimina todos los datos (clientes, productos, OTs, ventas, caja, configuración) y vuelve al onboarding inicial.
        </p>
        <Button variant="danger" className="self-start" onClick={() => { setConfirmTexto(''); setResetOpen(true) }}>Resetear Velora</Button>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Resetear Velora" maxWidth="max-w-md"
        footer={<>
          <Button variant="ghost" onClick={() => setResetOpen(false)} disabled={reseteando}>Cancelar</Button>
          <Button variant="danger" onClick={ejecutarReset} disabled={confirmTexto !== 'RESETEAR' || reseteando}>{reseteando ? 'Reseteando...' : 'Resetear todo'}</Button>
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
        </div>
      </Modal>
    </div>
  )
}
