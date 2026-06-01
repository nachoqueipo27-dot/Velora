import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useOTStore } from '../../store/otStore'
import { useClientesStore } from '../../store/clientesStore'
import { useInventarioStore } from '../../store/inventarioStore'
import { usePresupuestosStore } from '../../store/presupuestosStore'
import { FRECUENCIAS } from '../../types/ordenesTrabajo'
import { SelectorEmpleado } from './components/SelectorEmpleado'
import { Search, AlertTriangle } from 'lucide-react'
import { getDb } from '../../db'
import { format } from 'date-fns'

interface CrearOTProps { onCreada: () => void }

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

export const CrearOT = ({ onCreada }: CrearOTProps) => {
  const { plantillas, etiquetas, cargarPlantillas, cargarEtiquetas, crearOT, crearOTDesdePresupuesto } = useOTStore()
  const { clientes, cargarClientes } = useClientesStore()
  const { productos, cargarProductos } = useInventarioStore()
  const { presupuestos, cargarPresupuestos } = usePresupuestosStore()

  const [clienteId, setClienteId] = useState<number | ''>('')
  const [plantillaId, setPlantillaId] = useState<number | ''>('')
  const [tipoItem, setTipoItem] = useState<'simple' | 'conjunto'>('simple')
  const [busqueda, setBusqueda] = useState('')
  const [producto, setProducto] = useState<{ id: number; nombre: string; precio: number } | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [empleadoId, setEmpleadoId] = useState<number | null>(null)
  const [descuento, setDescuento] = useState('0')
  const [tipoDescuento, setTipoDescuento] = useState<'porcentaje' | 'monto'>('porcentaje')
  const [garantiaDias, setGarantiaDias] = useState('0')
  const [esRecurrente, setEsRecurrente] = useState(false)
  const [frecuencia, setFrecuencia] = useState('semanal')
  const [proximaFecha, setProximaFecha] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10))
  const [etiquetaIds, setEtiquetaIds] = useState<number[]>([])
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)
  const [modalPres, setModalPres] = useState(false)
  const [garantiaAviso, setGarantiaAviso] = useState<string | null>(null)

  useEffect(() => { cargarClientes(); cargarProductos(); cargarPlantillas(); cargarEtiquetas() }, [cargarClientes, cargarProductos, cargarPlantillas, cargarEtiquetas])

  // Aviso de garantía activa cliente+producto
  useEffect(() => {
    if (!clienteId || !producto) { setGarantiaAviso(null); return }
    ;(async () => {
      try {
        const db = await getDb()
        const rows = await db.select<any[]>(
          `SELECT fecha_vence FROM garantias WHERE cliente_id = ? AND producto_id = ? AND activa = 1 ORDER BY fecha_vence DESC LIMIT 1`,
          [clienteId, producto.id]
        )
        if (rows.length && new Date(rows[0].fecha_vence) > new Date()) {
          setGarantiaAviso(format(new Date(rows[0].fecha_vence), 'dd/MM/yyyy'))
        } else setGarantiaAviso(null)
      } catch { setGarantiaAviso(null) }
    })()
  }, [clienteId, producto])

  const disponibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return productos.filter(p => p.tipo === tipoItem && q !== '' && p.nombre.toLowerCase().includes(q)).slice(0, 6)
  }, [productos, tipoItem, busqueda])

  const precioBase = producto?.precio ?? 0
  const total = useMemo(() => {
    const d = Number(descuento) || 0
    const t = tipoDescuento === 'porcentaje' ? precioBase * (1 - d / 100) : precioBase - d
    return Math.max(0, t)
  }, [precioBase, descuento, tipoDescuento])

  const aplicarPlantilla = (id: number | '') => {
    setPlantillaId(id)
    if (id === '') return
    const pl = plantillas.find(p => p.id === id)
    if (pl?.productoId) {
      const prod = productos.find(p => p.id === pl.productoId)
      if (prod) { setTipoItem(prod.tipo); setProducto({ id: prod.id, nombre: prod.nombre, precio: prod.precio }); setDescripcion(pl.descripcion ?? '') }
    }
  }

  const invalido = clienteId === '' || !producto

  const handleCrear = async () => {
    if (invalido || !producto) { setTouched(true); return }
    setGuardando(true)
    try {
      await crearOT({
        clienteId: Number(clienteId), empleadoId, productoId: producto.id, tipoItem,
        productoNombre: producto.nombre, descripcion, precio: precioBase,
        descuento: Number(descuento) || 0, tipoDescuento, garantiaDias: Number(garantiaDias) || 0,
        esRecurrente, frecuencia: esRecurrente ? frecuencia : null,
        proximaFecha: esRecurrente ? new Date(proximaFecha).toISOString() : null, etiquetaIds,
      })
      onCreada()
    } finally {
      setGuardando(false)
    }
  }

  const aprobados = presupuestos.filter(p => p.estado === 'aprobado')

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white light:text-black">Crear orden de trabajo</h2>
        <Button size="sm" variant="secondary" onClick={() => { cargarPresupuestos(); setModalPres(true) }}>Crear desde presupuesto</Button>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-3xl">
        <Select label="Cliente *" value={clienteId} onChange={e => setClienteId(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="" className="bg-[#141414] light:bg-white">Seleccionar cliente...</option>
          {clientes.map(c => <option key={c.id} value={c.id} className="bg-[#141414] light:bg-white">{c.nombre}</option>)}
        </Select>
        <Select label="Plantilla (opcional)" value={plantillaId} onChange={e => aplicarPlantilla(e.target.value === '' ? '' : Number(e.target.value))}>
          <option value="" className="bg-[#141414] light:bg-white">Sin plantilla</option>
          {plantillas.map(p => <option key={p.id} value={p.id} className="bg-[#141414] light:bg-white">{p.nombre}</option>)}
        </Select>
      </div>

      {touched && clienteId === '' && <span className="text-xs text-[#C0392B] mt-1">Seleccioná un cliente</span>}

      {/* Producto */}
      <div className="flex flex-col gap-2 mt-4 max-w-3xl">
        <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Producto *</span>
        <div className="flex gap-2">
          <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
            {(['simple', 'conjunto'] as const).map(t => (
              <button key={t} type="button" onClick={() => { setTipoItem(t); setProducto(null); setBusqueda('') }}
                className={cn('px-3 py-1.5 text-[12px] rounded-[6px] transition-all capitalize',
                  tipoItem === t ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0] hover:text-white light:text-[#404040]')}>
                {t === 'simple' ? 'Simple' : 'Conjunto'}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#606060]" />
            <input value={producto ? producto.nombre : busqueda} onChange={e => { setProducto(null); setBusqueda(e.target.value) }}
              placeholder={`Buscar ${tipoItem === 'simple' ? 'producto' : 'conjunto'}...`}
              className={cn('w-full pl-8 pr-3 py-2 text-sm rounded-input border bg-transparent outline-none',
                'placeholder:text-[#606060] border-[#2A2A2A] text-white focus:border-white',
                'light:border-[#E4E4E4] light:text-[#0A0A0A] light:focus:border-[#0A0A0A]')} />
            {!producto && busqueda && disponibles.length > 0 && (
              <div className={cn('absolute z-10 mt-1 w-full rounded-card border shadow-lg overflow-hidden', 'border-[#2A2A2A] bg-[#1C1C1C] light:border-[#E4E4E4] light:bg-white')}>
                {disponibles.map(p => (
                  <button key={p.id} type="button" onClick={() => { setProducto({ id: p.id, nombre: p.nombre, precio: p.precio }); setBusqueda('') }}
                    className="w-full text-left px-3 py-2 text-[13px] text-[#A0A0A0] hover:text-white hover:bg-white/[0.06] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.04]">
                    {p.nombre} <span className="text-[11px] text-[#606060]">· {money(p.precio)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {touched && !producto && <span className="text-xs text-[#C0392B]">Seleccioná un producto</span>}
      </div>

      {garantiaAviso && (
        <div className="flex items-center gap-2 mt-3 max-w-3xl rounded-input bg-[#D4921A]/10 px-3 py-2 text-[13px] text-[#D4921A]">
          <AlertTriangle size={15} /> Este cliente tiene garantía activa hasta {garantiaAviso}
        </div>
      )}

      <div className="mt-4 max-w-3xl">
        <Textarea label="Descripción" rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 max-w-3xl">
        <SelectorEmpleado value={empleadoId} onChange={setEmpleadoId} />
        <div className="flex flex-col gap-3">
          <div className="flex items-end gap-2">
            <Input label="Descuento" type="number" value={descuento} onChange={e => setDescuento(e.target.value)} className="flex-1" />
            <div className="flex gap-1 p-0.5 rounded-input border border-[#2A2A2A] light:border-[#E4E4E4]">
              {(['porcentaje', 'monto'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTipoDescuento(t)}
                  className={cn('px-2.5 py-1.5 text-[12px] rounded-[6px] transition-all',
                    tipoDescuento === t ? 'bg-white text-black light:bg-black light:text-white' : 'text-[#A0A0A0]')}>
                  {t === 'porcentaje' ? '%' : '$'}
                </button>
              ))}
            </div>
          </div>
          <Input label="Días de garantía" type="number" value={garantiaDias} onChange={e => setGarantiaDias(e.target.value)} />
        </div>
      </div>

      {/* Etiquetas */}
      {etiquetas.length > 0 && (
        <div className="flex flex-col gap-2 mt-4 max-w-3xl">
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Etiquetas</span>
          <div className="flex flex-wrap gap-2">
            {etiquetas.map(e => {
              const sel = etiquetaIds.includes(e.id)
              return (
                <button key={e.id} type="button"
                  onClick={() => setEtiquetaIds(prev => sel ? prev.filter(x => x !== e.id) : [...prev, e.id])}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border"
                  style={{ borderColor: e.color, backgroundColor: sel ? `${e.color}26` : 'transparent', color: e.color, opacity: sel ? 1 : 0.6 }}>
                  {e.nombre}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Recurrencia */}
      <div className="flex flex-col gap-2 mt-4 max-w-3xl">
        <button type="button" onClick={() => setEsRecurrente(v => !v)} className="flex items-center gap-2">
          <span className={cn('w-9 h-5 rounded-full transition-colors relative', esRecurrente ? 'bg-[#4CAF7D]' : 'bg-[#2A2A2A] light:bg-[#E4E4E4]')}>
            <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', esRecurrente ? 'left-[18px]' : 'left-0.5')} />
          </span>
          <span className="text-[13px] text-[#A0A0A0] light:text-[#404040]">¿Es recurrente?</span>
        </button>
        {esRecurrente && (
          <div className="grid grid-cols-2 gap-3">
            <Select label="Frecuencia" value={frecuencia} onChange={e => setFrecuencia(e.target.value)}>
              {FRECUENCIAS.map(f => <option key={f.value} value={f.value} className="bg-[#141414] light:bg-white">{f.label}</option>)}
            </Select>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Próxima generación</label>
              <input type="date" value={proximaFecha} onChange={e => setProximaFecha(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
            </div>
          </div>
        )}
      </div>

      {/* Total + acción */}
      <div className="flex items-center justify-between mt-6 max-w-3xl pt-4 border-t border-[#2A2A2A] light:border-[#E4E4E4]">
        <span className="text-lg font-semibold text-white light:text-black">Total: {money(total)}</span>
        <Button onClick={handleCrear} disabled={guardando}>{guardando ? 'Creando...' : 'Crear OT'}</Button>
      </div>

      {/* Modal desde presupuesto */}
      <Modal open={modalPres} onClose={() => setModalPres(false)} title="Crear OT desde presupuesto"
        footer={<Button variant="ghost" onClick={() => setModalPres(false)}>Cerrar</Button>}>
        {aprobados.length === 0 ? (
          <p className="text-sm text-[#606060] py-4 text-center pb-2">No hay presupuestos aprobados disponibles.</p>
        ) : (
          <div className="flex flex-col gap-2 pb-1">
            {aprobados.map(p => (
              <button key={p.id} type="button"
                onClick={async () => { await crearOTDesdePresupuesto(p.id); setModalPres(false); onCreada() }}
                className="flex items-center justify-between rounded-card border border-[#2A2A2A] light:border-[#E4E4E4] px-3 py-2.5 text-left hover:bg-white/[0.04] light:hover:bg-black/[0.03] transition-colors">
                <div>
                  <div className="text-sm text-white light:text-black font-medium">#{String(p.numero).padStart(3, '0')} · {p.clienteNombre}</div>
                  <div className="text-[11px] text-[#606060]">{p.descripcion || 'Sin descripción'}</div>
                </div>
                <span className="text-sm text-white light:text-black">{money(p.totalFinal)}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
