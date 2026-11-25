import { useEffect, useState, type FormEvent } from 'react'
import { useInventarioStore } from '../../store/inventarioStore'
import { productoDesdeCodigo, crearDesdeCodigo } from '../../lib/altaDesdeEscaneo'
import { useCapturaEscaneo } from '../../lib/escaneo'
import { aCentavos } from '../../lib/dinero'
import { generarCodigoInterno } from '../../lib/codigosInternos'
import { toast } from '../../store/toastStore'
import { UNIDADES_MEDIDA, permiteDecimales, type Producto, type UnidadMedida } from '../../types/inventario'
import { cn } from '../../lib/utils'

interface AltaRapidaProps {
  /** Código escaneado; null si se da de alta sin escanear (ofrece generar uno interno). */
  codigo: string | null
  /** 'pos': se suma a la venta. 'inventario': solo se crea. 'ingreso' (Agregar stock): después
   *  se pide la cantidad que ingresa, así que no hay "Stock inicial". */
  contexto: 'pos' | 'inventario' | 'ingreso'
  onCerrar: () => void
  /** `borrador`: se guardó con "Guardar como borrador" (no va al carrito). */
  onCreado: (producto: Producto, borrador: boolean) => void
}

const campo = 'h-[42px] rounded-control border border-borde-fuerte bg-superficie px-3 text-seccion text-texto outline-none focus:border-texto focus:border-2'
const etiqueta = 'flex flex-col gap-1.5 text-[13px] text-texto-2'

/** Número con coma o punto decimal (cantidades de stock, no plata). */
const numeroDecimal = (v: string) => Number(v.replace(',', '.')) || 0

