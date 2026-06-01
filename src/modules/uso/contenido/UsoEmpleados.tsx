import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoEmpleados = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>El módulo de Empleados te permite gestionar a tu equipo de punta a punta: roles, horarios, fichajes, horas extras, ausencias y métricas de rendimiento. Sabés quién trabaja cuándo, cuántas horas hizo cada uno y cuántas órdenes cerró.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Creá el empleado" descripcion="Cargá su nombre y una contraseña para que pueda iniciar sesión." />
        <PasoUso numero={2} titulo="Asignale rol y horario" descripcion="Definí si tiene horario fijo o por turnos, y qué permisos tiene su rol." />
        <PasoUso numero={3} titulo="Asignale órdenes de trabajo" descripcion="Desde el módulo de OTs podés repartir la carga entre el equipo." />
        <PasoUso numero={4} titulo="Registrá fichajes y ausencias" descripcion="Entradas, salidas, faltas justificadas e injustificadas." />
        <PasoUso numero={5} titulo="Revisá las métricas" descripcion="A fin de mes ves horas trabajadas, horas extras y OTs cerradas por persona." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Carlos Ruiz trabaja de 9 a 18. Un día llega tarde y lo registrás como falta justificada. Al final del mes podés ver cuántas horas trabajó y cuántas OTs cerró, todo sin sacar la cuenta a mano.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Definí bien los horarios desde el inicio. El sistema los usa para calcular las horas extras automáticamente.</TipUso>
      <TipUso tipo="advertencia">No olvides registrar las ausencias el mismo día. Si acumulás varios días sin registrar, el historial queda incompleto.</TipUso>
    </SeccionUso>
  </div>
)
