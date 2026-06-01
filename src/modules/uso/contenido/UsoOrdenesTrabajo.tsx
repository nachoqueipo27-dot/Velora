import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoOrdenesTrabajo = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>Las Órdenes de Trabajo son el corazón operativo de Velora. Cada pedido o trabajo se gestiona como una OT que avanza por estados (recepción, en proceso, finalizado, entregado). Asignás responsables, ponés etiquetas, registrás garantías y seguís todo desde una vista Kanban.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Creá la OT" descripcion="Elegí cliente, producto y describí el trabajo a realizar." />
        <PasoUso numero={2} titulo="Asigná un empleado" descripcion="Definí quién es el responsable del pedido." />
        <PasoUso numero={3} titulo="Avanzá los estados" descripcion="De recepción a en proceso, y de ahí a finalizado." />
        <PasoUso numero={4} titulo="Entregá el trabajo" descripcion="Al marcarla como entregada, se activa la garantía si corresponde." />
        <PasoUso numero={5} titulo="Registrá la garantía" descripcion="El sistema te avisa cuando una garantía está por vencer." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Entra un pedido de 2 Combos Hamburguesa del Restaurante El Rincón. Creás la OT, la asignás a Carlos Ruiz, la avanzás a «En proceso» y cuando está lista la marcás como «Entregada». Si el cliente tiene algún problema dentro de los 7 días de garantía, el sistema te avisa.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Usá las etiquetas para priorizar. «Urgente» en rojo te permite filtrar los pedidos más importantes de un vistazo.</TipUso>
      <TipUso tipo="advertencia">Al cancelar una OT el sistema te pregunta qué pasa con los productos. Respondé con cuidado: si los das por perdidos, el stock no se recupera.</TipUso>
      <TipUso tipo="importante">La vista Kanban es ideal para el día a día. De un vistazo ves en qué estado está cada pedido.</TipUso>
    </SeccionUso>
  </div>
)
