import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoPDFs = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>El módulo de PDFs genera documentos profesionales listos para enviar o imprimir: órdenes de trabajo, presupuestos, remitos de entrega y recibos de pago. Todos salen con el logo y los datos de tu negocio.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Entrá al módulo PDFs" descripcion="Lo encontrás en la navegación principal." />
        <PasoUso numero={2} titulo="Elegí el tipo de documento" descripcion="OT, presupuesto, remito o recibo." />
        <PasoUso numero={3} titulo="Buscá el registro" descripcion="Por número o por cliente." />
        <PasoUso numero={4} titulo="Descargá el PDF" descripcion="Se abre el diálogo para elegir dónde guardarlo." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>El Restaurante El Rincón te pide el presupuesto del Combo por mail. Vas a PDFs, buscás el Presupuesto #001 y lo descargás. Se abre el diálogo para elegir dónde guardarlo y se lo mandás.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Los datos del encabezado de los PDFs (logo, nombre, dirección) se configuran en Configuración → Datos del negocio.</TipUso>
      <TipUso tipo="tip">También podés descargar PDFs directamente desde cada módulo (OT, presupuesto, etc.) sin pasar por el módulo PDFs.</TipUso>
    </SeccionUso>
  </div>
)
