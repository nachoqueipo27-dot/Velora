import { useEffect, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ImagenCropper } from '../inventario/components/ImagenCropper'
import { crearEmpresa, crearLocal } from '../../db/master'

interface ModalNuevoNegocioProps {
  open: boolean
  modo: 'empresa' | 'local'
  empresaId?: number
  onClose: () => void
  onCreado: () => void
}

export const ModalNuevoNegocio = ({ open, modo, empresaId, onClose, onCreado }: ModalNuevoNegocioProps) => {
  const [nombre, setNombre] = useState('')
  const [direccion, setDireccion] = useState('')
  const [logo, setLogo] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (open) { setNombre(''); setDireccion(''); setLogo(null); setGuardando(false) }
  }, [open])

  const valido = nombre.trim() !== '' && (modo === 'empresa' || empresaId != null)

  const guardar = async () => {
    if (!valido || guardando) return
    setGuardando(true)
    try {
      if (modo === 'empresa') {
        await crearEmpresa(nombre.trim(), logo ?? undefined)
      } else {
        await crearLocal(empresaId!, nombre.trim(), direccion.trim() || undefined, logo ?? undefined)
      }
      onCreado()
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={modo === 'empresa' ? 'Nueva empresa' : 'Nuevo local'} maxWidth="max-w-md"
      footer={<>
        <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
        <Button onClick={guardar} disabled={!valido || guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
      </>}>
      <div className="flex flex-col gap-3 pb-1">
        <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus
          placeholder={modo === 'empresa' ? 'Ej. Mi Negocio' : 'Ej. Local Centro'} />
        {modo === 'local' && (
          <Input label="Dirección (opcional)" value={direccion} onChange={e => setDireccion(e.target.value)} />
        )}
        <div>
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040] mb-2 block">Logo (opcional)</span>
          <ImagenCropper value={logo} onChange={setLogo} />
        </div>
      </div>
    </Modal>
  )
}
