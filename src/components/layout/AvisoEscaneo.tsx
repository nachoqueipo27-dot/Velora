import { useEffect, useState } from 'react'
import { useEscaneoSinManejador, type EventoEscaneo } from '../../lib/escaneo'
import { useEscaneoStore } from '../../store/escaneoStore'
import { useNavigationStore } from '../../store/navigationStore'
import { usePermiso } from '../../lib/permisos'
import { formatearPesos } from '../../lib/dinero'
import { UNIDAD_ABREVIADA } from '../../types/inventario'
import { X } from 'lucide-react'

const DURACION_MS = 6000

/**
 * Aviso flotante para los escaneos en pantallas que no los atienden (todas menos Punto de
 * venta e Inventario): nombre, precio y stock, o "Código no registrado" con "Darlo de alta".
 */
export const AvisoEscaneo = () => {
  const [evento, setEvento] = useState<EventoEscaneo | null>(null)
  const puedeDarAlta = usePermiso('inventario') === 'editar'
  const pedirAlta = useEscaneoStore(s => s.pedirAlta)
  const setModule = useNavigationStore(s => s.setModule)

  useEscaneoSinManejador(setEvento)

  useEffect(() => {
    if (!evento) return
    const t = setTimeout(() => setEvento(null), DURACION_MS)
    return () => clearTimeout(t)
  }, [evento])

  if (!evento) return null
  const { codigo, resultado } = evento
  const p = resultado?.producto

  const darAlta = () => {
    pedirAlta(codigo)
    setEvento(null)
    setModule('inventario')
  }

  return (
    <div role="status" aria-live="polite"
      className="fixed bottom-12 left-4 z-[900] w-[320px] max-w-[calc(100vw-2rem)] rounded-tarjeta border border-borde bg-superficie p-4 text-cuerpo text-texto shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-etiqueta uppercase text-texto-3">{p ? 'Código escaneado' : 'Código no registrado'}</div>
          <div className="mt-0.5 font-mono text-[13px] text-texto-2 truncate">{codigo}</div>
        </div>
        <button type="button" onClick={() => setEvento(null)} aria-label="Cerrar aviso"
          className="p-1 -m-1 rounded-control text-texto-3 hover:text-texto"><X size={14} /></button>
      </div>

      {p ? (
        <div className="mt-3 flex flex-col gap-1">
          <div className="text-seccion font-medium leading-snug">{p.nombre}</div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-titulo font-semibold tabular-nums">{formatearPesos(p.precio)}</span>
            <span className="font-mono text-[12px] text-texto-2">
              {p.tipo === 'conjunto' ? 'Conjunto' : `Stock ${p.stock} ${UNIDAD_ABREVIADA[p.unidadMedida] ?? ''}`}
            </span>
          </div>
          {resultado && resultado.unidades > 1 && (
            <div className="text-[12px] text-texto-3">Pack de {resultado.unidades} unidades</div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-[13px] text-texto-2">No está en el inventario.</span>
          {puedeDarAlta && (
            <button type="button" onClick={darAlta}
              className="h-8 shrink-0 rounded-pastilla bg-texto px-3 text-[12px] font-medium text-superficie hover:opacity-90">
              Darlo de alta
            </button>
          )}
        </div>
      )}
    </div>
  )
}