/** Panel lateral de alta rápida a partir de un código escaneado (diseño AltaRapida.dc.html). */
export const AltaRapida = ({ codigo, contexto, onCerrar, onCreado }: AltaRapidaProps) => {
  const { categorias, cargarCategorias } = useInventarioStore()
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [costo, setCosto] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [unidad, setUnidad] = useState<UnidadMedida>('unidad')
  const [stock, setStock] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errores, setErrores] = useState<{ nombre?: string; precio?: string }>({})
  const [generarCodigo, setGenerarCodigo] = useState(true)

  useEffect(() => { void cargarCategorias() }, [cargarCategorias])
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onCerrar])
  // Mientras el panel está abierto no se procesan otros códigos.
  useCapturaEscaneo(true, () => toast.info('Terminá el alta antes de escanear otro código'))

  const precioC = aCentavos(precio)
  const costoC = aCentavos(costo)
  const margen = precioC > 0 && costoC > 0 ? ((precioC - costoC) / precioC) * 100 : null
  const stockNum = permiteDecimales(unidad) ? numeroDecimal(stock) : Math.round(numeroDecimal(stock))

  const guardar = async (comoBorrador: boolean) => {
    if (guardando) return
    if (!comoBorrador) {
      const e: typeof errores = {}
      if (!nombre.trim()) e.nombre = 'Poné un nombre'
      if (precioC <= 0) e.precio = 'Poné un precio de venta'
      setErrores(e)
      if (e.nombre || e.precio) return
    }
    setGuardando(true)
    try {
      // Sin escanear: código interno 29… si la casilla está marcada.
      const codigoFinal = codigo ?? (generarCodigo ? await generarCodigoInterno() : null)
      const datos = productoDesdeCodigo(codigoFinal, {
        ...(nombre.trim() ? { nombre: nombre.trim() } : {}),
        precio: precioC,
        precioCosto: costoC,
        categoriaId: categoriaId === '' ? null : categoriaId,
        unidadMedida: unidad,
        stock: contexto === 'ingreso' ? 0 : Math.max(0, stockNum),
        borrador: comoBorrador,
      })
      const producto = await crearDesdeCodigo(datos)
      onCreado(producto, comoBorrador)
    } catch (e) {
      console.error('alta rápida', e)
      toast.error(e instanceof Error ? e.message : 'No se pudo dar de alta el producto')
    } finally {
      setGuardando(false)
    }
  }

  const onSubmit = (e: FormEvent) => { e.preventDefault(); void guardar(false) }

  return (
    <div className="fixed inset-0 z-[950] flex justify-end bg-texto/30" onMouseDown={e => { if (e.target === e.currentTarget) onCerrar() }}>
      <form role="dialog" aria-modal="true" aria-labelledby="alta-rapida-titulo" onSubmit={onSubmit}
        className="flex h-full w-[460px] max-w-full flex-col gap-[18px] overflow-y-auto border-l border-borde bg-superficie p-6 text-cuerpo text-texto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mono text-etiqueta uppercase text-texto-3">Alta rápida</div>
            <h2 id="alta-rapida-titulo" className="mt-1.5 text-[20px] font-semibold tracking-[-0.01em]">Nuevo producto</h2>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar"
            className="h-9 w-9 rounded-pastilla border border-borde-fuerte bg-superficie text-[16px] text-texto-2 hover:text-texto">×</button>
        </div>

        {codigo ? (
          <label className={etiqueta}>Código de barras
            <input value={codigo} readOnly className={cn(campo, 'bg-fondo font-mono')} />
          </label>
        ) : (
          <label className="flex cursor-pointer items-start gap-3 rounded-control border border-borde bg-fondo p-3">
            <input type="checkbox" checked={generarCodigo} onChange={e => setGenerarCodigo(e.target.checked)} className="mt-1 accent-acento" />
            <span>
              <span className="block text-seccion font-medium text-texto">Generar código interno</span>
              <span className="mt-0.5 block text-[12px] text-texto-2">
                Para productos sin código (sueltos, embolsados, hechos en el local). Velora le asigna un código 29… que podés imprimir en una etiqueta.
              </span>
            </span>
          </label>
        )}

        <label className={etiqueta}>Nombre
          <input value={nombre} onChange={e => { setNombre(e.target.value); setErrores(x => ({ ...x, nombre: undefined })) }}
            autoFocus placeholder="Ej.: Dulce de leche clásico 400 g" className={campo} />
          {errores.nombre && <span className="text-[12px] text-error">{errores.nombre}</span>}
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={etiqueta}>Precio de venta
            <input value={precio} onChange={e => { setPrecio(e.target.value); setErrores(x => ({ ...x, precio: undefined })) }}
              inputMode="decimal" placeholder="$ 0" className={cn(campo, 'font-mono')} />
            {errores.precio && <span className="text-[12px] text-error">{errores.precio}</span>}
          </label>
          <label className={etiqueta}>Costo
            <input value={costo} onChange={e => setCosto(e.target.value)} inputMode="decimal" placeholder="$ 0" className={cn(campo, 'font-mono')} />
          </label>
          <label className={etiqueta}>Categoría
            <select value={categoriaId} onChange={e => setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))} className={cn(campo, 'px-2.5')}>
              <option value="">Sin categoría</option>
              {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          <label className={etiqueta}>Se vende por
            <select value={unidad} onChange={e => setUnidad(e.target.value as UnidadMedida)} className={cn(campo, 'px-2.5')}>
              {UNIDADES_MEDIDA.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </label>
          {contexto !== 'ingreso' && (
            <label className={etiqueta}>Stock inicial
              <input value={stock} onChange={e => setStock(e.target.value)} inputMode="decimal" placeholder="0" className={cn(campo, 'font-mono')} />
            </label>
          )}
          <div className="flex flex-col justify-end gap-1 pb-1">
            <span className="font-mono text-etiqueta uppercase text-texto-3">Margen</span>
            <span className="text-[20px] font-semibold tabular-nums">
              {margen === null ? '—' : `${margen.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`}
            </span>
          </div>
        </div>

        <div className="flex-grow" />
        <div className="flex flex-col gap-2">
          <button type="submit" disabled={guardando}
            className="h-12 rounded-pastilla bg-texto text-[15px] font-medium text-superficie hover:opacity-90 disabled:opacity-50">
            {contexto === 'pos' ? 'Guardar y seguir escaneando' : contexto === 'ingreso' ? 'Guardar y cargar cantidad' : 'Guardar'}{' '}
            <span className="font-mono text-[11px] text-borde-fuerte">Enter</span>
          </button>
          <button type="button" disabled={guardando} onClick={() => void guardar(true)}
            className="h-11 rounded-pastilla border border-borde-fuerte bg-superficie text-seccion text-texto hover:bg-superficie-suave disabled:opacity-50">
            Guardar como borrador
          </button>
          <p className="mt-1 text-center text-[12px] text-texto-3">
            {contexto === 'pos'
              ? 'El producto se suma al carrito de la venta actual. El borrador no se vende hasta que lo completes.'
              : contexto === 'ingreso'
              ? 'Después te pregunta cuántas unidades ingresan. El borrador también se suma al ingreso.'
              : 'El borrador queda en "Productos por completar" hasta que tenga nombre y precio.'}
          </p>
        </div>
      </form>
    </div>
  )
}
