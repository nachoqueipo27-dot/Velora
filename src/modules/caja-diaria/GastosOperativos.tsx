import { useState } from 'react'
import { useCajaStore } from '../../store/cajaStore'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { ModalGasto } from './components/ModalGasto'
import { CATEGORIAS_GASTO, type GastoOperativo } from '../../types/caja'
import { Plus, Pencil, Trash2, Paperclip } from 'lucide-react'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

export const GastosOperativos = () => {
  const { gastosHoy, diaYaCerrado, eliminarGasto } = useCajaStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<GastoOperativo | null>(null)
  const [aEliminar, setAEliminar] = useState<GastoOperativo | null>(null)
  const [filtro, setFiltro] = useState<string>('')

  const visibles = filtro ? gastosHoy.filter(g => g.categoria === filtro) : gastosHoy
  const total = visibles.reduce((s, g) => s + g.monto, 0)

  const abrirNuevo = () => { setEditando(null); setModalOpen(true) }
  const abrirEditar = (g: GastoOperativo) => { setEditando(g); setModalOpen(true) }

  return (
    <div className="h-full flex flex-col gap-5 overflow-y-auto pr-1">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white light:text-black">Gastos operativos</h2>
          <p className="text-[12px] text-[#606060]">Egresos del día</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-[#606060]">Total gastos</div>
            <div className="text-xl font-bold text-[#C0392B] tabular-nums">{money(total)}</div>
          </div>
          {!diaYaCerrado && <Button size="sm" onClick={abrirNuevo}><Plus size={14} className="mr-1" />Nuevo gasto</Button>}
        </div>
      </header>

      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#606060]">Categoría:</span>
        <select value={filtro} onChange={e => setFiltro(e.target.value)}
          className="px-2.5 py-1 text-[12px] rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-black">
          <option value="">Todas</option>
          {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[#606060] border-b border-[#2A2A2A] light:border-[#E4E4E4]">
              <th className="font-medium px-4 py-2.5">Hora</th>
              <th className="font-medium px-4 py-2.5">Categoría</th>
              <th className="font-medium px-4 py-2.5">Descripción</th>
              <th className="font-medium px-4 py-2.5">Comprobante</th>
              <th className="font-medium px-4 py-2.5 text-right">Monto</th>
              <th className="font-medium px-4 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#606060]">Sin gastos registrados</td></tr>
            )}
            {visibles.map(g => (
              <tr key={g.id} className="border-b border-[#1C1C1C] light:border-[#F0F0F0] last:border-0 hover:bg-white/[0.02] light:hover:bg-black/[0.02]">
                <td className="px-4 py-2.5 text-[#A0A0A0] light:text-[#404040] tabular-nums">{hora(g.fecha)}</td>
                <td className="px-4 py-2.5 text-white light:text-black">{g.categoria}</td>
                <td className="px-4 py-2.5 text-[#A0A0A0] light:text-[#404040]">{g.descripcion || '—'}</td>
                <td className="px-4 py-2.5 text-[#606060]">
                  {g.comprobante ? <span className="inline-flex items-center gap-1"><Paperclip size={12} />{g.comprobante}</span> : '—'}
                </td>
                <td className="px-4 py-2.5 text-right font-semibold text-[#C0392B] tabular-nums">{money(g.monto)}</td>
                <td className="px-4 py-2.5">
                  {!diaYaCerrado && (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEditar(g)} className="p-1 rounded text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5 transition-all"><Pencil size={13} /></button>
                      <button onClick={() => setAEliminar(g)} className="p-1 rounded text-[#606060] hover:text-[#C0392B] hover:bg-[#C0392B]/10 transition-all"><Trash2 size={13} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModalGasto open={modalOpen} onClose={() => setModalOpen(false)} gasto={editando} />

      <Modal open={aEliminar !== null} onClose={() => setAEliminar(null)} title="Eliminar gasto" maxWidth="max-w-sm"
        footer={<>
          <Button variant="ghost" onClick={() => setAEliminar(null)}>Cancelar</Button>
          <Button variant="danger" onClick={async () => { if (aEliminar) await eliminarGasto(aEliminar.id); setAEliminar(null) }}>Eliminar</Button>
        </>}>
        <p className="text-[13px] text-[#A0A0A0] light:text-[#404040] pb-2">
          ¿Eliminar el gasto de {aEliminar?.categoria} por {money(aEliminar?.monto ?? 0)}?
        </p>
      </Modal>
    </div>
  )
}
