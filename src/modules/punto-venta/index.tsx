import { useCallback, useState } from 'react'
import { usePosStore } from '../../store/posStore'
import { BuscadorProducto } from './BuscadorProducto'
import { Carrito } from './Carrito'
import { ResumenVenta } from './ResumenVenta'
import { ModalConfirmacion } from './ModalConfirmacion'
import type { VentaPOS } from '../../types/pos'
import { toast } from '../../store/toastStore'
import { ShoppingCart } from 'lucide-react'
import { useEscaneoEnModulo } from '../../lib/escaneo'
import { usePermiso } from '../../lib/permisos'
import { useEscaneoStore } from '../../store/escaneoStore'
import { crearBorrador } from '../../lib/altaDesdeEscaneo'
import { registrarActividad } from '../../lib/registrarActividad'
import { permiteDecimales, type Producto } from '../../types/inventario'
import { AltaRapida } from '../../components/escaneo/AltaRapida'
import { BarraCodigoDesconocido, type OpcionDesconocido } from './escaneo/BarraCodigoDesconocido'
import { DialogoCantidad, DialogoProductoX } from './escaneo/Dialogos'

const PuntoVenta = () => {
  const { carrito, limpiarCarrito, sumarProducto, agregarLibre } = usePosStore()
  const [confirmar, setConfirmar] = useState(false)

  // ─── Lector de códigos ───────────────────────────────────────────────
  const puedeDarAlta = usePermiso('inventario') === 'editar'
  const accionEnter = useEscaneoStore(s => s.config.accionDesconocido)
  const [desconocido, setDesconocido] = useState<string | null>(null) // barra de opciones
  const [alta, setAlta] = useState<string | null>(null)               // panel de alta rápida
  const [productoX, setProductoX] = useState<string | null>(null)     // diálogo "Producto X"
  const [pedirCantidad, setPedirCantidad] = useState<Producto | null>(null) // kg / metros

  /** Suma un producto escaneado: por peso o metro pide la cantidad; un pack suma sus unidades. */
  const sumarEscaneado = useCallback((p: Producto, unidades: number) => {
    if (!p.activo) { toast.error(`«${p.nombre}» está desactivado`); return }
    if (p.borrador || p.precio <= 0) { toast.info(`«${p.nombre}» es un borrador sin precio: completalo en Inventario`); return }
    if (permiteDecimales(p.unidadMedida)) setPedirCantidad(p)
    else sumarProducto(p, unidades)
  }, [sumarProducto])

  useEscaneoEnModulo('punto-venta', ({ codigo, resultado }) => {
    setDesconocido(null) // un escaneo nuevo cierra la barra
    if (resultado) { sumarEscaneado(resultado.producto, resultado.unidades); return }
    // Que Enter y los números vayan a la barra y no a un campo de texto.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    setDesconocido(codigo)
  })

  const cerrarBarra = useCallback(() => setDesconocido(null), [])
  const elegir = useCallback(async (opcion: OpcionDesconocido) => {
    const codigo = desconocido
    if (!codigo) return
    setDesconocido(null)
    try {
      switch (opcion) {
        case 'alta': setAlta(codigo); break
        case 'producto_x': setProductoX(codigo); break
        case 'borrador':
          await crearBorrador(codigo)
          toast.success('Guardado como borrador. Completalo en Inventario → Productos por completar.')
          break
        case 'avisar':
          await registrarActividad({
            modulo: 'Punto de Venta', accion: 'Pidió dar de alta un código',
            detalle: `El código ${codigo} se escaneó en el punto de venta y no está en el inventario.`,
          })
          toast.success('Aviso enviado: queda en el Historial de actividad.')
          break
      }
    } catch (e) {
      console.error('código desconocido', e)
      toast.error(e instanceof Error ? e.message : 'No se pudo completar la acción')
    }
  }, [desconocido])

  const onVenta = (v: VentaPOS) => {
    setConfirmar(false)
    toast.success(`Venta #${String(v.numero).padStart(3, '0')} registrada`)
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Panel izquierdo — buscador */}
      <section className="flex-1 overflow-hidden p-6 border-r border-[#2A2A2A] light:border-[#E4E4E4] flex flex-col">
        {desconocido && (
          <BarraCodigoDesconocido codigo={desconocido} puedeDarAlta={puedeDarAlta} accionEnter={accionEnter}
            onElegir={op => void elegir(op)} onCerrar={cerrarBarra} />
        )}
        <div className="flex-1 min-h-0"><BuscadorProducto /></div>
      </section>

      {/* Panel derecho — carrito + cobro */}
      <aside className="w-[380px] shrink-0 flex flex-col p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white light:text-black">
            <ShoppingCart size={16} /> Carrito
            {carrito.length > 0 && <span className="text-[11px] text-[#606060]">({carrito.length})</span>}
          </h2>
          {carrito.length > 0 && (
            <button onClick={limpiarCarrito} className="text-[11px] text-[#606060] hover:text-[#C0392B] transition-colors">Vaciar</button>
          )}
        </div>

        <Carrito />
        <ResumenVenta onConfirmar={() => setConfirmar(true)} />
      </aside>

      <ModalConfirmacion open={confirmar} onClose={() => setConfirmar(false)} onVenta={onVenta} />

      {alta && (
        <AltaRapida codigo={alta} contexto="pos" onCerrar={() => setAlta(null)}
          onCreado={(p, borrador) => {
            setAlta(null)
            if (borrador) toast.success('Guardado como borrador. Completalo en Inventario → Productos por completar.')
            else { toast.success(`«${p.nombre}» dado de alta`); sumarEscaneado(p, 1) }
          }} />
      )}
      {productoX && (
        <DialogoProductoX codigo={productoX} onCerrar={() => setProductoX(null)}
          onConfirmar={({ descripcion, precio }) => { agregarLibre({ descripcion, precio, codigo: productoX }); setProductoX(null) }} />
      )}
      {pedirCantidad && (
        <DialogoCantidad producto={pedirCantidad} onCerrar={() => setPedirCantidad(null)}
          onConfirmar={cantidad => { sumarProducto(pedirCantidad, cantidad); setPedirCantidad(null) }} />
      )}
    </div>
  )
}

export default PuntoVenta
