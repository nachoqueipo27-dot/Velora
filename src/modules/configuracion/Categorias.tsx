import { useEffect, useState } from 'react'
import { useInventarioStore } from '../../store/inventarioStore'
import { getDb } from '../../db'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Pencil, Trash2, Plus } from 'lucide-react'

export const Categorias = () => {
  const { categorias, cargarCategorias, crearCategoria } = useInventarioStore()
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [nueva, setNueva] = useState('')
  const [editando, setEditando] = useState<{ id: number; nombre: string } | null>(null)
  const [aEliminar, setAEliminar] = useState<{ id: number; nombre: string } | null>(null)

  const recargar = async () => {
    await cargarCategorias()
    const db = await getDb()
    const rows = await db.select<{ categoria_id: number; n: number }[]>(
      'SELECT categoria_id, COUNT(*) as n FROM productos WHERE categoria_id IS NOT NULL GROUP BY categoria_id')
    const map: Record<number, number> = {}
    rows.forEach(r => { map[r.categoria_id] = r.n })
    setCounts(map)
  }
  useEffect(() => { recargar() }, [])

  const crear = async () => { if (nueva.trim()) { await crearCategoria(nueva.trim()); setNueva(''); recargar() } }
  const guardarEdit = async () => {
    if (!editando) return
    const db = await getDb()
    await db.execute('UPDATE categorias SET nombre = ? WHERE id = ?', [editando.nombre, editando.id])
    setEditando(null); recargar()
  }
  const eliminar = async () => {
    if (!aEliminar) return
    const db = await getDb()
    await db.execute('UPDATE productos SET categoria_id = NULL WHERE categoria_id = ?', [aEliminar.id])
    await db.execute('DELETE FROM categorias WHERE id = ?', [aEliminar.id])
    setAEliminar(null); recargar()
  }

  return (
    <div className="max-w-xl flex flex-col gap-5">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Categorías de productos</h2>
        <p className="text-[12px] text-[#606060]">Organizá el inventario por categoría.</p>
      </header>

      <div className="flex gap-2">
        <input value={nueva} onChange={e => setNueva(e.target.value)} onKeyDown={e => e.key === 'Enter' && crear()} placeholder="Nueva categoría"
          className="flex-1 px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
        <Button onClick={crear} disabled={!nueva.trim()}><Plus size={14} className="mr-1" />Agregar</Button>
      </div>

      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        {categorias.length === 0 ? <p className="text-[13px] text-[#606060] px-4 py-6 text-center">Sin categorías</p> :
          categorias.map(c => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
              <div>
                <span className="text-[13px] text-white light:text-black">{c.nombre}</span>
                <span className="text-[11px] text-[#606060] ml-2">{counts[c.id] ?? 0} producto{(counts[c.id] ?? 0) !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditando({ id: c.id, nombre: c.nombre })} className="p-1 rounded text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5"><Pencil size={13} /></button>
                <button onClick={() => setAEliminar({ id: c.id, nombre: c.nombre })} className="p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
      </div>

      <Modal open={editando != null} onClose={() => setEditando(null)} title="Editar categoría" maxWidth="max-w-sm"
        footer={<><Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button><Button onClick={guardarEdit}>Guardar</Button></>}>
        <input value={editando?.nombre ?? ''} onChange={e => setEditando(ed => ed && { ...ed, nombre: e.target.value })} autoFocus
          className="w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
      </Modal>

      <Modal open={aEliminar != null} onClose={() => setAEliminar(null)} title="Eliminar categoría" maxWidth="max-w-sm"
        footer={<><Button variant="ghost" onClick={() => setAEliminar(null)}>Cancelar</Button><Button variant="danger" onClick={eliminar}>Eliminar</Button></>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-1">¿Eliminar «{aEliminar?.nombre}»?</p>
        {aEliminar && (counts[aEliminar.id] ?? 0) > 0 && (
          <p className="text-[12px] text-[#D4921A]">{counts[aEliminar.id]} producto(s) quedarán sin categoría.</p>
        )}
      </Modal>
    </div>
  )
}
