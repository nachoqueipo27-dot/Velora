import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { cn } from '../../../lib/utils'
import {
  useRecepcionStore, estadoFila, costoReferencia, numeroOrden, numeroRecepcion,
  type FilaRecepcion, type ResultadoRecepcion,
} from '../../../store/recepcionStore'
import { useInventarioStore } from '../../../store/inventarioStore'
import { useEscaneoStore } from '../../../store/escaneoStore'
import { useEscaneoEnModulo } from '../../../lib/escaneo'
import { buscarPorCodigo } from '../../../lib/codigos'
import { crearBorrador } from '../../../lib/altaDesdeEscaneo'
import { aCentavos, aPesos, formatearPesos, porCantidad } from '../../../lib/dinero'
import { toast } from '../../../store/toastStore'
import { UNIDAD_ABREVIADA, permiteDecimales, type Producto } from '../../../types/inventario'
import { AltaRapida } from '../../../components/escaneo/AltaRapida'
import { BarraCodigoDesconocido, type OpcionDesconocido } from '../../punto-venta/escaneo/BarraCodigoDesconocido'
import { DialogoCantidadIngreso } from '../../inventario/ingreso/DialogoCantidadIngreso'
import { DialogoProblema } from './Dialogos'

const cant = (n: number, f: { unidadMedida: FilaRecepcion['unidadMedida'] }) =>
  `${n.toLocaleString('es-AR', { maximumFractionDigits: 3 })}${permiteDecimales(f.unidadMedida) ? ` ${UNIDAD_ABREVIADA[f.unidadMedida]}` : ''}`

interface Pedido { producto: Producto; codigo: string | null; unidadesPack: number | null }

