import { useState } from 'react'
import { useConfigStore } from '../../store/configStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Pencil, Trash2, Plus } from 'lucide-react'

export const CategoriasGastos = () => {
  const { categoriasGastos, crearCatGasto, editarCatGasto, eliminarCatGasto } = useConfigStore()
  const [nueva, setNueva] = useState('')
  const [editando, setEditando] = useState<{ anterior: string; nuevo: string } | null>(null)
  const [aEliminar, setAEliminar] = useState<string | null>(null)

  const crear = async () => { if (nueva.trim() && !categoriasGastos.includes(nueva.trim())) { await crearCatGasto(nueva.trim()); setNueva('') } }

  return (
    <div className="max-w-xl flex flex-col gap-5">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Categorías de gastos</h2>
        <p className="text-[12px] text-[#606060]">Usadas al registrar gastos operativos en Caja.</p>
      </header>

      <div className="flex gap-2">
        <input value={nueva} onChange={e => setNueva(e.target.value)} onKeyDown={e => e.key === 'Enter' && crear()} placeholder="Nueva categoría de gasto"
          className="flex-1 px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
        <Button onClick={crear} disabled={!nueva.trim()}><Plus size={14} className="mr-1" />Agregar</Button>
      </div>

      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        {categoriasGastos.length === 0 ? <p className="text-[13px] text-[#606060] px-4 py-6 text-center">Sin categorías</p> :
          categoriasGastos.map(c => (
            <div key={c} className="flex items-center justify-between px-4 py-2.5 border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
              <span className="text-[13px] text-white light:text-black">{c}</span>
              <div className="flex gap-1">
                <button onClick={() => setEditando({ anterior: c, nuevo: c })} className="p-1 rounded text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5"><Pencil size={13} /></button>
                <button onClick={() => setAEliminar(c)} className="p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
      </div>

      <Modal open={editando != null} onClose={() => setEditando(null)} title="Editar categoría" maxWidth="max-w-sm"
        footer={<><Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
          <Button onClick={async () => { if (editando) { await editarCatGasto(editando.anterior, editando.nuevo.trim()); setEditando(null) } }}>Guardar</Button></>}>
        <input value={editando?.nuevo ?? ''} onChange={e => setEditando(ed => ed && { ...ed, nuevo: e.target.value })} autoFocus
          className="w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
      </Modal>

      <Modal open={aEliminar != null} onClose={() => setAEliminar(null)} title="Eliminar categoría" maxWidth="max-w-sm"
        footer={<><Button variant="ghost" onClick={() => setAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={async () => { if (aEliminar) { await eliminarCatGasto(aEliminar); setAEliminar(null) } }}>Eliminar</Button></>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-1">¿Eliminar «{aEliminar}»?</p>
      </Modal>
    </div>
  )
}
