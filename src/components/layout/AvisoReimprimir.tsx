import { useEtiquetasStore } from '../../store/etiquetasStore'
import { useNavigationStore } from '../../store/navigationStore'
import { usePermiso } from '../../lib/permisos'
import { toast } from '../../store/toastStore'

/**
 * "Cambiaron N precios. ¿Reimprimir sus etiquetas?" — solo si las etiquetas llevan precio.
 * Lleva a Inventario → Imprimir etiquetas con esos productos cargados.
 */
export const AvisoReimprimir = () => {
  const { reimprimir, prefs, pedirEtiquetas, quitarDeReimprimir } = useEtiquetasStore()
  const setModule = useNavigationStore(s => s.setModule)
  const puedeEditar = usePermiso('inventario') === 'editar'

  if (!prefs.incluirPrecio || reimprimir.length === 0 || !puedeEditar) return null
  const n = reimprimir.length

  return (
    <div role="status" aria-live="polite"
      className="fixed bottom-12 left-4 z-[880] flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-tarjeta border border-acento/30 bg-superficie p-4 text-cuerpo text-texto shadow-lg">
      <div>
        <div className="text-seccion font-medium">Cambiaron {n} precio{n === 1 ? '' : 's'}</div>
        <div className="mt-0.5 text-[13px] text-texto-2">
          {n === 1 ? 'Su etiqueta tiene' : 'Sus etiquetas tienen'} el precio viejo. ¿{n === 1 ? 'La' : 'Las'} reimprimís?
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button"
          onClick={() => quitarDeReimprimir().catch(e => toast.error(e instanceof Error ? e.message : 'No se pudo guardar'))}
          className="h-8 rounded-pastilla px-3 text-[12px] text-texto-2 hover:text-texto">Ahora no</button>
        <button type="button"
          onClick={() => { pedirEtiquetas(reimprimir.map(productoId => ({ productoId }))); setModule('inventario') }}
          className="h-8 rounded-pastilla bg-texto px-3 text-[12px] font-medium text-superficie hover:opacity-90">Reimprimir etiquetas</button>
      </div>
    </div>
  )
}
