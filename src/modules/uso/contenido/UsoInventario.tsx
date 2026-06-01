import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoInventario = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>El módulo de Inventario controla tu stock. Manejás dos tipos de productos: simples (un ítem suelto, como una gaseosa) y conjuntos (un producto armado con varios componentes, como un combo). El sistema descuenta el stock automáticamente cada vez que vendés o usás un producto en una OT.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Creá una categoría" descripcion="Agrupá los productos (Bebidas, Comidas, Combos, etc.)." />
        <PasoUso numero={2} titulo="Cargá el producto" descripcion="Definí nombre, precio, costo, código de barras e imagen." />
        <PasoUso numero={3} titulo="Definí el stock mínimo" descripcion="El valor por debajo del cual el producto se marca como crítico." />
        <PasoUso numero={4} titulo="Usalo en ventas y OTs" descripcion="Cada movimiento descuenta el stock automáticamente." />
        <PasoUso numero={5} titulo="Revisá la rotación" descripcion="Mirá qué se vende más y qué está estancado." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Creás «Combo Hamburguesa» como conjunto de Pan + Medallón + Queso + Tomate. Cada vez que vendés el combo, el sistema descuenta automáticamente cada ingrediente del stock. No tenés que descontar uno por uno.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="tip">Configurá el stock mínimo desde el principio. Las alertas de stock crítico en el Dashboard dependen de ese valor.</TipUso>
      <TipUso tipo="importante">Los conjuntos no tienen stock propio: dependen del stock de sus componentes. Si un componente llega a 0, el conjunto queda inactivo.</TipUso>
    </SeccionUso>
  </div>
)
