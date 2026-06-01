import { SeccionUso } from '../components/SeccionUso'
import { PasoUso } from '../components/PasoUso'
import { TipUso } from '../components/TipUso'

export const UsoConfiguracion = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <SeccionUso titulo="¿Para qué sirve?">
      <p>Configuración es el centro de control del sistema. Desde acá personalizás los datos de tu negocio, creás usuarios con sus permisos, ajustás las alertas, definís categorías y etiquetas, editás cómo se ven tus tickets y PDFs, y configurás los backups. Es el módulo que adapta Velora a tu negocio.</p>
    </SeccionUso>

    <SeccionUso titulo="Cómo funciona">
      <div className="flex flex-col">
        <PasoUso numero={1} titulo="Completá los datos del negocio" descripcion="Nombre, dirección, teléfono y logo. Aparecen en todos los documentos." />
        <PasoUso numero={2} titulo="Configurá los usuarios" descripcion="Creá una cuenta para cada empleado con los permisos justos." />
        <PasoUso numero={3} titulo="Ajustá las alertas" descripcion="Definí umbrales de stock, días sin movimiento y carga del equipo." />
        <PasoUso numero={4} titulo="Configurá el backup" descripcion="Programá copias de seguridad automáticas de tus datos." ultimo />
      </div>
    </SeccionUso>

    <SeccionUso titulo="Ejemplo práctico">
      <p>Al arrancar el sistema completás los datos de tu negocio. Creás un usuario para cada empleado con solo los permisos que necesitan. Configurás el backup automático diario a las 22 hs y te quedás tranquilo.</p>
    </SeccionUso>

    <SeccionUso titulo="Consejos">
      <TipUso tipo="importante">Configurá el backup automático desde el primer día. Si algo sale mal, es lo único que te permite recuperar todos tus datos.</TipUso>
      <TipUso tipo="advertencia">El botón «Resetear Velora» borra absolutamente todo. Usalo solo si querés empezar de cero, y hacé un backup antes.</TipUso>
    </SeccionUso>
  </div>
)
