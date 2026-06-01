import { useEffect, useState } from 'react'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useProveedoresStore } from '../../store/proveedoresStore'
import type { Proveedor } from '../../types/proveedores'

interface ModalProveedorProps {
  open: boolean
  onClose: () => void
  proveedor?: Proveedor | null
}

export const ModalProveedor = ({ open, onClose, proveedor }: ModalProveedorProps) => {
  const { crearProveedor, actualizarProveedor } = useProveedoresStore()
  const esEdicion = !!proveedor

  const [nombre, setNombre] = useState('')
  const [rubro, setRubro] = useState('')
  const [contacto, setContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [direccion, setDireccion] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    setNombre(proveedor?.nombre ?? '')
    setRubro(proveedor?.rubro ?? '')
    setContacto(proveedor?.contacto ?? '')
    setTelefono(proveedor?.telefono ?? '')
    setEmail(proveedor?.email ?? '')
    setDireccion(proveedor?.direccion ?? '')
    setNotas(proveedor?.notas ?? '')
    setTouched(false)
  }, [open, proveedor])

  const nombreInvalido = nombre.trim() === ''

  const handleGuardar = async () => {
    if (nombreInvalido) { setTouched(true); return }
    setGuardando(true)
    try {
      const data = { nombre: nombre.trim(), rubro, contacto, telefono, email, direccion, notas }
      if (esEdicion && proveedor) await actualizarProveedor(proveedor.id, data)
      else await crearProveedor(data)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? 'Editar proveedor' : 'Nuevo proveedor'}
      maxWidth="max-w-md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
      </>}
    >
      <div className="flex flex-col gap-3 pb-1">
        <Input label="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)}
          error={touched && nombreInvalido ? 'Obligatorio' : undefined} autoFocus />
        <Input label="Rubro" value={rubro} onChange={e => setRubro(e.target.value)} />
        <Input label="Contacto" value={contacto} onChange={e => setContacto(e.target.value)} placeholder="Persona de contacto" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <Input label="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
        <Textarea label="Notas" rows={2} value={notas} onChange={e => setNotas(e.target.value)} />
      </div>
    </Modal>
  )
}
