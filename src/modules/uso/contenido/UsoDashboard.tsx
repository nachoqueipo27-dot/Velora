import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoDashboard = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>El Dashboard es el panel central de control de tu negocio en tiempo real. Apenas entrás a Velora ves el estado general: cuántas órdenes de trabajo tenés activas, cuánto cobraste hoy, qué productos están por quedarse sin stock y qué cosas necesitan tu atención. Es tu punto de partida para arrancar el día.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Entrá a Velora" descripcion="El Dashboard se abre automáticamente al iniciar sesión." />
        <PasoUso numero={2} titulo="Mirá las OTs activas" descripcion="Las tarjetas de arriba te muestran las órdenes en curso y un mini-tablero por estado." />
        <PasoUso numero={3} titulo="Revisá el stock crítico" descripcion="Si hay productos por debajo del mínimo, aparecen destacados en rojo." />
        <PasoUso numero={4} titulo="Atendé las alertas" descripcion="Presupuestos vencidos, garantías por vencer y OTs sin movimiento se listan como avisos." />
        <PasoUso numero={5} titulo="Tomá acción con un click" descripcion="Cada tarjeta y alerta te lleva directo al módulo donde podés resolver el tema." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>El lunes a la mañana abrís Velora y ves que hay 3 OTs sin movimiento hace 4 días y 2 productos con stock crítico. Desde el Dashboard podés ir directo a cada problema con un click, sin tener que buscar entre módulos.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Revisá el Dashboard al inicio de cada jornada para detectar problemas antes de que escalen.</TipUso>
      <TipUso tipo="advertencia">Si ves muchas OTs sin movimiento, puede indicar que el equipo tiene demasiada carga. Revisá la sección «Carga del equipo».</TipUso>
    </SeccionUso>
  </div>
)
