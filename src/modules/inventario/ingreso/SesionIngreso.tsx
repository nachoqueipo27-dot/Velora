import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { format } from 'date-fns'
import { cn } from '../../../lib/utils'
import { useIngresoStore, numeroIngreso, resumenCantidades, type ItemIngreso } from '../../../store/ingresoStore'
import { useInventarioStore } from '../../../store/inventarioStore'
import { useEscaneoStore } from '../../../store/escaneoStore'
import { useEscaneoEnModulo } from '../../../lib/escaneo'
import { buscarPorCodigo } from '../../../lib/codigos'
import { crearBorrador } from '../../../lib/altaDesdeEscaneo'
import { toast } from '../../../store/toastStore'
import { UNIDAD_ABREVIADA, permiteDecimales, type Producto } from '../../../types/inventario'
import { AltaRapida } from '../../../components/escaneo/AltaRapida'
import { BarraCodigoDesconocido, type OpcionDesconocido } from '../../punto-venta/escaneo/BarraCodigoDesconocido'
import { DialogoCantidadIngreso } from './DialogoCantidadIngreso'

const cant = (n: number, it: { unidadMedida: ItemIngreso['unidadMedida'] }) =>
  `${n.toLocaleString('es-AR', { maximumFractionDigits: 3 })}${permiteDecimales(it.unidadMedida) ? ` ${UNIDAD_ABREVIADA[it.unidadMedida]}` : ''}`

interface Pedido { producto: Producto; codigo: string | null; unidadesPack: number | null }

