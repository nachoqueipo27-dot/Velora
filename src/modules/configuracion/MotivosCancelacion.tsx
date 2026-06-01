import { useState } from 'react'
import { useConfigStore } from '../../store/configStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Trash2, Plus, Lock } from 'lucide-react'

export const MotivosCancelacion = () => {
  const { motivos, crearMotivo, eliminarMotivo } = useConfigStore()
  const [nuevo, setNuevo] = useState('')
  const [aEliminar, setAEliminar] = useState<{ id: number; nombre: string } | null>(null)

  const crear = async () => { if (nuevo.trim()) { await crearMotivo(nuevo.trim()); setNuevo('') } }

  return (
    <div className="max-w-xl flex flex-col gap-5">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Motivos de cancelación</h2>
        <p className="text-[12px] text-[#606060]">Los motivos fijos no se pueden editar ni eliminar.</p>
      </header>

      <div className="flex gap-2">
        <input value={nuevo} onChange={e => setNuevo(e.target.value)} onKeyDown={e => e.key === 'Enter' && crear()} placeholder="Nuevo motivo personalizado"
          className="flex-1 px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
        <Button onClick={crear} disabled={!nuevo.trim()}><Plus size={14} className="mr-1" />Agregar</Button>
      </div>

      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        {motivos.map(m => (
          <div key={m.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-white light:text-black">{m.nombre}</span>
              {m.fijo && <Badge label="Fijo" variant="default" />}
            </div>
            {m.fijo
              ? <Lock size={13} className="text-[#606060]" />
              : <button onClick={() => setAEliminar({ id: m.id, nombre: m.nombre })} className="p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={13} /></button>}
          </div>
        ))}
      </div>

      <Modal open={aEliminar != null} onClose={() => setAEliminar(null)} title="Eliminar motivo" maxWidth="max-w-sm"
        footer={<><Button variant="ghost" onClick={() => setAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={async () => { if (aEliminar) { await eliminarMotivo(aEliminar.id); setAEliminar(null) } }}>Eliminar</Button></>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-1">¿Eliminar el motivo «{aEliminar?.nombre}»?</p>
      </Modal>
    </div>
  )
}
