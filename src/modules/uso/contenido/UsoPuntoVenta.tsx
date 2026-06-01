import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoPuntoVenta = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>El Punto de Venta (POS) es para vender rápido desde el mostrador, sin tener que armar una orden de trabajo. Buscás productos, los agregás al carrito, elegís la forma de pago y confirmás. Ideal para ventas directas del día a día.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Buscá el producto" descripcion="Por nombre o escaneando el código de barras." />
        <PasoUso numero={2} titulo="Agregalo al carrito" descripcion="Ajustá la cantidad y aplicá descuentos si hace falta." />
        <PasoUso numero={3} titulo="Elegí la forma de pago" descripcion="Efectivo, transferencia o tarjeta." />
        <PasoUso numero={4} titulo="Confirmá la venta" descripcion="En efectivo, ingresás el monto recibido y se calcula el vuelto." />
        <PasoUso numero={5} titulo="Imprimí el ticket" descripcion="Se genera el comprobante y la venta queda registrada." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Un cliente entra y pide 2 Gaseosas y 1 Combo Hamburguesa. Los buscás, los agregás al carrito, seleccionás efectivo, ingresás el monto recibido y el sistema calcula el vuelto automáticamente.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Si tenés un lector de códigos de barras, escaneá directo: el producto se agrega al carrito sin necesidad de buscarlo.</TipUso>
      <TipUso tipo="importante">Cada venta del POS queda registrada en la Caja Diaria automáticamente. No necesitás registrarla dos veces.</TipUso>
    </SeccionUso>
  </div>
)
