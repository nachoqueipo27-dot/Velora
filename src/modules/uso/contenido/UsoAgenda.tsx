import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoAgenda = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>La Agenda es el calendario de citas y turnos de tu equipo. Programás reuniones, visitas y entregas, las asignás a un empleado y las podés vincular a un cliente o a una OT. Si dos citas se pisan en el mismo horario, el sistema te avisa.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Creá la cita" descripcion="Elegí día, hora de inicio y fin, y un título." />
        <PasoUso numero={2} titulo="Asigná un empleado" descripcion="Definí quién es el responsable de esa cita." />
        <PasoUso numero={3} titulo="Vinculá cliente u OT" descripcion="Asociá la cita a un cliente o a una orden de trabajo existente." />
        <PasoUso numero={4} titulo="Atendé la alerta de superposición" descripcion="Si el empleado ya tiene algo en ese horario, el sistema te lo marca." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Tenés una reunión con el Restaurante El Rincón el miércoles a las 10. La agendás, asignás a María López y el sistema te avisa si María ya tiene otra cita en ese horario.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Vinculá las citas a OTs cuando sea posible. Así tenés todo el contexto del pedido disponible desde la cita.</TipUso>
      <TipUso tipo="advertencia">La detección de superposición es un aviso, no un bloqueo. Podés ignorarla, pero revisá bien antes de confirmar.</TipUso>
    </SeccionUso>
  </div>
)
