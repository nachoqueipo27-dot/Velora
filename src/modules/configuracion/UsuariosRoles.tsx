import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useEmpleadosStore } from '../../store/empleadosStore'
import { useSessionStore } from '../../store/sessionStore'
import { MODULES } from '../../store/navigationStore'
import { getDb } from '../../db'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { UserPlus, ShieldCheck } from 'lucide-react'

type Nivel = 'sin_acceso' | 'solo_ver' | 'editar'
const NIVELES: { value: Nivel; label: string }[] = [
  { value: 'sin_acceso', label: 'Sin acceso' },
  { value: 'solo_ver',   label: 'Solo ver' },
  { value: 'editar',     label: 'Editar' },
]

export const UsuariosRoles = () => {
  const { empleados, roles, cargarEmpleados, cargarRoles, crearEmpleado } = useEmpleadosStore()
  const { usuario } = useSessionStore()
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState<number | null>(null)
  const [rolEditando, setRolEditando] = useState<number | null>(null)
  const [permisos, setPermisos] = useState<Record<string, Nivel>>({})

  useEffect(() => { cargarEmpleados(); cargarRoles() }, [cargarEmpleados, cargarRoles])

  const rolDe = (id: number) => roles.find(r => r.id === id)
  const adminRol = roles.find(r => r.esAdmin)

  const abrirPermisos = async (rid: number) => {
    setRolEditando(rid)
    const db = await getDb()
    const rows = await db.select<any[]>('SELECT modulo, nivel FROM permisos WHERE rol_id = ?', [rid])
    const map: Record<string, Nivel> = {}
    rows.forEach(r => { map[r.modulo] = r.nivel })
    setPermisos(map)
  }

  const guardarPermisos = async () => {
    if (rolEditando == null) return
    const db = await getDb()
    await db.execute('DELETE FROM permisos WHERE rol_id = ?', [rolEditando])
    for (const m of MODULES) {
      const nivel = permisos[m.id] ?? 'sin_acceso'
      await db.execute('INSERT INTO permisos (rol_id, modulo, nivel) VALUES (?, ?, ?)', [rolEditando, m.id, nivel])
    }
    setRolEditando(null)
  }

  const crear = async () => {
    if (!nombre.trim() || !rolId) return
    await crearEmpleado({ nombre: nombre.trim(), rolId, password: password || 'cambiar', tipoHorario: 'fijo', activo: true })
    setNuevoOpen(false); setNombre(''); setPassword(''); setRolId(null)
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Usuarios y roles</h2>
          <p className="text-[12px] text-[#606060]">Gestioná accesos y permisos por rol.</p>
        </div>
        <Button size="sm" onClick={() => setNuevoOpen(true)}><UserPlus size={14} className="mr-1.5" />Nuevo usuario</Button>
      </header>

      {/* Usuarios */}
      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
            <th className="font-medium px-4 py-2.5">Usuario</th>
            <th className="font-medium px-4 py-2.5">Rol</th>
            <th className="font-medium px-4 py-2.5">Estado</th>
          </tr></thead>
          <tbody>
            {empleados.map(e => (
              <tr key={e.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                <td className="px-4 py-2.5 text-white light:text-black">{e.nombre}{usuario?.nombre === e.nombre && <span className="text-[10px] text-[#606060] ml-1.5">(vos)</span>}</td>
                <td className="px-4 py-2.5"><Badge label={e.rolNombre} variant={rolDe(e.rolId)?.esAdmin ? 'info' : 'default'} /></td>
                <td className="px-4 py-2.5">{e.activo ? <Badge label="Activo" variant="success" /> : <Badge label="Inactivo" variant="error" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permisos por rol */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Permisos por rol</span>
        <div className="flex flex-wrap gap-2">
          {roles.map(r => (
            <button key={r.id} onClick={() => !r.esAdmin && abrirPermisos(r.id)} disabled={r.esAdmin}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-input border text-[13px] transition-all',
                r.esAdmin
                  ? 'border-[#2A2A2A] text-[#606060] light:border-[#E4E4E4] cursor-not-allowed'
                  : 'border-[#2A2A2A] text-white hover:border-white light:border-[#E4E4E4] light:text-black light:hover:border-black')}>
              <ShieldCheck size={13} />{r.nombre}{r.esAdmin && ' (acceso total)'}
            </button>
          ))}
        </div>
      </div>

      {/* Modal nuevo usuario */}
      <Modal open={nuevoOpen} onClose={() => setNuevoOpen(false)} title="Nuevo usuario" maxWidth="max-w-sm"
        footer={<>
          <Button variant="ghost" onClick={() => setNuevoOpen(false)}>Cancelar</Button>
          <Button onClick={crear} disabled={!nombre.trim() || !rolId}>Crear</Button>
        </>}>
        <div className="flex flex-col gap-3 pb-1">
          <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
          <Input label="Contraseña" type="password" value={password} onChange={e => setPassword(e.target.value)} hint="Si se deja vacío, queda 'cambiar'." />
          <Select label="Rol" value={rolId ?? ''} onChange={e => setRolId(Number(e.target.value) || null)}>
            <option value="">Seleccionar rol…</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </Select>
        </div>
      </Modal>

      {/* Modal permisos */}
      <Modal open={rolEditando != null} onClose={() => setRolEditando(null)} title={`Permisos · ${rolEditando != null ? rolDe(rolEditando)?.nombre : ''}`} maxWidth="max-w-lg"
        footer={<>
          <Button variant="ghost" onClick={() => setRolEditando(null)}>Cancelar</Button>
          <Button onClick={guardarPermisos}>Guardar permisos</Button>
        </>}>
        <div className="flex flex-col gap-1 pb-1 max-h-[50vh] overflow-y-auto">
          {MODULES.filter(m => m.id !== 'configuracion').map(m => (
            <div key={m.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
              <span className="text-[13px] text-white light:text-black">{m.label}</span>
              <div className="flex gap-1">
                {NIVELES.map(n => {
                  const activo = (permisos[m.id] ?? 'sin_acceso') === n.value
                  return (
                    <button key={n.value} onClick={() => setPermisos(p => ({ ...p, [m.id]: n.value }))}
                      className={cn('px-2 py-1 text-[11px] rounded-input border transition-all',
                        activo ? 'border-white bg-white text-black light:border-black light:bg-black light:text-white'
                          : 'border-[#2A2A2A] text-[#606060] hover:text-white light:border-[#E4E4E4] light:hover:text-black')}>
                      {n.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {adminRol && <p className="text-[11px] text-[#606060] mt-2">El rol Admin siempre tiene acceso total y no es editable.</p>}
        </div>
      </Modal>
    </div>
  )
}
