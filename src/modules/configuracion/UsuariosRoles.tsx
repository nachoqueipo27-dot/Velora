import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useEmpleadosStore, type NuevoEmpleado } from '../../store/empleadosStore'
import { useSessionStore } from '../../store/sessionStore'
import { MODULES } from '../../store/navigationStore'
import { getDb } from '../../db'
import { toast } from '../../store/toastStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { UserPlus, ShieldCheck, Pencil, Trash2 } from 'lucide-react'
import type { Empleado } from '../../types/empleados'

type Nivel = 'sin_acceso' | 'solo_ver' | 'editar'
const NIVELES: { value: Nivel; label: string }[] = [
  { value: 'sin_acceso', label: 'Sin acceso' },
  { value: 'solo_ver',   label: 'Solo ver' },
  { value: 'editar',     label: 'Editar' },
]

export const UsuariosRoles = () => {
  const { empleados, roles, cargarEmpleados, cargarRoles, crearEmpleado, actualizarEmpleado, eliminarEmpleado } = useEmpleadosStore()
  const { usuario } = useSessionStore()

  // Modal crear/editar usuario
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Empleado | null>(null)
  const [nombre, setNombre] = useState('')
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')
  const [rolId, setRolId] = useState<number | null>(null)
  const [activo, setActivo] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [aEliminar, setAEliminar] = useState<Empleado | null>(null)

  // Permisos por rol
  const [rolEditando, setRolEditando] = useState<number | null>(null)
  const [permisos, setPermisos] = useState<Record<string, Nivel>>({})

  useEffect(() => { cargarEmpleados(); cargarRoles() }, [cargarEmpleados, cargarRoles])

  const rolDe = (id: number) => roles.find(r => r.id === id)
  const adminRol = roles.find(r => r.esAdmin)
  const dniValido = /^\d{7,}$/.test(dni.trim())

  const abrirNuevo = () => {
    setEditando(null)
    setNombre(''); setDni(''); setPassword(''); setRolId(null); setActivo(true)
    setModalOpen(true)
  }

  const abrirEditar = (e: Empleado) => {
    setEditando(e)
    setNombre(e.nombre); setDni(e.dni ?? ''); setPassword(''); setRolId(e.rolId); setActivo(e.activo)
    setModalOpen(true)
  }

  const guardar = async () => {
    if (!nombre.trim() || !rolId || !dniValido) return
    setGuardando(true)
    try {
      const payload: NuevoEmpleado = {
        nombre: nombre.trim(),
        dni: dni.trim(),
        rolId,
        password,
        tipoHorario: editando?.tipoHorario ?? 'fijo',
        activo,
      }
      if (editando) {
        await actualizarEmpleado(editando.id, payload)
        toast.success('Usuario actualizado')
      } else {
        await crearEmpleado(payload)
        toast.success('Usuario creado')
      }
      setModalOpen(false)
    } catch (e) {
      toast.error('No se pudo guardar el usuario')
      console.error(e)
    } finally {
      setGuardando(false)
    }
  }

  const confirmarEliminar = async () => {
    if (!aEliminar) return
    try {
      await eliminarEmpleado(aEliminar.id)
      toast.success('Usuario eliminado')
    } catch (e) {
      toast.error('No se pudo eliminar')
      console.error(e)
    } finally {
      setAEliminar(null)
    }
  }

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

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Usuarios y roles</h2>
          <p className="text-[12px] text-[#606060]">Gestioná accesos y permisos por rol.</p>
        </div>
        <Button size="sm" onClick={abrirNuevo}><UserPlus size={14} className="mr-1.5" />Nuevo usuario</Button>
      </header>

      {/* Usuarios */}
      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead><tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
            <th className="font-medium px-4 py-2.5">Usuario</th>
            <th className="font-medium px-4 py-2.5">DNI</th>
            <th className="font-medium px-4 py-2.5">Rol</th>
            <th className="font-medium px-4 py-2.5">Estado</th>
            <th className="font-medium px-4 py-2.5 text-right">Acciones</th>
          </tr></thead>
          <tbody>
            {empleados.map(e => {
              const esVos = usuario?.nombre === e.nombre
              return (
                <tr key={e.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                  <td className="px-4 py-2.5 text-white light:text-black">{e.nombre}{esVos && <span className="text-[10px] text-[#606060] ml-1.5">(vos)</span>}</td>
                  <td className="px-4 py-2.5 text-[#A0A0A0] light:text-[#404040] tabular-nums">{e.dni || '—'}</td>
                  <td className="px-4 py-2.5"><Badge label={e.rolNombre} variant={rolDe(e.rolId)?.esAdmin ? 'info' : 'default'} /></td>
                  <td className="px-4 py-2.5">{e.activo ? <Badge label="Activo" variant="success" /> : <Badge label="Inactivo" variant="error" />}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEditar(e)} title="Editar"
                        className="p-1.5 rounded-input text-[#808080] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setAEliminar(e)} disabled={esVos} title={esVos ? 'No podés eliminar tu propia sesión' : 'Eliminar'}
                        className={cn('p-1.5 rounded-input transition-all',
                          esVos
                            ? 'text-[#3A3A3A] light:text-[#D0D0D0] cursor-not-allowed'
                            : 'text-[#808080] hover:text-[#C0392B] hover:bg-[#C0392B]/10')}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
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

      {/* Modal crear / editar usuario */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editando ? 'Editar usuario' : 'Nuevo usuario'} maxWidth="max-w-sm"
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={!nombre.trim() || !rolId || !dniValido || guardando}>
            {guardando ? 'Guardando…' : editando ? 'Guardar' : 'Crear'}
          </Button>
        </>}>
        <div className="flex flex-col gap-3 pb-1">
          <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
          <Input
            label="DNI"
            placeholder="Solo números (mín. 7 dígitos)"
            inputMode="numeric"
            value={dni}
            onChange={e => setDni(e.target.value.replace(/\D/g, ''))}
            error={dni !== '' && !dniValido ? 'DNI inválido (mínimo 7 dígitos)' : undefined}
            hint="Identificador único para iniciar sesión."
          />
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            hint={editando ? 'Dejá vacío para mantener la actual.' : "Si se deja vacío, queda 'cambiar'."}
          />
          <Select label="Rol" value={rolId ?? ''} onChange={e => setRolId(Number(e.target.value) || null)}>
            <option value="">Seleccionar rol…</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </Select>
          <label className="flex items-center gap-2 text-[13px] text-[#A0A0A0] light:text-[#404040] cursor-pointer">
            <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} className="accent-current" />
            Usuario activo
          </label>
        </div>
      </Modal>

      {/* Confirmación de eliminación */}
      <Modal open={aEliminar != null} onClose={() => setAEliminar(null)} title="Eliminar usuario" maxWidth="max-w-sm"
        footer={<>
          <Button variant="ghost" onClick={() => setAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmarEliminar}>Eliminar</Button>
        </>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-1">
          ¿Eliminar a <span className="font-medium text-white light:text-black">{aEliminar?.nombre}</span>? Se quitará de este local y de su acceso por DNI. Esta acción no se puede deshacer.
        </p>
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
                  const activoNivel = (permisos[m.id] ?? 'sin_acceso') === n.value
                  return (
                    <button key={n.value} onClick={() => setPermisos(p => ({ ...p, [m.id]: n.value }))}
                      className={cn('px-2 py-1 text-[11px] rounded-input border transition-all',
                        activoNivel ? 'border-white bg-white text-black light:border-black light:bg-black light:text-white'
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
