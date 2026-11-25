import { useEscaneoStore } from '../../store/escaneoStore'
import { useEdicion } from '../../lib/permisos'
import { toast } from '../../store/toastStore'
import { Interruptor } from './components/Interruptor'

/** Configuración → General. */
export const ConfigGeneral = () => {
  const { config, guardar } = useEscaneoStore()
  const ed = useEdicion('configuracion')

  const cambiarSonido = (sonido: boolean) =>
    guardar({ sonido }).catch(e => toast.error(e instanceof Error ? e.message : 'No se pudo guardar'))

  return (
    <div className="max-w-2xl flex flex-col gap-5 text-cuerpo text-texto">
      <header>
        <h2 className="text-lg font-semibold text-white light:text-black">General</h2>
        <p className="text-[12px] text-[#606060]">Opciones que valen para todas las pantallas.</p>
      </header>

      <section className="rounded-panel border border-borde bg-superficie px-5 py-1.5">
        <Interruptor
          titulo="Sonido al escanear"
          ayuda="Un pitido corto cuando el código está en el inventario y uno doble y grave cuando no está."
          activo={config.sonido}
          onChange={cambiarSonido}
          {...ed}
        />
      </section>
    </div>
  )
}
