import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoListaPrecios = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>Lista de Precios te permite actualizar los precios de tus productos de forma masiva y controlada. Podés aplicar aumentos por porcentaje, previsualizar el resultado antes de confirmar y, cada vez que aplicás un cambio, el sistema guarda un snapshot con los precios anteriores.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Revisá los precios actuales" descripcion="Ves la lista completa con los valores vigentes." />
        <PasoUso numero={2} titulo="Previsualizá el aumento" descripcion="Ingresás un porcentaje y el sistema te muestra cómo quedarían los precios." />
        <PasoUso numero={3} titulo="Confirmá el cambio" descripcion="Si estás conforme, aplicás el aumento a los productos elegidos." />
        <PasoUso numero={4} titulo="Snapshot automático" descripcion="Se guarda una copia de los precios anteriores por si necesitás volver atrás." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>La inflación subió. Vas a Lista de Precios, ingresás 15% de aumento para la categoría Combos, previsualizás los nuevos precios y confirmás. El sistema guarda un snapshot con los precios anteriores por si necesitás volver atrás.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Siempre usá la previsualización antes de aplicar. Así podés ver exactamente qué precios van a cambiar.</TipUso>
      <TipUso tipo="importante">Los snapshots son tu red de seguridad. Si aplicaste un aumento incorrecto, podés restaurar la lista anterior.</TipUso>
    </SeccionUso>
  </div>
)
