import { useEffect, useState, type ReactNode } from 'react'
import { cargarCodigos, type CodigoProducto } from '../../../lib/codigos'
import { detectarTipo, NOMBRE_TIPO } from '../../../lib/barras'
import { CodigoBarras } from '../../../components/barras/CodigoBarras'
import { cn } from '../../../lib/utils'

interface CodigosDibujadosProps {
  productoId: number
  /** Cambia cuando el producto se edita (para recargar los códigos). */
  version?: string
  /** Acciones por código (ej. "Imprimir etiqueta"). */
  accion?: (codigo: CodigoProducto) => ReactNode
  /** Lo que se muestra si el producto no tiene códigos (ej. "Generar código"). */
  sinCodigos?: ReactNode
  onCargados?: (codigos: CodigoProducto[]) => void
}

/** "Códigos de barras" de la ficha: cada código dibujado de verdad (escaneable desde la pantalla). */
export const CodigosDibujados = ({ productoId, version, accion, sinCodigos, onCargados }: CodigosDibujadosProps) => {
  const [codigos, setCodigos] = useState<CodigoProducto[] | null>(null)

  useEffect(() => {
    let vigente = true
    cargarCodigos(productoId)
      .then(c => { if (vigente) { setCodigos(c); onCargados?.(c) } })
      .catch(e => { console.error('cargarCodigos', e); if (vigente) setCodigos([]) })
    return () => { vigente = false }
  }, [productoId, version]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="rounded-panel border border-borde bg-superficie p-4 text-cuerpo text-texto">
      <div className="font-mono text-etiqueta uppercase text-texto-3">Códigos de barras</div>
      {codigos === null ? (
        <div className="py-4 text-texto-3">Cargando…</div>
      ) : codigos.length === 0 ? (
        <div className="flex flex-col gap-2 py-3">
          <span className="text-texto-2">Este producto no tiene código de barras.</span>
          {sinCodigos}
        </div>
      ) : (
        codigos.map((c, i) => {
          const tipo = detectarTipo(c.codigo)
          return (
            <div key={c.codigo} className={cn('flex flex-col gap-2 py-3', i > 0 && 'border-t border-borde')}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium">
                  {c.tipo === 'pack' ? `Pack × ${c.unidadesPorPack.toLocaleString('es-AR')}` : i === 0 ? 'Unidad · principal' : 'Unidad'}
                </span>
                <span className="font-mono text-[11px] text-texto-3">{NOMBRE_TIPO[tipo]}{c.tipo === 'pack' && tipo === 'itf14' ? ' · caja' : ''}</span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <CodigoBarras valor={c.codigo} alto={i === 0 ? 56 : 44} modulo={tipo === 'itf14' ? 1.4 : 2} />
                {accion?.(c)}
              </div>
            </div>
          )
        })
      )}
    </section>
  )
}
