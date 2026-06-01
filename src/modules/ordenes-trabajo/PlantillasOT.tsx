import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useOTStore } from '../../store/otStore'
import { useInventarioStore } from '../../store/inventarioStore'
import { Plus, Trash2, LayoutTemplate } from 'lucide-react'

export const PlantillasOT = () => {
  const { plantillas, cargarPlantillas, crearPlantilla, eliminarPlantilla } = useOTStore()
  const { productos, cargarProductos } = useInventarioStore()
  const [modal, setModal] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [productoId, setProductoId] = useState<number | ''>('')
  const [confirmId, setConfirmId] = useState<number | null>(null)

  useEffect(() => { cargarPlantillas(); cargarProductos() }, [cargarPlantillas, cargarProductos])

  const prodMap = useMemo(() => {
    const m = new Map<number, { nombre: string; tipo: string }>()
    productos.forEach(p => m.set(p.id, { nombre: p.nombre, tipo: p.tipo }))
    return m
  }, [productos])

  const handleCrear = async () => {
    if (nombre.trim() === '') return
    const prod = productoId === '' ? null : prodMap.get(Number(productoId))
    await crearPlantilla(nombre.trim(), descripcion.trim(), productoId === '' ? null : Number(productoId), prod?.tipo ?? null)
    setModal(false); setNombre(''); setDescripcion(''); setProductoId('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white light:text-black">Plantillas de OT</h2>
        <Button size="sm" onClick={() => setModal(true)}><Plus size={14} className="mr-1.5" /> Nueva plantilla</Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {plantillas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><LayoutTemplate size={20} className="text-[#606060]" /></div>
            <p className="text-sm text-[#A0A0A0] light:text-[#404040]">No hay plantillas</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {plantillas.map(pl => (
              <div key={pl.id} className={cn('flex items-center justify-between rounded-card border px-4 py-3', 'border-[#2A2A2A] bg-[#141414]', 'light:border-[#E4E4E4] light:bg-white')}>
                <div>
                  <div className="text-sm font-medium text-white light:text-black">{pl.nombre}</div>
                  <div className="text-[11px] text-[#606060]">{pl.descripcion || 'Sin descripción'}{pl.productoId ? ` · ${prodMap.get(pl.productoId)?.nombre ?? ''}` : ''}</div>
                </div>
                {confirmId === pl.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#A0A0A0]">¿Eliminar?</span>
                    <Button size="sm" variant="danger" onClick={() => { eliminarPlantilla(pl.id); setConfirmId(null) }}>Sí</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>No</Button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(pl.id)} className="p-1.5 rounded-input text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={14} /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nueva plantilla"
        footer={<>
          <Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button>
          <Button onClick={handleCrear} disabled={nombre.trim() === ''}>Crear</Button>
        </>}>
        <div className="flex flex-col gap-3 pb-1">
          <Input label="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
          <Textarea label="Descripción" rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          <Select label="Producto (opcional)" value={productoId} onChange={e => setProductoId(e.target.value === '' ? '' : Number(e.target.value))}>
            <option value="" className="bg-[#141414] light:bg-white">Sin producto</option>
            {productos.map(p => <option key={p.id} value={p.id} className="bg-[#141414] light:bg-white">{p.nombre} ({p.tipo})</option>)}
          </Select>
        </div>
      </Modal>
    </div>
  )
}
