import { useEffect, useState } from 'react'
import { cn } from '../../lib/utils'
import { useProveedoresStore } from '../../store/proveedoresStore'
import { useRecepcionStore, numeroOrden, numeroRecepcion, type ResultadoRecepcion, type ResumenAbierta } from '../../store/recepcionStore'
import { usePermiso } from '../../lib/permisos'
import { toast } from '../../store/toastStore'
import type { OrdenCompra } from '../../types/proveedores'
import { ListadoProveedores } from './ListadoProveedores'
import { OrdenesCompra } from './OrdenesCompra'
import { RecepcionMercaderia } from './RecepcionMercaderia'
import { SesionRecepcion } from './recepcion/SesionRecepcion'
import { CierreRecepcion } from './recepcion/CierreRecepcion'
import { HistorialRecepciones } from './recepcion/HistorialRecepciones'
import { Truck, FileText, PackageCheck, ScanBarcode, ClipboardList } from 'lucide-react'

type Seccion = 'registro' | 'ordenes' | 'recepcion' | 'directa' | 'recepciones'

const SUBMENU: { id: Seccion; label: string; icon: React.ReactNode }[] = [
  { id: 'registro',    label: 'Registro de proveedores', icon: <Truck size={15} /> },
  { id: 'ordenes',     label: 'Órdenes de compra',       icon: <FileText size={15} /> },
  { id: 'recepcion',   label: 'Recepción de mercadería', icon: <PackageCheck size={15} /> },
  { id: 'directa',     label: 'Recepción directa',       icon: <ScanBarcode size={15} /> },
  { id: 'recepciones', label: 'Recepciones',             icon: <ClipboardList size={15} /> },
]

