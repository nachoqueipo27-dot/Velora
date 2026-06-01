import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoPresupuestos = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>El módulo de Presupuestos te permite cotizar trabajos antes de hacerlos. Armás el presupuesto, se lo mandás al cliente y le hacés seguimiento del estado (borrador, enviado, aprobado, rechazado). Cuando el cliente lo aprueba, lo convertís en una orden de trabajo con un solo click.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Creá el presupuesto" descripcion="Elegí el cliente y agregá los productos con sus cantidades." />
        <PasoUso numero={2} titulo="Enviáselo al cliente" descripcion="Lo marcás como enviado y queda con una vigencia definida." />
        <PasoUso numero={3} titulo="El cliente aprueba" descripcion="Cuando da el OK, marcás el presupuesto como aprobado." />
        <PasoUso numero={4} titulo="Convertí a OT" descripcion="Con un click se transforma en una orden de trabajo lista para arrancar." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>El Restaurante El Rincón te pide precio por 10 Combos Hamburguesa. Creás el presupuesto, se lo mandás, lo aprueba y con un click se convierte en OT lista para trabajar, sin volver a cargar los datos.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Configurá los días de vigencia según tu rubro. Para productos perecederos, 2-3 días; para servicios, podés poner 7-15 días.</TipUso>
      <TipUso tipo="advertencia">Un presupuesto vencido no desaparece: queda marcado como vencido. Podés reenviarlo para renovar la vigencia.</TipUso>
    </SeccionUso>
  </div>
)
