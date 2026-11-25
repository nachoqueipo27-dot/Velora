import { useEscaneoStore, type AccionDesconocido } from '../../store/escaneoStore'
import { useEdicion } from '../../lib/permisos'
import { toast } from '../../store/toastStore'
import { cn } from '../../lib/utils'

const ACCIONES: { id: AccionDesconocido; titulo: string; ayuda: string }[] = [
  {
    id: 'opciones',
    titulo: 'Mostrar opciones',
    ayuda: 'Aparece la barra y elegís cada vez con las teclas 1, 2 o 3. Enter no hace nada.',
  },
  {
    id: 'alta',
    titulo: 'Alta rápida',
    ayuda: 'Enter abre el panel para cargar nombre y precio; al guardar, el producto se suma a la venta.',
  },
  {
    id: 'borrador',
    titulo: 'Borrador',
    ayuda: 'Enter lo guarda sin nombre ni precio para completarlo después en Inventario. No se suma a la venta.',
  },
  {
    id: 'producto_x',
    titulo: 'Vender como "Producto X"',
    ayuda: 'Enter pide el precio y lo vende sin crear el producto. No descuenta stock.',
  },
]

/** Configuración → Punto de venta. */
export const ConfigPuntoVenta = () => {
  const { config, guardar } = useEscaneoStore()
  const ed = useEdicion('configuracion')
  const bloqueado = 'disabled' in ed

  const elegir = (accion: AccionDesconocido) =>
    guardar({ accionDesconocido: accion }).catch(e => toast.error(e instanceof Error ? e.message : 'No se pudo guardar'))

  return (
    <div className="max-w-2xl flex flex-col gap-5 text-cuerpo text-texto">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">Punto de venta</h2>
        <p className="text-[12px] text-[#606060]">Cómo se comporta la caja al vender.</p>
      </header>

      <fieldset className="m-0 flex flex-col gap-1 rounded-panel border border-borde bg-superficie px-5 py-4" disabled={bloqueado} title={ed.title}>
        <legend className="float-left mb-1 p-0 text-[15px] font-semibold">Acción al escanear un código desconocido</legend>
        <p className="clear-both mb-2 text-[13px] text-texto-2">
          Cuando se escanea un código que no está en el inventario aparece una barra con opciones. Esta es la que corre con Enter.
          Quien no puede editar Inventario solo ve «Vender como Producto X» y «Avisar al encargado».
        </p>
        {ACCIONES.map((a, i) => (
          <label key={a.id} className={cn('flex cursor-pointer items-start gap-3 py-3', i > 0 && 'border-t border-borde')}>
            <input type="radio" name="accion-desconocido" checked={config.accionDesconocido === a.id}
              onChange={() => elegir(a.id)} className="mt-1 accent-acento" />
            <span>
              <span className="block text-seccion font-medium">{a.titulo}</span>
              <span className="mt-0.5 block text-[13px] text-texto-2">{a.ayuda}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </div>
  )
}
