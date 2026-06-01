import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useListaPreciosStore } from '../../store/listaPreciosStore'
import type { SnapshotLista } from '../../types/listaPrecios'
import { Plus, Eye, RotateCcw, FileSpreadsheet, History, ChevronDown } from 'lucide-react'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
type Tab = 'snapshots' | 'cambios'

export const HistorialListas = () => {
  const { snapshots, historial, cargarSnapshots, cargarHistorial, guardarSnapshot, restaurarSnapshot } = useListaPreciosStore()
  const [tab, setTab] = useState<Tab>('snapshots')
  const [expandido, setExpandido] = useState<number | null>(null)
  const [modalGuardar, setModalGuardar] = useState(false)
  const [restaurar, setRestaurar] = useState<SnapshotLista | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [filtroProd, setFiltroProd] = useState('Todos')

  useEffect(() => { cargarSnapshots(); cargarHistorial() }, [cargarSnapshots, cargarHistorial])

  const productosHist = useMemo(() => Array.from(new Set(historial.map(h => h.productoNombre))), [historial])
  const historialFiltrado = useMemo(() =>
    historial.filter(h => filtroProd === 'Todos' || h.productoNombre === filtroProd),
    [historial, filtroProd])

  const handleGuardar = async () => {
    if (nombre.trim() === '') return
    await guardarSnapshot(nombre.trim(), descripcion.trim())
    setModalGuardar(false); setNombre(''); setDescripcion('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
          {([['snapshots', 'Snapshots guardados'], ['cambios', 'Historial de cambios']] as [Tab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn('px-3 py-1.5 text-[13px] rounded-[6px] transition-all duration-150',
                tab === id ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040] light:hover:text-black')}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'snapshots'
          ? <Button size="sm" onClick={() => setModalGuardar(true)}><Plus size={14} className="mr-1.5" /> Guardar snapshot actual</Button>
          : <Button size="sm" variant="secondary" onClick={() => console.log('Exportar historial:', historialFiltrado)}><FileSpreadsheet size={14} className="mr-1.5" /> Excel</Button>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'snapshots' ? (
          snapshots.length === 0 ? <Empty texto="No hay snapshots guardados" /> : (
            <div className="flex flex-col gap-2">
              {snapshots.map(s => (
                <div key={s.id} className={cn('rounded-card border', 'border-[#2A2A2A] bg-[#141414]', 'light:border-[#E4E4E4] light:bg-white')}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white light:text-black">{s.nombre}</div>
                      <div className="text-[11px] text-[#606060]">{s.descripcion || 'Sin descripción'}</div>
                    </div>
                    <div className="text-[11px] text-[#606060] text-right">
                      <div>{format(new Date(s.vigenciaDesde), 'dd/MM/yyyy HH:mm')}</div>
                      <div>{s.snapshot.length} productos · {s.creadoPor}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button title="Ver" onClick={() => setExpandido(expandido === s.id ? null : s.id)}
                        className="p-1.5 rounded-input text-[#606060] hover:text-white hover:bg-white/10 light:hover:text-black light:hover:bg-black/5">
                        {expandido === s.id ? <ChevronDown size={14} /> : <Eye size={14} />}
                      </button>
                      <button title="Restaurar" onClick={() => setRestaurar(s)}
                        className="p-1.5 rounded-input text-[#606060] hover:text-[#4A7FA5] hover:bg-[#4A7FA5]/10">
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>
                  {expandido === s.id && (
                    <div className="px-4 pb-3 max-h-[260px] overflow-y-auto border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                      <table className="w-full text-sm border-collapse mt-2">
                        <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                          <th className="text-left font-medium px-2 py-1.5">Producto</th>
                          <th className="text-right font-medium px-2 py-1.5">Precio</th>
                        </tr></thead>
                        <tbody>
                          {s.snapshot.map(it => (
                            <tr key={it.productoId} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                              <td className="px-2 py-1.5 text-[#A0A0A0] light:text-[#404040]">{it.nombre}</td>
                              <td className="px-2 py-1.5 text-right text-white light:text-black">{money(it.precio)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="w-56 mb-3">
              <Select value={filtroProd} onChange={e => setFiltroProd(e.target.value)}>
                <option value="Todos" className="bg-[#141414] light:bg-white">Todos los productos</option>
                {productosHist.map(p => <option key={p} value={p} className="bg-[#141414] light:bg-white">{p}</option>)}
              </Select>
            </div>
            {historialFiltrado.length === 0 ? <Empty texto="Sin cambios registrados" /> : (
              <table className="w-full text-sm border-collapse">
                <thead><tr className="text-[11px] uppercase tracking-wider text-[#606060]">
                  <th className="text-left font-medium px-3 py-2">Producto</th>
                  <th className="text-right font-medium px-3 py-2">Anterior</th>
                  <th className="text-right font-medium px-3 py-2">Nuevo</th>
                  <th className="text-right font-medium px-3 py-2">Var. %</th>
                  <th className="text-left font-medium px-3 py-2">Motivo</th>
                  <th className="text-left font-medium px-3 py-2">Por</th>
                  <th className="text-left font-medium px-3 py-2">Fecha</th>
                </tr></thead>
                <tbody>
                  {historialFiltrado.map(h => {
                    const variacion = h.precioAnterior > 0 ? ((h.precioNuevo - h.precioAnterior) / h.precioAnterior) * 100 : 0
                    return (
                      <tr key={h.id} className="border-t border-[#2A2A2A] light:border-[#E4E4E4]">
                        <td className="px-3 py-2.5 text-white light:text-black font-medium">{h.productoNombre}</td>
                        <td className="px-3 py-2.5 text-right text-[#A0A0A0] light:text-[#404040]">{money(h.precioAnterior)}</td>
                        <td className="px-3 py-2.5 text-right text-white light:text-black">{money(h.precioNuevo)}</td>
                        <td className={cn('px-3 py-2.5 text-right', variacion >= 0 ? 'text-[#4CAF7D]' : 'text-[#C0392B]')}>{variacion >= 0 ? '+' : ''}{variacion.toFixed(1)}%</td>
                        <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040] max-w-[160px] truncate">{h.motivo || '—'}</td>
                        <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{h.aplicadoPor}</td>
                        <td className="px-3 py-2.5 text-[#A0A0A0] light:text-[#404040]">{format(new Date(h.fecha), 'dd/MM/yyyy HH:mm')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Modal guardar snapshot */}
      <Modal open={modalGuardar} onClose={() => setModalGuardar(false)} title="Guardar snapshot"
        footer={<>
          <Button variant="ghost" onClick={() => setModalGuardar(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={nombre.trim() === ''}>Guardar</Button>
        </>}>
        <div className="flex flex-col gap-3 pb-1">
          <Input label="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
          <Textarea label="Descripción" rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
        </div>
      </Modal>

      {/* Modal restaurar */}
      <Modal open={restaurar !== null} onClose={() => setRestaurar(null)} title="Restaurar snapshot"
        footer={<>
          <Button variant="ghost" onClick={() => setRestaurar(null)}>Cancelar</Button>
          <Button onClick={() => { if (restaurar) restaurarSnapshot(restaurar.id); setRestaurar(null) }}>Restaurar</Button>
        </>}>
        <p className="text-sm text-white light:text-black pb-1">¿Restaurar precios al snapshot "{restaurar?.nombre}"?</p>
        <p className="text-[11px] text-[#606060] pb-2">Esto actualizará los precios actuales al estado guardado y quedará registrado en el historial.</p>
      </Modal>
    </div>
  )
}

const Empty = ({ texto }: { texto: string }) => (
  <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><History size={20} className="text-[#606060]" /></div>
    <p className="text-sm text-[#A0A0A0] light:text-[#404040]">{texto}</p>
  </div>
)