/** "Agregar stock": sesión de ingreso por escaneo (Stock.dc.html). Ocupa todo el módulo Inventario. */
export const SesionIngreso = ({ onSalir }: { onSalir: () => void }) => {
  const { ingreso, items, guardadoEn, confirmando, abrir, sumar, fijarCantidad, quitar, guardarNotas, descartar, confirmar, cerrarVista } = useIngresoStore()
  const productos = useInventarioStore(s => s.productos)
  const accionEnter = useEscaneoStore(s => s.config.accionDesconocido)

  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [desconocido, setDesconocido] = useState<string | null>(null)
  // Alta rápida: con el código escaneado, o sin código (desde el buscador; ofrece generar uno interno).
  const [alta, setAlta] = useState<{ codigo: string | null } | null>(null)
  const [resaltado, setResaltado] = useState<number | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [notas, setNotas] = useState('')
  const [preguntarDescartar, setPreguntarDescartar] = useState(false)
  const [confirmado, setConfirmado] = useState<{ numero: number; items: ItemIngreso[] } | null>(null)

  useEffect(() => { setNotas(ingreso?.notas ?? '') }, [ingreso?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (resaltado === null) return
    const t = setTimeout(() => setResaltado(null), 1000)
    return () => clearTimeout(t)
  }, [resaltado])

  const pedirCantidad = (producto: Producto, codigo: string | null, unidadesPack: number | null) => {
    if (producto.tipo === 'conjunto') { toast.info('Los conjuntos no llevan stock propio: escaneá sus componentes'); return }
    setDesconocido(null)
    setPedido({ producto, codigo, unidadesPack })
  }

  // Con la sesión abierta, los escaneos vienen acá (no abren la ficha).
  useEscaneoEnModulo('inventario', ({ codigo, resultado }) => {
    if (confirmado) { toast.info('Tocá "Nuevo ingreso" para seguir escaneando'); return }
    setDesconocido(null)
    if (resultado) {
      pedirCantidad(resultado.producto, codigo, resultado.codigo.tipo === 'pack' ? resultado.unidades : null)
      return
    }
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
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'No se pudo crear el borrador')
      }
    }
  }

  const confirmarCantidad = async (n: number) => {
    if (!pedido) return
    const { producto } = pedido
    setPedido(null)
    try {
      await sumar(producto, n)
      setResaltado(producto.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo sumar al ingreso')
    }
  }

  // ─── Buscador (sin lector) ────────────────────────────────────────────
  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (q.length < 2) return []
    return productos
      .filter(p => p.tipo === 'simple' && p.activo && (p.nombre.toLowerCase().includes(q) || p.codigoSku.toLowerCase().includes(q)))
      .slice(0, 6)
  }, [productos, busqueda])

  const buscar = async (e: FormEvent) => {
    e.preventDefault()
    const texto = busqueda.trim()
    if (!texto) return
    const porCodigo = await buscarPorCodigo(texto)
    if (porCodigo) {
      setBusqueda('')
      pedirCantidad(porCodigo.producto, texto, porCodigo.codigo.tipo === 'pack' ? porCodigo.unidades : null)
    } else if (coincidencias.length === 1) {
      setBusqueda('')
      pedirCantidad(coincidencias[0], null, null)
    } else if (coincidencias.length === 0) {
      toast.info('No encontré ningún producto con ese nombre o código')
    }
  }

  // ─── Totales, confirmar y descartar ───────────────────────────────────
  const total = resumenCantidades(items)

  const onConfirmar = async () => {
    try {
      await guardarNotas(notas)
      setConfirmado(await confirmar())
    } catch (e) {
      console.error('confirmar ingreso', e)
      toast.error(e instanceof Error ? e.message : 'No se pudo confirmar el ingreso')
    }
  }

  const onDescartar = async () => {
    setPreguntarDescartar(false)
    try {
      await descartar()
      toast.info('Ingreso descartado: el stock no cambió')
      onSalir()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo descartar')
    }
  }

  const salir = () => { cerrarVista(); onSalir() }

  // ─── Resumen después de confirmar ─────────────────────────────────────
  if (confirmado) {
    return (
      <div className="h-full overflow-y-auto bg-fondo p-6 text-cuerpo text-texto">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div>
            <div className="font-mono text-etiqueta uppercase text-ok">Stock actualizado</div>
            <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">{numeroIngreso(confirmado.numero)} confirmado</h1>
            <p className="mt-1 text-seccion text-texto-2">
              {confirmado.items.length} producto{confirmado.items.length === 1 ? '' : 's'} · +{resumenCantidades(confirmado.items)}
            </p>
          </div>
          <section className="overflow-hidden rounded-panel border border-borde bg-superficie">
            {confirmado.items.map(it => (
              <div key={it.productoId} className="flex items-center justify-between gap-3 border-b border-borde px-[18px] py-3 last:border-0">
                <span className="font-medium">{it.nombre}</span>
                <span className="tabular-nums text-texto-2">
                  <span className="font-medium text-ok">+{cant(it.cantidad, it)}</span> → queda en <span className="font-semibold text-texto">{cant(it.stockActual + it.cantidad, it)}</span>
                </span>
              </div>
            ))}
          </section>
          <div className="flex gap-2">
            <button type="button" onClick={async () => { setConfirmado(null); await abrir() }}
              className="h-10 rounded-pastilla bg-texto px-4 text-cuerpo font-medium text-superficie hover:opacity-90">Nuevo ingreso</button>
            <button type="button" onClick={salir}
              className="h-10 rounded-pastilla border border-borde-fuerte bg-superficie px-4 text-cuerpo hover:bg-superficie-suave">Volver a Inventario</button>
          </div>
        </div>
      </div>
    )
  }

  if (!ingreso) return null

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden bg-fondo p-6 text-cuerpo text-texto">
      <header className="flex flex-wrap items-end justify-between gap-4 px-1 pt-2">
        <div>
          <div className="font-mono text-etiqueta uppercase text-texto-3">Inventario · {numeroIngreso(ingreso.numero)}</div>
          <h1 className="mt-1 text-[26px] font-semibold tracking-[-0.02em]">Agregar stock</h1>
          <p className="mt-1 text-seccion text-texto-2">Escaneá cada producto. El stock cambia recién al confirmar el ingreso.</p>
        </div>
        <button type="button" onClick={salir}
          className="h-10 rounded-pastilla border border-borde-fuerte bg-superficie px-4 text-cuerpo hover:bg-superficie-suave">
          Guardar y seguir después
        </button>
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
              className="h-8 rounded-pastilla border border-borde-fuerte px-3 text-[12px] font-medium hover:bg-superficie-suave">
              Dar de alta sin código
            </button>
          </div>
        )}
        {coincidencias.length > 0 && (
          <div className="absolute left-0 right-0 top-[56px] z-10 overflow-hidden rounded-tarjeta border border-borde bg-superficie shadow-lg">
            {coincidencias.map(p => (
              <button key={p.id} type="button" onClick={() => { setBusqueda(''); pedirCantidad(p, null, null) }}
                className="flex w-full items-center justify-between gap-3 border-b border-borde px-4 py-2.5 text-left last:border-0 hover:bg-superficie-suave">
                <span className="font-medium">{p.nombre}</span>
                <span className="font-mono text-[12px] text-texto-3">stock {cant(p.stock, p)}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-panel border border-borde bg-superficie">
        <div className="min-h-0 flex-1 overflow-auto">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 py-16 text-center">
              <span className="text-seccion font-medium">Todavía no hay productos en este ingreso</span>
              <span className="text-[13px] text-texto-2">Escaneá el primero o buscalo por nombre.</span>
            </div>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-seccion tabular-nums">
              <thead>
                <tr className="border-b border-borde text-left font-mono text-[11px] uppercase tracking-[0.06em] text-texto-3">
                  <th className="px-[18px] py-3.5 font-normal">Producto</th>
                  <th className="px-2 py-3.5 text-right font-normal">Stock actual</th>
                  <th className="px-2 py-3.5 text-center font-normal">Ingresa</th>
                  <th className="px-[18px] py-3.5 text-right font-normal">Queda en</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <FilaIngreso key={it.productoId} item={it} resaltada={resaltado === it.productoId}
                    onCantidad={n => void fijarCantidad(it.productoId, n).catch(e => toast.error(e instanceof Error ? e.message : 'No se pudo guardar'))}
                    onQuitar={() => void quitar(it.productoId)} />
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 bg-fondo px-[18px] py-3.5">
          <span className="text-[13px] text-texto-2">
            {guardadoEn ? `Sesión guardada automáticamente · ${format(new Date(guardadoEn), 'HH:mm')}` : 'Se guarda solo en cada cambio'}
          </span>
          <span className="text-[15px] font-semibold">
            {items.length} producto{items.length === 1 ? '' : 's'} · +{total}
          </span>
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-3">
        <input value={notas} onChange={e => setNotas(e.target.value)} onBlur={() => void guardarNotas(notas)}
          placeholder="Notas (opcional): ej. remito 0001-0000123"
          className="h-10 min-w-0 flex-[1_1_280px] rounded-control border border-borde bg-superficie px-3 text-cuerpo text-texto outline-none placeholder:text-texto-3 focus:border-texto" />
        <button type="button" onClick={() => setPreguntarDescartar(true)}
          className="h-10 rounded-pastilla border border-borde-fuerte bg-superficie px-4 text-cuerpo hover:bg-superficie-suave">Descartar</button>
        <button type="button" onClick={() => void onConfirmar()} disabled={confirmando || items.length === 0}
          className="h-10 rounded-pastilla bg-acento px-5 text-cuerpo font-medium text-superficie hover:bg-acento-hover disabled:opacity-50">
          {confirmando ? 'Confirmando…' : 'Confirmar ingreso'}
        </button>
      </footer>

      {pedido && (
        <DialogoCantidadIngreso producto={pedido.producto} codigo={pedido.codigo} unidadesPack={pedido.unidadesPack}
          yaSumado={items.find(i => i.productoId === pedido.producto.id)?.cantidad ?? 0}
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
      {preguntarDescartar && (
        <div className="fixed inset-0 z-[950] flex items-center justify-center bg-texto/30 p-6" onMouseDown={e => { if (e.target === e.currentTarget) setPreguntarDescartar(false) }}>
          <div role="alertdialog" aria-modal="true" className="flex w-[400px] max-w-full flex-col gap-4 rounded-panel border border-borde bg-superficie p-6">
            <div>
              <h2 className="text-titulo font-semibold">¿Descartar el {numeroIngreso(ingreso.numero)}?</h2>
              <p className="mt-1 text-[13px] text-texto-2">Se pierde la lista de {items.length} producto{items.length === 1 ? '' : 's'}. El stock no cambia.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPreguntarDescartar(false)} autoFocus
                className="h-10 rounded-pastilla border border-borde-fuerte px-4 text-cuerpo hover:bg-superficie-suave">Seguir cargando</button>
              <button type="button" onClick={() => void onDescartar()}
                className="h-10 rounded-pastilla bg-error px-4 text-cuerpo font-medium text-superficie hover:opacity-90">Descartar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Fila del ingreso: − / cantidad editable / +, y "queda en". */
const FilaIngreso = ({ item, resaltada, onCantidad, onQuitar }: {
  item: ItemIngreso; resaltada: boolean; onCantidad: (n: number) => void; onQuitar: () => void
}) => {
  const [texto, setTexto] = useState(String(item.cantidad))
  useEffect(() => { setTexto(String(item.cantidad)) }, [item.cantidad])
  const decimales = permiteDecimales(item.unidadMedida)

  const aplicar = () => {
    const n = Number(texto.replace(',', '.'))
    if (!(n > 0) || (!decimales && !Number.isInteger(n))) { setTexto(String(item.cantidad)); return }
    if (n !== item.cantidad) onCantidad(n)
  }

  return (
    <tr className={cn('border-b border-borde transition-colors duration-300', resaltada ? 'bg-acento-suave' : 'bg-superficie')}>
      <td className="px-[18px] py-3">
        <div className="font-medium">{item.nombre}</div>
        {item.codigo && <div className="mt-0.5 font-mono text-[11px] text-texto-3">{item.codigo}</div>}
      </td>
      <td className="px-2 py-3 text-right text-texto-2">{cant(item.stockActual, item)}</td>
      <td className="px-2 py-3">
        <div className="flex items-center justify-center">
          <div className="flex h-8 items-center rounded-pastilla border border-borde">
            <button type="button" aria-label="Restar" disabled={item.cantidad <= 1}
              onClick={() => onCantidad(Math.max(1, item.cantidad - 1))}
              className="h-8 w-8 text-[16px] text-texto-2 hover:text-texto disabled:opacity-30">−</button>
            <span className="text-[13px] font-medium text-ok">+</span>
            <input value={texto} onChange={e => setTexto(e.target.value)} onBlur={aplicar}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() } }}
              inputMode={decimales ? 'decimal' : 'numeric'} aria-label={`Cantidad que ingresa de ${item.nombre}`}
              className="w-12 bg-transparent text-center text-[13px] font-medium text-ok outline-none" />
            <button type="button" aria-label="Sumar" onClick={() => onCantidad(item.cantidad + 1)}
              className="h-8 w-8 text-[16px] text-texto-2 hover:text-texto">+</button>
          </div>
        </div>
      </td>
      <td className="px-[18px] py-3 text-right font-semibold">{cant(item.stockActual + item.cantidad, item)}</td>
      <td className="pr-3 text-right">
        <button type="button" onClick={onQuitar} aria-label={`Quitar ${item.nombre}`}
          className="rounded-control px-1.5 text-[16px] text-texto-3 hover:text-error">×</button>
      </td>
    </tr>
  )
}
