import { Lock } from 'lucide-react'

/** Se muestra en lugar de un módulo al que el rol no tiene acceso. */
export const AccesoRestringido = () => (
  <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
    <Lock size={28} className="text-texto-3 dark:text-oscuro-texto-2" />
    <div className="flex flex-col gap-1">
      <p className="text-titulo font-medium text-texto dark:text-oscuro-texto">Acceso restringido</p>
      <p className="text-cuerpo text-texto-3 dark:text-oscuro-texto-2">
        Tu rol no tiene acceso a esta sección. Si la necesitás, pedíselo al dueño.
      </p>
    </div>
  </div>
)
