import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useOTStore } from '../../store/otStore'
import { getDb } from '../../db'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Pencil, Trash2, Plus } from 'lucide-react'

const COLORES = ['#C0392B', '#D4921A', '#4CAF7D', '#4A7FA5', '#9B86FF', '#E0598B', '#3FB0AC', '#888888']

interface EtiquetaForm { id?: number; nombre: string; color: string }

export const EtiquetasOT = () => {
  const { etiquetas, cargarEtiquetas } = useOTStore()
  const [editor, setEditor] = useState<EtiquetaForm | null>(null)
  const [aEliminar, setAEliminar] = useState<{ id: number; nombre: string } | null>(null)

  useEffect(() => { cargarEtiquetas() }, [cargarEtiquetas])

  const guardar = async () => {
    if (!editor || !editor.nombre.trim()) return
    const db = await getDb()
    if (editor.id) await db.execute('UPDATE etiquetas_ot SET nombre = ?, color = ? WHERE id = ?', [editor.nombre.trim(), editor.color, editor.id])
    else await db.execute('INSERT INTO etiquetas_ot (nombre, color, creado_en) VALUES (?, ?, ?)', [editor.nombre.trim(), editor.color, new Date().toISOString()])
    setEditor(null); await cargarEtiquetas()
  }
  const eliminar = async () => {
    if (!aEliminar) return
    const db = await getDb()
    await db.execute('DELETE FROM etiquetas_ot WHERE id = ?', [aEliminar.id])
    await db.execute('DELETE FROM ot_etiquetas WHERE etiqueta_id = ?', [aEliminar.id])
    setAEliminar(null); await cargarEtiquetas()
  }

  return (
    <div className="max-w-xl flex flex-col gap-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Etiquetas de OT</h2>
          <p className="text-[12px] text-[#606060]">Clasificá visualmente las órdenes de trabajo.</p>
        </div>
        <Button size="sm" onClick={() => setEditor({ nombre: '', color: COLORES[0] })}><Plus size={14} className="mr-1" />Nueva</Button>
      </header>

      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        {etiquetas.length === 0 ? <p className="text-[13px] text-[#606060] px-4 py-6 text-center">Sin etiquetas</p> :
          etiquetas.map(e => (
            <div key={e.id} className="flex items-center justify-between px-4 py-2.5 border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium" style={{ backgroundColor: `${e.color}26`, color: e.color }}>{e.nombre}</span>
              <div className="flex gap-1">
                <button onClick={() => setEditor({ id: e.id, nombre: e.nombre, color: e.color })} className="p-1 rounded text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5"><Pencil size={13} /></button>
                <button onClick={() => setAEliminar({ id: e.id, nombre: e.nombre })} className="p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
      </div>

      <Modal open={editor != null} onClose={() => setEditor(null)} title={editor?.id ? 'Editar etiqueta' : 'Nueva etiqueta'} maxWidth="max-w-sm"
        footer={<><Button variant="ghost" onClick={() => setEditor(null)}>Cancelar</Button><Button onClick={guardar} disabled={!editor?.nombre.trim()}>Guardar</Button></>}>
        <div className="flex flex-col gap-3 pb-1">
          <input value={editor?.nombre ?? ''} onChange={e => setEditor(ed => ed && { ...ed, nombre: e.target.value })} placeholder="Nombre" autoFocus
            className="px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black" />
          <div className="flex flex-wrap gap-2 items-center">
            {COLORES.map(c => (
              <button key={c} onClick={() => setEditor(ed => ed && { ...ed, color: c })}
                className={cn('w-7 h-7 rounded-full border-2 transition-all', editor?.color === c ? 'border-white light:border-black scale-110' : 'border-transparent')}
                style={{ backgroundColor: c }} />
            ))}
            <input type="color" value={editor?.color ?? '#888888'} onChange={e => setEditor(ed => ed && { ...ed, color: e.target.value })}
              className="w-7 h-7 rounded-full bg-transparent border border-[#2A2A2A] cursor-pointer" title="Color personalizado" />
          </div>
        </div>
      </Modal>

      <Modal open={aEliminar != null} onClose={() => setAEliminar(null)} title="Eliminar etiqueta" maxWidth="max-w-sm"
        footer={<><Button variant="ghost" onClick={() => setAEliminar(null)}>Cancelar</Button><Button variant="danger" onClick={eliminar}>Eliminar</Button></>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-1">¿Eliminar la etiqueta «{aEliminar?.nombre}»? Se quitará de todas las OTs.</p>
      </Modal>
    </div>
  )
}
