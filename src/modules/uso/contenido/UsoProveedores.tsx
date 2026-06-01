import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoProveedores = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>Este módulo gestiona a tus proveedores y las órdenes de compra. Registrás a quién le comprás, armás los pedidos, los enviás y cuando llega la mercadería la recibís en el sistema. Al recibirla, el stock se actualiza solo.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Registrá el proveedor" descripcion="Cargá razón social, rubro, contacto y teléfono." />
        <PasoUso numero={2} titulo="Creá la orden de compra" descripcion="Elegí los productos y las cantidades que vas a pedir." />
        <PasoUso numero={3} titulo="Marcala como enviada" descripcion="Cuando confirmás el pedido al proveedor." />
        <PasoUso numero={4} titulo="Recepcioná la mercadería" descripcion="Cuando llega, confirmás la recepción en el sistema." />
        <PasoUso numero={5} titulo="Stock actualizado" descripcion="Las cantidades recibidas se suman automáticamente al inventario." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Le pedís 20 panes a Distribuidora Sur. Creás la orden de compra, la mandás y cuando llega la mercadería la recibís en el sistema. El stock de «Pan de hamburguesa» sube automáticamente 20 unidades.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Siempre recepcioná la mercadería en el sistema el mismo día que llega, para que el stock esté actualizado.</TipUso>
      <TipUso tipo="advertencia">Una orden de compra en estado «Recibida» no se puede modificar. Verificá los ítems antes de confirmar la recepción.</TipUso>
    </SeccionUso>
  </div>
)
