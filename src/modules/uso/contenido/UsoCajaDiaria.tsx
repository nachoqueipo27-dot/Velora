import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoCajaDiaria = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>La Caja Diaria es tu control financiero del día a día. Reúne todos los cobros (del POS y de las OTs), te deja registrar los gastos operativos y calcula el saldo neto. Al final del día cerrás la caja y, a fin de mes, cerrás el período completo con su resumen.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Revisá los cobros del día" descripcion="Aparecen automáticamente los del POS y las OTs." />
        <PasoUso numero={2} titulo="Registrá los gastos" descripcion="Cargá servicios, insumos, transporte y otros egresos." />
        <PasoUso numero={3} titulo="Revisá el saldo" descripcion="El sistema calcula ingresos menos gastos en tiempo real." />
        <PasoUso numero={4} titulo="Cerrá la caja" descripcion="Al terminar el día, dejás el cierre registrado." />
        <PasoUso numero={5} titulo="Cerrá el mes" descripcion="A fin de mes consolidás el período y descargás el resumen en PDF." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Al final del día revisás que los cobros del POS y las OTs estén bien, registrás el gasto del delivery, cerrás la caja y ves que el saldo neto fue $18.500. Al final del mes cerrás el período y descargás el resumen en PDF.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Cerrá la caja todos los días antes de irte. Una vez cerrada no se pueden modificar los registros, lo que protege la integridad de los datos.</TipUso>
      <TipUso tipo="advertencia">El cierre de mes bloquea todos los registros de ese período. Asegurate de que todo esté correcto antes de cerrar.</TipUso>
    </SeccionUso>
  </div>
)
