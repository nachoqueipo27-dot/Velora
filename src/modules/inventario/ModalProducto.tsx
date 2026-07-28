import { useEffect, useMemo, useState } from 'react'
import { cn } from '../../lib/utils'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Modal } from '../../components/ui/Modal'
import { useInventarioStore, type ComponenteInput, type NuevoProducto } from '../../store/inventarioStore'
import {
  TRAZABILIDAD_OPCIONES, UNIDADES_MEDIDA, permiteDecimales,
  type Producto, type Trazabilidad, type UnidadMedida,
} from '../../types/inventario'
import { ImagenCropper } from './components/ImagenCropper'
import { ComponentesList } from './components/ComponentesList'
import { Plus } from 'lucide-react'

interface ModalProductoProps {
  open: boolean
  onClose: () => void
  producto?: Producto | null
  tipoInicial?: 'simple' | 'conjunto'
}

const num = (v: string) => (v === '' ? 0 : Number(v))

export const ModalProducto = ({ open, onClose, producto, tipoInicial = 'simple' }: ModalProductoProps) => {
  const { productos, categorias, crearProducto, actualizarProducto, crearCategoria, cargarCategorias, cargarComponentes } = useInventarioStore()
  const esEdicion = !!producto

  const [tipo, setTipo] = useState<'simple' | 'conjunto'>(tipoInicial)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [precioCosto, setPrecioCosto] = useState('')
  const [monedaCosto, setMonedaCosto] = useState<'ARS' | 'USD'>('ARS')
  const [codigoSku, setCodigoSku] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [stock, setStock] = useState('')
  const [stockMinimo, setStockMinimo] = useState('')
  const [trazabilidad, setTrazabilidad] = useState<Trazabilidad>('ninguna')
  const [unidadMedida, setUnidadMedida] = useState<UnidadMedida>('unidad')
  const [imagen, setImagen] = useState<string | null>(null)
  const [componentes, setComponentes] = useState<ComponenteInput[]>([])
  const [nuevaCat, setNuevaCat] = useState('')
  const [mostrarNuevaCat, setMostrarNuevaCat] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return
    cargarCategorias()
    if (producto) {
      setTipo(producto.tipo)
      setNombre(producto.nombre)
      setDescripcion(producto.descripcion)
      setPrecio(String(producto.precio))
      setPrecioCosto(String(producto.precioCosto))
      setMonedaCosto(producto.monedaCosto)
      setCodigoSku(producto.codigoSku)
      setCategoriaId(producto.categoriaId ?? '')
      setStock(String(producto.stock))
      setStockMinimo(String(producto.stockMinimo))
      setTrazabilidad(producto.trazabilidad)
      setUnidadMedida(producto.unidadMedida)
      setImagen(producto.imagen)
      if (producto.tipo === 'conjunto') {
        cargarComponentes(producto.id).then(comps =>
          setComponentes(comps.map(c => ({ componenteId: c.componenteId, cantidad: c.cantidad }))))
      } else setComponentes([])
    } else {
      setTipo(tipoInicial); setNombre(''); setDescripcion(''); setPrecio(''); setPrecioCosto('')
      setMonedaCosto('ARS'); setCodigoSku(''); setCategoriaId(''); setStock(''); setStockMinimo('')
      setTrazabilidad('ninguna'); setUnidadMedida('unidad'); setImagen(null); setComponentes([])
    }
    setNuevaCat(''); setMostrarNuevaCat(false); setTouched(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, producto])

  const productosSimples = useMemo(
    () => productos.filter(p => p.tipo === 'simple' && p.id !== producto?.id),
    [productos, producto]
  )

  const nombreInvalido = nombre.trim() === ''
  const conjuntoSinComp = tipo === 'conjunto' && componentes.length === 0
  const stockAceptaDecimales = permiteDecimales(unidadMedida)
  const stockConDecimalInvalido = tipo === 'simple' && !stockAceptaDecimales && stock !== '' && !Number.isInteger(num(stock))
  const invalido = nombreInvalido || conjuntoSinComp || stockConDecimalInvalido

  // Si la unidad pasa a ser entera (Unidad/Caja) y el stock cargado tiene decimales,
  // se redondea al cambiar de unidad en vez de dejar que el usuario choque con el error.
  const handleUnidadMedida = (u: UnidadMedida) => {
    setUnidadMedida(u)
    if (!permiteDecimales(u) && stock !== '' && !Number.isInteger(num(stock))) {
      setStock(String(Math.round(num(stock))))
    }
  }

  const agregarCategoria = async () => {
    if (nuevaCat.trim() === '') return
    const id = await crearCategoria(nuevaCat.trim())
    if (id) setCategoriaId(id)
    setNuevaCat(''); setMostrarNuevaCat(false)
  }

  const handleGuardar = async () => {
    if (invalido) { setTouched(true); return }
    setGuardando(true)
    try {
      const payload: NuevoProducto = {
        nombre: nombre.trim(),
        tipo,
        descripcion: descripcion.trim(),
        categoriaId: categoriaId === '' ? null : Number(categoriaId),
        precio: num(precio),
        precioCosto: num(precioCosto),
        monedaCosto,
        codigoSku: codigoSku.trim(),
        stock: tipo === 'conjunto' ? 0 : num(stock),
        stockMinimo: num(stockMinimo),
        imagen,
        trazabilidad,
        unidadMedida,
        activo: producto?.activo ?? true,
      }
      if (esEdicion && producto) await actualizarProducto(producto.id, payload, componentes)
      else await crearProducto(payload, componentes)
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esEdicion ? 'Editar producto' : tipo === 'conjunto' ? 'Nuevo conjunto' : 'Nuevo producto'}
      maxWidth="max-w-3xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={guardando}>Cancelar</Button>
          <Button onClick={handleGuardar} disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-5 pb-1">
        {/* Columna izquierda — imagen */}
        <div>
          <span className="text-xs font-medium text-[#A0A0A0] light:text-[#404040] mb-2 block">Imagen</span>
          <ImagenCropper value={imagen} onChange={setImagen} />
        </div>

        {/* Columna derecha — datos */}
        <div className="flex flex-col gap-3">
          {/* Toggle tipo */}
          <div className="grid grid-cols-2 gap-2">
            {(['simple', 'conjunto'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={cn(
                  'px-3 py-2 rounded-input border text-sm font-medium transition-all duration-150',
                  tipo === t
                    ? 'border-white bg-white/[0.08] text-white light:border-black light:bg-black/[0.06] light:text-black'
                    : 'border-[#2A2A2A] text-[#A0A0A0] hover:text-white light:border-[#E4E4E4] light:text-[#404040] light:hover:text-black',
                )}>
                {t === 'simple' ? 'Simple' : 'Compuesto'}
              </button>
            ))}
          </div>

          <Input label="Nombre *" value={nombre} onChange={e => setNombre(e.target.value)}
            error={touched && nombreInvalido ? 'Obligatorio' : undefined} autoFocus />
          <Textarea label="Descripción" rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="Precio de venta" type="number" value={precio} onChange={e => setPrecio(e.target.value)} />
            <div className="flex gap-2 items-end">
              <Input label="Precio de costo" type="number" value={precioCosto} onChange={e => setPrecioCosto(e.target.value)} className="flex-1" />
              <div className="w-20">
                <Select value={monedaCosto} onChange={e => setMonedaCosto(e.target.value as 'ARS' | 'USD')}>
                  <option value="ARS" className="bg-[#141414] light:bg-white">ARS</option>
                  <option value="USD" className="bg-[#141414] light:bg-white">USD</option>
                </Select>
              </div>
            </div>
          </div>

          <Input label="Código SKU" value={codigoSku} onChange={e => setCodigoSku(e.target.value)} />

          {/* Categoría */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[#A0A0A0] light:text-[#404040]">Categoría</label>
              <button type="button" onClick={() => setMostrarNuevaCat(v => !v)} className="text-[11px] text-[#606060] hover:text-white light:hover:text-black flex items-center gap-0.5">
                <Plus size={11} /> Nueva
              </button>
            </div>
            {mostrarNuevaCat ? (
              <div className="flex gap-2">
                <input value={nuevaCat} onChange={e => setNuevaCat(e.target.value)} placeholder="Nombre de categoría"
                  className="flex-1 px-3 py-2 text-sm rounded-input border bg-transparent outline-none border-[#2A2A2A] text-white focus:border-white light:border-[#E4E4E4] light:text-[#0A0A0A]" />
                <Button size="sm" onClick={agregarCategoria}>Crear</Button>
              </div>
            ) : (
              <Select value={categoriaId} onChange={e => setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))}>
                <option value="" className="bg-[#141414] light:bg-white">Sin categoría</option>
                {categorias.map(c => <option key={c.id} value={c.id} className="bg-[#141414] light:bg-white">{c.nombre}</option>)}
              </Select>
            )}
          </div>

          {tipo === 'simple' && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Stock actual" type="number" step={stockAceptaDecimales ? '0.01' : '1'}
                value={stock} onChange={e => setStock(e.target.value)}
                error={touched && stockConDecimalInvalido ? 'Esta unidad no admite decimales' : undefined}
              />
              <Input label="Stock mínimo" type="number" value={stockMinimo} onChange={e => setStockMinimo(e.target.value)} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select label="Unidad de medida" value={unidadMedida} onChange={e => handleUnidadMedida(e.target.value as UnidadMedida)}>
              {UNIDADES_MEDIDA.map(o => <option key={o.value} value={o.value} className="bg-[#141414] light:bg-white">{o.label}</option>)}
            </Select>
            <Select label="Trazabilidad" value={trazabilidad} onChange={e => setTrazabilidad(e.target.value as Trazabilidad)}>
              {TRAZABILIDAD_OPCIONES.map(o => <option key={o.value} value={o.value} className="bg-[#141414] light:bg-white">{o.label}</option>)}
            </Select>
          </div>

          {tipo === 'conjunto' && (
            <>
              <ComponentesList productosSimples={productosSimples} value={componentes} onChange={setComponentes} />
              {touched && conjuntoSinComp && <span className="text-xs text-[#C0392B]">Agregá al menos un componente</span>}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