const Proveedores = () => {
  const { seleccionarOrden, ordenSeleccionada, cargarOrdenes } = useProveedoresStore()
  const { abrir, retomar, buscarAbierta, descartar } = useRecepcionStore()
  const puedeRecibir = usePermiso('proveedores') === 'editar'
  const [seccion, setSeccion] = useState<Seccion>('registro')

  // ─── Recepción por escaneo ────────────────────────────────────────────
  const [enSesion, setEnSesion] = useState(false)
  const [resultado, setResultado] = useState<ResultadoRecepcion | null>(null)
  const [pendiente, setPendiente] = useState<ResumenAbierta | null>(null)
  const revisarPendiente = () => {
    if (!puedeRecibir) { setPendiente(null); return }
    buscarAbierta().then(setPendiente).catch(e => console.error('recepción abierta', e))
  }
  useEffect(revisarPendiente, [puedeRecibir]) // eslint-disable-line react-hooks/exhaustive-deps

  const empezar = async (destino: { ordenId: number } | { proveedorId: number }) => {
    try { await abrir(destino); setPendiente(null); setEnSesion(true) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo abrir la recepción'); revisarPendiente() }
  }
  const retomarPendiente = async () => {
    try { await retomar(); setPendiente(null); setEnSesion(true) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo retomar') }
  }
  const descartarPendiente = async () => {
    if (!pendiente) return
    try { await descartar(pendiente.id); setPendiente(null); toast.info('Recepción descartada: el stock no cambió') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo descartar') }
  }
  const salirDeSesion = () => {
    setEnSesion(false); setResultado(null); revisarPendiente(); void cargarOrdenes()
  }

  const verDetalle = (o: OrdenCompra) => {
    seleccionarOrden(o)
    setSeccion('recepcion')
  }

  const irA = (id: Seccion) => {
    if (id !== 'recepcion') seleccionarOrden(null)
    setSeccion(id)
  }

  // La sesión y su cierre ocupan todo el módulo (Recepcion.dc.html).
  if (resultado) return <CierreRecepcion resultado={resultado} onSalir={salirDeSesion} />
  if (enSesion) return <SesionRecepcion onSalir={salirDeSesion} onConfirmada={r => { setEnSesion(false); setResultado(r) }} />

  const renderContenido = () => {
    switch (seccion) {
      case 'registro': return <ListadoProveedores />
      case 'ordenes':  return <OrdenesCompra onVerDetalle={verDetalle} onRecibir={o => void empezar({ ordenId: o.id })} />
      case 'recepcion':
        return ordenSeleccionada
          ? <RecepcionMercaderia onVolver={() => { seleccionarOrden(null); setSeccion('ordenes') }}
              onRecibir={() => void empezar({ ordenId: ordenSeleccionada.id })} />
          : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white/[0.04] light:bg-black/[0.03]"><PackageCheck size={20} className="text-[#606060]" /></div>
              <p className="text-sm text-[#A0A0A0] light:text-[#404040]">Seleccioná una orden para ver su detalle</p>
              <p className="text-[11px] text-[#606060]">Desde "Órdenes de compra", abrí el detalle de una orden o tocá Recibir.</p>
            </div>
          )
      case 'directa':     return <RecepcionDirecta puedeRecibir={puedeRecibir} onEmpezar={proveedorId => void empezar({ proveedorId })} />
      case 'recepciones': return <HistorialRecepciones />
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className={cn('w-48 shrink-0 border-r flex flex-col py-4', 'border-[#2A2A2A] light:border-[#E4E4E4]')}>
        <span className="px-4 mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#606060]">Proveedores</span>
        <nav className="flex flex-col">
          {SUBMENU.filter(item => puedeRecibir || item.id !== 'directa').map(item => {
            const activo = seccion === item.id
            return (
              <button key={item.id} onClick={() => irA(item.id)}
                className={cn('flex items-center gap-2.5 px-4 py-2 text-[13px] text-left transition-all duration-150',
                  activo
                    ? 'border-l-2 border-white text-white pl-[14px] bg-white/[0.04] light:border-black light:text-black light:bg-black/[0.03]'
                    : 'border-l-2 border-transparent text-[#A0A0A0] hover:text-white hover:bg-white/[0.03] light:text-[#404040] light:hover:text-black light:hover:bg-black/[0.02]')}>
                {item.icon}<span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>
      <section className="flex-1 overflow-hidden p-6 flex flex-col">
        {pendiente && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-tarjeta border border-acento/30 bg-superficie px-4 py-3 text-cuerpo text-texto">
            <span className="flex-[1_1_260px] text-seccion">
              <strong className="font-semibold">Tenés una recepción sin confirmar</strong>{' '}
              ({numeroRecepcion(pendiente.numero)} · {pendiente.ordenNumero ? `${numeroOrden(pendiente.ordenNumero)} · ` : ''}{pendiente.proveedorNombre} · {pendiente.productos} producto{pendiente.productos === 1 ? '' : 's'}). El stock todavía no cambió.
            </span>
            <button type="button" onClick={() => void retomarPendiente()} className="h-[34px] rounded-pastilla bg-texto px-3.5 font-medium text-superficie hover:opacity-90">Retomar</button>
            <button type="button" onClick={() => void descartarPendiente()} className="h-[34px] rounded-pastilla border border-borde-fuerte bg-superficie px-3.5 hover:bg-superficie-suave">Descartar</button>
          </div>
        )}
        <div className="flex-1 min-h-0">{renderContenido()}</div>
      </section>
    </div>
  )
}

/** Proveedores → Recepción directa: sin orden de compra; se elige el proveedor y se escanea. */
const RecepcionDirecta = ({ puedeRecibir, onEmpezar }: { puedeRecibir: boolean; onEmpezar: (proveedorId: number) => void }) => {
  const { proveedores, cargarProveedores } = useProveedoresStore()
  const [proveedorId, setProveedorId] = useState<number | ''>('')
  useEffect(() => { void cargarProveedores() }, [cargarProveedores])
  const activos = proveedores.filter(p => p.activo)
  return (
    <div className="flex max-w-xl flex-col gap-4 text-cuerpo text-texto">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Recepción directa</h2>
        <p className="text-[12px] text-[#606060]">Para mercadería que llega sin orden de compra: elegís el proveedor, escaneás y cargás cantidad y costo de cada producto.</p>
      </header>
      <section className="flex flex-col gap-3 rounded-panel border border-borde bg-superficie p-5">
        <label className="flex flex-col gap-1.5 text-[13px] text-texto-2">Proveedor
          <select value={proveedorId} onChange={e => setProveedorId(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-[42px] rounded-control border border-borde-fuerte bg-superficie px-2.5 text-seccion text-texto outline-none focus:border-texto">
            <option value="">Elegí un proveedor…</option>
            {activos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <p className="text-[13px] text-texto-2">El costo de cada producto viene con el costo actual: si te cobraron otro, lo corregís en la fila y al confirmar se actualiza.</p>
        <button type="button" disabled={!puedeRecibir || proveedorId === ''} onClick={() => proveedorId !== '' && onEmpezar(proveedorId)}
          className="self-start h-10 rounded-pastilla bg-texto px-4 font-medium text-superficie hover:opacity-90 disabled:opacity-40">Empezar recepción</button>
        {activos.length === 0 && <p className="text-[12px] text-alerta">No hay proveedores activos: cargá uno en "Registro de proveedores".</p>}
      </section>
    </div>
  )
}

export default Proveedores