/** Recepción de mercadería por escaneo (Recepcion.dc.html). Ocupa todo el módulo Proveedores. */
export const SesionRecepcion = ({ onSalir, onConfirmada }: { onSalir: () => void; onConfirmada: (r: ResultadoRecepcion) => void }) => {
  const {
    recepcion, filas, guardadoEn, confirmando, sumar, fijarCantidad, fijarCosto, marcarProblema, quitar,
    guardarNotas, descartar, confirmar, cerrarVista,
  } = useRecepcionStore()
  const productos = useInventarioStore(s => s.productos)
  const cargarProductos = useInventarioStore(s => s.cargarProductos)
  const accionEnter = useEscaneoStore(s => s.config.accionDesconocido)

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [desconocido, setDesconocido] = useState<string | null>(null)
  const [alta, setAlta] = useState<{ codigo: string | null } | null>(null)
  const [problema, setProblema] = useState<FilaRecepcion | null>(null)
  const [resaltado, setResaltado] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [notas, setNotas] = useState('')
  const [preguntarDescartar, setPreguntarDescartar] = useState(false)

  useEffect(() => { void cargarProductos() }, [cargarProductos])
  useEffect(() => { setNotas(recepcion?.notas ?? '') }, [recepcion?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (resaltado === null) return
    const t = setTimeout(() => setResaltado(null), 1000)
    return () => clearTimeout(t)
  }, [resaltado])

  const conOrden = recepcion?.ordenId != null

  const pedirCantidad = (producto: Producto, codigo: string | null, unidadesPack: number | null) => {
    if (producto.tipo === 'conjunto') { toast.info('Los conjuntos no llevan stock propio: escaneá sus componentes'); return }
    setDesconocido(null)
    setPedido({ producto, codigo, unidadesPack })
  }

  // Con la sesión abierta, los escaneos de Proveedores vienen acá.
  useEscaneoEnModulo('proveedores', ({ codigo, resultado }) => {
    setDesconocido(null)
    if (resultado) { pedirCantidad(resultado.producto, codigo, resultado.codigo.tipo === 'pack' ? resultado.unidades : null); return }
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setDesconocido(codigo)
  })

  const elegirDesconocido = async (opcion: OpcionDesconocido) => {
    const codigo = desconocido
    if (!codigo) return
    setDesconocido(null)
    if (opcion === 'alta') { setAlta({ codigo }); return }
    if (opcion === 'borrador') {
      try {
        const p = await crearBorrador(codigo)
        toast.success('Borrador creado: queda en Productos por completar.')
        pedirCantidad(p, codigo, null)
      } catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo crear el borrador') }
    }
  }

  const confirmarCantidad = async (n: number) => {
    if (!pedido) return
    const { producto } = pedido
    setPedido(null)
    try { await sumar(producto, n); setResaltado(producto.id) }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo sumar') }
  }

  // ─── Buscador sin lector ──────────────────────────────────────────────
  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (q.length < 2) return []
    return productos.filter(p => p.tipo === 'simple' && p.activo && (p.nombre.toLowerCase().includes(q) || p.codigoSku.toLowerCase().includes(q))).slice(0, 6)
  }, [productos, busqueda])

  const buscar = async (e: FormEvent) => {
    e.preventDefault()
    const texto = busqueda.trim()
    if (!texto) return
    const porCodigo = await buscarPorCodigo(texto)
    if (porCodigo) { setBusqueda(''); pedirCantidad(porCodigo.producto, texto, porCodigo.codigo.tipo === 'pack' ? porCodigo.unidades : null) }
    else if (coincidencias.length === 1) { setBusqueda(''); pedirCantidad(coincidencias[0], null, null) }
  }

  // ─── Resumen ──────────────────────────────────────────────────────────
  const resumen = useMemo(() => {
    const c = { completo: 0, falta: 0, demas: 0, no_pedido: 0 }
    let subas = 0
    let total = 0
    for (const f of filas) {
      const e = estadoFila(f, conOrden)
      if (e.tipo in c) c[e.tipo as keyof typeof c]++
      if (f.recibidoAhora > 0 && f.costoCobrado > costoReferencia(f)) subas++
      total += porCantidad(f.costoCobrado, f.recibidoAhora)
    }
    return { ...c, subas, total, cargados: filas.filter(f => f.recibidoAhora > 0).length }
  }, [filas, conOrden])

  const onConfirmar = async () => {
    try {
      await guardarNotas(notas)
      onConfirmada(await confirmar())
    } catch (e) {
      console.error('confirmar recepción', e)
      toast.error(e instanceof Error ? e.message : 'No se pudo confirmar la recepción')
    }
  }

  const onDescartar = async () => {
    setPreguntarDescartar(false)
    try { await descartar(); toast.info('Recepción descartada: el stock no cambió'); onSalir() }
    catch (e) { toast.error(e instanceof Error ? e.message : 'No se pudo descartar') }
  }

  if (!recepcion) return null
  const titulo = conOrden
    ? `${numeroOrden(recepcion.ordenNumero ?? 0)}${recepcion.ordenFecha ? ` · Pedida el ${format(new Date(recepcion.ordenFecha), 'dd/MM')}` : ''}`
    : 'Recepción directa · sin orden'

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-fondo p-6 text-cuerpo text-texto">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1 pt-2">
        <div>
          <div className="font-mono text-etiqueta uppercase text-texto-3">{titulo} · {numeroRecepcion(recepcion.numero)}</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">Recepción · {recepcion.proveedorNombre}</h1>
          <p className="mt-1 text-seccion text-texto-2">
            {conOrden
              ? 'Escaneá lo que llegó. Velora lo compara con lo pedido y con el precio pactado.'
              : 'Escaneá lo que llegó y cargá cantidad y costo de cada producto.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { cerrarVista(); onSalir() }}
            className="h-10 rounded-pastilla border border-borde-fuerte bg-superficie px-4 hover:bg-superficie-suave">Guardar y seguir después</button>
          <button type="button" onClick={() => void onConfirmar()} disabled={confirmando || resumen.cargados === 0}
            className="h-10 rounded-pastilla bg-acento px-4 font-medium text-superficie hover:bg-acento-hover disabled:opacity-50">
            {confirmando ? 'Confirmando…' : conOrden && resumen.falta > 0 ? 'Confirmar recepción parcial' : 'Confirmar recepción'}
          </button>
        </div>
      </header>

      {desconocido && (
        <BarraCodigoDesconocido codigo={desconocido} puedeDarAlta accionEnter={accionEnter} soloAlta
          onElegir={op => void elegirDesconocido(op)} onCerrar={() => setDesconocido(null)} />
      )}

      <form onSubmit={buscar} className="relative">
        <label className="flex h-[52px] items-center gap-2.5 rounded-tarjeta border border-borde bg-superficie px-3.5">
          <span className="sr-only">Escanear o buscar producto</span>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Esperando escaneo… o buscá por nombre o código"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-texto outline-none placeholder:text-texto-3" />
          <span className="font-mono text-etiqueta uppercase text-ok">● Lector listo</span>
        </label>
        {busqueda.trim().length >= 2 && coincidencias.length === 0 && (
          <div className="absolute left-0 right-0 top-[56px] z-10 flex items-center justify-between gap-3 rounded-tarjeta border border-borde bg-superficie px-4 py-2.5 shadow-lg">
            <span className="text-texto-2">Ningún producto se llama así.</span>
            <button type="button" onClick={() => { setBusqueda(''); setAlta({ codigo: null }) }}
              className="h-8 rounded-pastilla border border-borde-fuerte px-3 text-[12px] font-medium hover:bg-superficie-suave">Dar de alta sin código</button>
          </div>
        )}
        {coincidencias.length > 0 && (
          <div className="absolute left-0 right-0 top-[56px] z-10 overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-lg">
            {coincidencias.map(p => (
              <button key={p.id} type="button" onClick={() => { setBusqueda(''); pedirCantidad(p, null, null) }}
                className="block w-full border-b border-borde px-4 py-2.5 text-left font-medium last:border-0 hover:bg-superficie-suave">{p.nombre}</button>
            ))}
          </div>
        )}
      </form>

      <div className="flex min-h-0 flex-1 flex-wrap gap-4">
        <section className="flex min-h-0 min-w-0 flex-[999_1_560px] flex-col overflow-hidden rounded-panel border border-borde bg-superficie">
          <div className="min-h-0 flex-1 overflow-auto">
            {filas.length === 0 ? (
              <div className="flex h-full items-center justify-center p-10 text-center text-texto-2">Escaneá el primer producto que llegó.</div>
            ) : (
              <table className="w-full min-w-[720px] border-collapse text-seccion tabular-nums">
                <thead>
                  <tr className="border-b border-borde text-left font-mono text-[11px] uppercase tracking-[0.06em] text-texto-3">
                    <th className="px-[18px] py-3 font-normal">Producto</th>
                    {conOrden && <th className="px-2 py-3 text-right font-normal">Pedido</th>}
                    {conOrden && <th className="px-2 py-3 text-right font-normal">Ya recibido</th>}
                    <th className="px-2 py-3 text-center font-normal">Recibido ahora</th>
                    {conOrden && <th className="px-2 py-3 font-normal">Estado</th>}
                    <th className="px-2 py-3 text-right font-normal">Costo unitario</th>
                    <th className="w-24" />
                  </tr>
                </thead>
                <tbody>
                  {filas.map(f => (
                    <FilaTabla key={f.productoId} f={f} conOrden={conOrden} resaltada={resaltado === f.productoId}
                      onCantidad={n => void fijarCantidad(f.productoId, n).catch(e => toast.error(e instanceof Error ? e.message : 'No se pudo guardar'))}
                      onCosto={c => void fijarCosto(f.productoId, c)}
                      onProblema={() => setProblema(f)}
                      onQuitar={() => void quitar(f.productoId)} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 bg-fondo px-[18px] py-3">
            <span className="text-[13px] text-texto-2">
              {guardadoEn ? `Sesión guardada automáticamente · ${format(new Date(guardadoEn), 'HH:mm')}` : 'Se guarda solo en cada cambio'}
            </span>
            <span className="text-[15px] font-semibold">{resumen.cargados} producto{resumen.cargados === 1 ? '' : 's'} · {formatearPesos(resumen.total)}</span>
          </div>
        </section>

        <aside className="flex flex-[1_1_260px] flex-col gap-3">
          <div className="flex flex-col gap-3 rounded-panel border border-borde bg-superficie p-4">
            <div className="font-mono text-etiqueta uppercase text-texto-3">Resumen</div>
            {conOrden && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  [resumen.completo, 'Completos', 'text-ok'], [resumen.falta, 'Con faltante', 'text-alerta'],
                  [resumen.demas, 'De más', 'text-info'], [resumen.no_pedido, 'No pedido', 'text-texto-2'],
                ].map(([n, t, c]) => (
                  <div key={t as string}><div className={cn('text-[22px] font-semibold', c as string)}>{n}</div><div className="text-[12px] text-texto-2">{t}</div></div>
                ))}
              </div>
            )}
            <div className="text-[13px] text-texto-2">
              Total que cobra el proveedor: <span className="font-semibold text-texto">{formatearPesos(resumen.total)}</span>
            </div>
            {resumen.subas > 0 && (
              <div className="rounded-control bg-alerta-suave px-3 py-2 text-[13px] text-alerta">
                {resumen.subas} producto{resumen.subas === 1 ? '' : 's'} llegaron más caros que {conOrden ? 'lo pactado' : 'el costo anterior'}.
                Al confirmar podés actualizar el precio de venta manteniendo tu margen.
              </div>
            )}
          </div>
          <input value={notas} onChange={e => setNotas(e.target.value)} onBlur={() => void guardarNotas(notas)}
            placeholder="Notas (opcional): ej. remito 0001-0000123"
            className="h-10 rounded-control border border-borde bg-superficie px-3 text-cuerpo text-texto outline-none placeholder:text-texto-3 focus:border-texto" />
          <button type="button" onClick={() => setPreguntarDescartar(true)}
            className="h-10 rounded-pastilla border border-borde-fuerte bg-superficie hover:bg-superficie-suave">Descartar recepción</button>
        </aside>
      </div>

      {pedido && (
        <DialogoCantidadIngreso producto={pedido.producto} codigo={pedido.codigo} unidadesPack={pedido.unidadesPack}
          yaSumado={filas.find(f => f.productoId === pedido.producto.id)?.recibidoAhora ?? 0}
          onCerrar={() => setPedido(null)} onConfirmar={n => void confirmarCantidad(n)} />
      )}
      {alta && (
        <AltaRapida codigo={alta.codigo} contexto="ingreso" onCerrar={() => setAlta(null)}
          onCreado={(p, borrador) => {
            setAlta(null)
            toast.success(borrador ? 'Borrador creado: queda en Productos por completar.' : `«${p.nombre}» dado de alta`)
            pedirCantidad(p, alta.codigo, null)
          }} />
      )}
      {problema && (
        <DialogoProblema fila={problema} onCerrar={() => setProblema(null)}
          onGuardar={datos => { const pid = problema.productoId; setProblema(null); void marcarProblema(pid, datos).catch(e => toast.error(e instanceof Error ? e.message : 'No se pudo guardar')) }} />
      )}
      {preguntarDescartar && (
        <div className="fixed inset-0 z-[950] flex items-center justify-center bg-texto/30 p-6" onMouseDown={e => { if (e.target === e.currentTarget) setPreguntarDescartar(false) }}>
          <div role="alertdialog" aria-modal="true" className="flex w-[400px] max-w-full flex-col gap-4 rounded-panel border border-borde bg-superficie p-6">
            <div>
              <h2 className="text-titulo font-semibold">¿Descartar la {numeroRecepcion(recepcion.numero)}?</h2>
              <p className="mt-1 text-[13px] text-texto-2">Se pierde lo cargado. El stock, los costos y la orden no cambian.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPreguntarDescartar(false)} autoFocus className="h-10 rounded-pastilla border border-borde-fuerte px-4 hover:bg-superficie-suave">Seguir cargando</button>
              <button type="button" onClick={() => void onDescartar()} className="h-10 rounded-pastilla bg-error px-4 font-medium text-superficie hover:opacity-90">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const BADGE: Record<string, string> = {
  completo: 'bg-ok-suave text-ok', falta: 'bg-alerta-suave text-alerta', demas: 'bg-info/10 text-info', no_pedido: 'bg-superficie-suave text-texto-2',
}

/** Fila: recibido ahora (− / campo / +), estado, costo cobrado con la diferencia y el menú de problemas. */
const FilaTabla = ({ f, conOrden, resaltada, onCantidad, onCosto, onProblema, onQuitar }: {
  f: FilaRecepcion; conOrden: boolean; resaltada: boolean
  onCantidad: (n: number) => void; onCosto: (c: number) => void; onProblema: () => void; onQuitar: () => void
}) => {
  const [texto, setTexto] = useState(String(f.recibidoAhora))
  const [costo, setCosto] = useState(String(aPesos(f.costoCobrado)))
  useEffect(() => { setTexto(String(f.recibidoAhora)) }, [f.recibidoAhora])
  useEffect(() => { setCosto(String(aPesos(f.costoCobrado))) }, [f.costoCobrado])
  const decimales = permiteDecimales(f.unidadMedida)
  const estado = estadoFila(f, conOrden)
  const ref = costoReferencia(f)
  const dif = f.costoCobrado - ref
  const pct = ref > 0 ? (dif / ref) * 100 : 0

  const aplicarCantidad = () => {
    const n = Number(texto.replace(',', '.'))
    if (!(n >= 0) || (!decimales && !Number.isInteger(n))) { setTexto(String(f.recibidoAhora)); return }
    if (n !== f.recibidoAhora) onCantidad(n)
  }
  const aplicarCosto = () => {
    const c = aCentavos(costo)
    if (c !== f.costoCobrado) onCosto(c)
  }

  return (
    <tr className={cn('border-b border-borde align-top transition-colors duration-300', resaltada ? 'bg-acento-suave' : 'bg-superficie')}>
      <td className="px-[18px] py-3">
        <div className="font-medium">{f.nombre}</div>
        {f.codigo && <div className="mt-0.5 font-mono text-[11px] text-texto-3">{f.codigo}</div>}
        {(f.danado > 0 || f.vencido > 0) && (
          <div className="mt-1 inline-flex rounded-pastilla bg-error/10 px-2 py-0.5 text-[11px] font-medium text-error">
            {[f.danado > 0 && `${cant(f.danado, f)} dañado${f.danado === 1 ? '' : 's'}`, f.vencido > 0 && `${cant(f.vencido, f)} vencido${f.vencido === 1 ? '' : 's'}`].filter(Boolean).join(' · ')} · para devolver
          </div>
        )}
      </td>
      {conOrden && <td className="px-2 py-3 text-right text-texto-2">{f.enOrden ? cant(f.pedido, f) : '—'}</td>}
      {conOrden && <td className="px-2 py-3 text-right text-texto-2">{f.enOrden ? cant(f.yaRecibido, f) : '—'}</td>}
      <td className="px-2 py-3">
        <div className="flex items-center justify-center">
          <div className="flex h-8 items-center rounded-pastilla border border-borde">
            <button type="button" aria-label="Restar" disabled={f.recibidoAhora <= 0} onClick={() => onCantidad(Math.max(0, f.recibidoAhora - 1))}
              className="h-8 w-8 text-[16px] text-texto-2 hover:text-texto disabled:opacity-30">−</button>
            <input value={texto} onChange={e => setTexto(e.target.value)} onBlur={aplicarCantidad}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
              inputMode={decimales ? 'decimal' : 'numeric'} aria-label={`Recibido ahora de ${f.nombre}`}
              className="w-12 bg-transparent text-center text-[13px] font-medium outline-none" />
            <button type="button" aria-label="Sumar" onClick={() => onCantidad(f.recibidoAhora + 1)} className="h-8 w-8 text-[16px] text-texto-2 hover:text-texto">+</button>
          </div>
        </div>
      </td>
      {conOrden && (
        <td className="px-2 py-3">
          <span className={cn('inline-flex rounded-pastilla px-2.5 py-1 text-[12px] font-medium', BADGE[estado.tipo])}>
            {estado.tipo === 'completo' ? '✓ Completo' : estado.tipo === 'falta' ? `− Falta ${cant(estado.n, f)}`
              : estado.tipo === 'demas' ? `+ De más ${cant(estado.n, f)}` : '? No pedido'}
          </span>
        </td>
      )}
      <td className="px-2 py-3 text-right">
        <div className="flex flex-col items-end gap-0.5">
          <input value={costo} onChange={e => setCosto(e.target.value)} onBlur={aplicarCosto}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
            inputMode="decimal" aria-label={`Costo cobrado de ${f.nombre}`}
            className="w-28 rounded-control border border-borde bg-superficie px-2 py-1 text-right font-mono text-[13px] outline-none focus:border-texto" />
          {dif !== 0 && ref > 0 && (
            <span className={cn('text-[11px]', dif > 0 ? 'text-alerta' : 'text-ok')}>
              <span className="text-texto-3 line-through">{formatearPesos(ref)}</span>{' '}
              {dif > 0 ? '↑' : '↓'} {formatearPesos(Math.abs(dif))} ({pct > 0 ? '+' : ''}{pct.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%)
              {' '}{f.costoPactado !== null ? 'sobre lo pactado' : 'sobre el costo anterior'}
            </span>
          )}
          {f.monedaCosto === 'USD' && <span className="text-[11px] text-texto-3">Costo en USD: no se actualiza</span>}
        </div>
      </td>
      <td className="pr-3 py-3 text-right">
        <div className="flex justify-end gap-1">
          <button type="button" onClick={onProblema} disabled={f.recibidoAhora <= 0} title="Marcar dañados o vencidos"
            className="h-7 rounded-pastilla border border-borde-fuerte px-2 text-[11px] text-texto-2 hover:text-texto disabled:opacity-30">Dañado / vencido</button>
          {!f.enOrden && (
            <button type="button" onClick={onQuitar} aria-label={`Quitar ${f.nombre}`} className="px-1 text-[16px] text-texto-3 hover:text-error">×</button>
          )}
        </div>
      </td>
    </tr>
  )
}
