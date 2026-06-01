import type { EtiquetaOT } from '../../../types/ordenesTrabajo'

export const EtiquetaChip = ({ etiqueta }: { etiqueta: EtiquetaOT }) => (
  <span
    className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium"
    style={{ backgroundColor: `${etiqueta.color}26`, color: etiqueta.color }}
  >
    {etiqueta.nombre}
  </span>
)
