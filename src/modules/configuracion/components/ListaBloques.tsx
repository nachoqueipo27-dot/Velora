import { useState } from 'react'
import { cn } from '../../../lib/utils'
import type { BloqueConfig } from '../../../store/configStore'
import { GripVertical, Eye, EyeOff, Trash2, Plus, Bold } from 'lucide-react'

export const TIPO_LABEL: Record<string, string> = {
  encabezado: 'Encabezado (logo + nombre)',
  datos_negocio: 'Datos del negocio',
  fecha: 'Fecha',
  fecha_hora: 'Fecha y hora',
  numero_ot: 'Número de OT',
  cliente: 'Cliente',
  productos: 'Productos',
  items: 'Items',
  total: 'Total',
  totales: 'Totales',
  forma_pago: 'Forma de pago',
  separador: 'Separador',
  texto_libre: 'Texto libre',
  pie_pagina: 'Pie de página',
  espacio_en_blanco: 'Espacio en blanco',
}

const CON_TEXTO = ['texto_libre', 'pie_pagina']
const CON_NEGRITA = ['encabezado', 'total', 'totales', 'texto_libre', 'pie_pagina']

interface ListaBloquesProps {
  bloques: BloqueConfig[]
  onChange: (bloques: BloqueConfig[]) => void
  tiposDisponibles: string[]
}

export const ListaBloques = ({ bloques, onChange, tiposDisponibles }: ListaBloquesProps) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const update = (id: string, patch: Partial<BloqueConfig>) =>
    onChange(bloques.map(b => b.id === id ? { ...b, ...patch } : b))

  const remove = (id: string) => onChange(bloques.filter(b => b.id !== id))

  const onDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) return
    const next = [...bloques]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(idx, 0, moved)
    onChange(next)
    setDragIdx(null)
  }

  const agregar = (tipo: string) => {
    const nuevo: BloqueConfig = { id: `${tipo}_${Date.now()}`, tipo, activo: true }
    if (CON_TEXTO.includes(tipo)) nuevo.texto = ''
    onChange([...bloques, nuevo])
    setAddOpen(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        {bloques.map((b, idx) => (
          <div key={b.id} draggable
            onDragStart={() => setDragIdx(idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(idx)}
            className={cn('flex items-center gap-2 rounded-input border px-2.5 py-2 transition-all bg-[#141414] light:bg-white',
              dragIdx === idx ? 'border-white/40 opacity-60' : 'border-[#2A2A2A] light:border-[#E4E4E4]',
              !b.activo && 'opacity-50')}>
            <GripVertical size={14} className="text-[#606060] cursor-grab shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white light:text-black truncate">{TIPO_LABEL[b.tipo] ?? b.tipo}</div>
              {CON_TEXTO.includes(b.tipo) && (
                <input value={b.texto ?? ''} onChange={e => update(b.id, { texto: e.target.value })} placeholder="Texto…"
                  className="mt-1 w-full px-2 py-1 text-[11px] rounded border bg-transparent outline-none border-[#2A2A2A] text-[#A0A0A0] focus:border-white light:border-[#E4E4E4] light:text-[#404040]" />
              )}
            </div>
            {CON_NEGRITA.includes(b.tipo) && (
              <button onClick={() => update(b.id, { negrita: !b.negrita })} title="Negrita"
                className={cn('p-1 rounded transition-all', b.negrita ? 'text-white bg-white/15 light:text-black light:bg-black/10' : 'text-[#606060] hover:text-white light:hover:text-black')}>
                <Bold size={13} />
              </button>
            )}
            <button onClick={() => update(b.id, { activo: !b.activo })} title={b.activo ? 'Ocultar' : 'Mostrar'}
              className="p-1 rounded text-[#606060] hover:text-white light:hover:text-black">{b.activo ? <Eye size={13} /> : <EyeOff size={13} />}</button>
            <button onClick={() => remove(b.id)} className="p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10"><Trash2 size={13} /></button>
          </div>
        ))}
      </div>

      <div className="relative">
        <button onClick={() => setAddOpen(v => !v)}
          className="flex items-center gap-1.5 text-[12px] text-[#606060] hover:text-white light:hover:text-black transition-colors">
          <Plus size={13} /> Agregar bloque
        </button>
        {addOpen && (
          <div className="absolute z-20 mt-1 w-56 rounded-card border border-[#2A2A2A] bg-[#141414] light:border-[#E4E4E4] light:bg-white shadow-lg max-h-60 overflow-y-auto animate-fade-slide-down">
            {tiposDisponibles.map(t => (
              <button key={t} onClick={() => agregar(t)}
                className="w-full text-left px-3 py-2 text-[12px] text-[#A0A0A0] hover:text-white hover:bg-white/[0.06] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.04]">
                {TIPO_LABEL[t] ?? t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
