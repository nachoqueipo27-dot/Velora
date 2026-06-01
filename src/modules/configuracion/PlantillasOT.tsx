import { useEffect, useState } from 'react'
import { useOTStore } from '../../store/otStore'
import { useInventarioStore } from '../../store/inventarioStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Trash2, Plus } from 'lucide-react'

export const PlantillasOT = () => {
  const { plantillas, cargarPlantillas, crearPlantilla, eliminarPlantilla } = useOTStore()
  const { productos, cargarProductos } = useInventarioStore()
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [productoId, setProductoId] = useState<number | null>(null)
  const [aEliminar, setAEliminar] = useState<{ id: number; nombre: string } | null>(null)

  useEffect(() => { cargarPlantillas(); cargarProductos() }, [cargarPlantillas, cargarProductos])

  const crear = async () => {
    if (!nombre.trim()) return
    const prod = productos.find(p => p.id === productoId)
    await crearPlantilla(nombre.trim(), descripcion, productoId, prod?.tipo ?? null)
    setOpen(false); setNombre(''); setDescripcion(''); setProductoId(null)
  }

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Plantillas de OT</h2>
          <p className="text-[12px] text-[#606060]">Plantillas para crear órdenes de trabajo rápidas.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={14} className="mr-1" />Nueva</Button>
      </header>

      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        {plantillas.length === 0 ? <p className="text-[13px] text-[#606060] px-4 py-6 text-center">Sin plantillas</p> :
          plantillas.map(pl => {
            const prod = productos.find(p => p.id === pl.productoId)
            return (
              <div key={pl.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
                <div className="min-w-0">
                  <div className="text-[13px] text-white light:text-black font-medium truncate">{pl.nombre}</div>
                  <div className="text-[11px] text-[#606060] truncate">{prod?.nombre ?? 'Sin producto'}{pl.descripcion ? ` · ${pl.descripcion}` : ''}</div>
                </div>
                <button onClick={() => setAEliminar({ id: pl.id, nombre: pl.nombre })} className="p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={13} /></button>
              </div>
            )
          })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva plantilla" maxWidth="max-w-md"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={crear} disabled={!nombre.trim()}>Crear</Button></>}>
        <div className="flex flex-col gap-3 pb-1">
          <Input label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
          <Input label="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          <Select label="Producto" value={productoId ?? ''} onChange={e => setProductoId(Number(e.target.value) || null)}>
            <option value="">Sin producto</option>
            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </Select>
        </div>
      </Modal>

      <Modal open={aEliminar != null} onClose={() => setAEliminar(null)} title="Eliminar plantilla" maxWidth="max-w-sm"
        footer={<><Button variant="ghost" onClick={() => setAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={async () => { if (aEliminar) { await eliminarPlantilla(aEliminar.id); setAEliminar(null) } }}>Eliminar</Button></>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-1">¿Eliminar la plantilla «{aEliminar?.nombre}»?</p>
      </Modal>
    </div>
  )
}
