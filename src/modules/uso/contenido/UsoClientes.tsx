import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoClientes = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>El módulo de Clientes te permite gestionar toda tu cartera en un solo lugar: datos de contacto, categoría, historial de pedidos y comunicaciones. Cada cliente tiene su ficha con indicadores de cuánto gastó, cuántas órdenes hizo y qué compra más seguido.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Creá el cliente" descripcion="Cargá nombre, teléfono, email y dirección." />
        <PasoUso numero={2} titulo="Asignale una categoría" descripcion="VIP, Frecuente, Mayorista u Ocasional, según el tipo de relación." />
        <PasoUso numero={3} titulo="Generá órdenes de trabajo" descripcion="Cada OT que hagas para ese cliente queda asociada a su ficha." />
        <PasoUso numero={4} titulo="Registrá las comunicaciones" descripcion="Anotá llamados, mensajes y acuerdos en el log del cliente." />
        <PasoUso numero={5} titulo="Consultá el historial" descripcion="Cuando te contacten, ves de un vistazo todo lo que pasó con ese cliente." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Cargás a «Restaurante El Rincón» como cliente VIP. Cada vez que hacés una OT para ellos queda registrada en su historial. Cuando te llaman, podés ver de un vistazo cuánto gastaron y qué pidieron, sin revolver papeles.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Categorizá los clientes desde el principio. Te va a ayudar a filtrar y priorizar en el módulo de OTs.</TipUso>
      <TipUso tipo="importante">El log de comunicaciones es clave para que cualquier empleado pueda retomar una conversación sin perder contexto.</TipUso>
    </SeccionUso>
  </div>
)
