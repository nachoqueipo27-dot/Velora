import { useMemo } from 'react'
import { barrasDe, codificar, type TipoBarras } from '../../lib/barras'
import { cn } from '../../lib/utils'

interface CodigoBarrasProps {
  valor: string
  /** Si no se indica, sale de la forma del valor (13 → EAN-13, 14 → ITF-14…). */
  tipo?: TipoBarras
  /** Alto de las barras en px. */
  alto?: number
  /** Ancho de un módulo en px. 2 px se escanea bien desde la pantalla. */
  modulo?: number
  mostrarNumero?: boolean
  className?: string
}

/**
 * Código de barras dibujado en SVG, escaneable desde la pantalla. Fondo blanco y zona
 * silenciosa incluidos (sin eso el lector no lo toma).
 */
export const CodigoBarras = ({ valor, tipo, alto = 56, modulo = 2, mostrarNumero = true, className }: CodigoBarrasProps) => {
  const dibujo = useMemo(() => {
    try { return codificar(valor, tipo) } catch { return null }
  }, [valor, tipo])

  if (!dibujo) {
    return <span className={cn('font-mono text-[12px] text-error', className)}>No se puede dibujar «{valor}»</span>
  }

  const total = dibujo.modulos.length + dibujo.zonaSilenciosa * 2
  const ancho = total * modulo
  const soporte = dibujo.soporte ? modulo * 2 : 0
  const altoTexto = mostrarNumero ? 16 : 0
  const barras = barrasDe(dibujo.modulos)

  return (
    <svg role="img" aria-label={`Código de barras ${valor}`} width={ancho} height={alto + soporte * 2 + altoTexto}
      viewBox={`0 0 ${ancho} ${alto + soporte * 2 + altoTexto}`} className={cn('block max-w-full', className)}>
      <rect x={0} y={0} width={ancho} height={alto + soporte * 2 + altoTexto} className="fill-superficie" />
      {dibujo.soporte && (
        <>
          <rect x={0} y={0} width={ancho} height={soporte} className="fill-texto" />
          <rect x={0} y={alto + soporte} width={ancho} height={soporte} className="fill-texto" />
        </>
      )}
      {barras.map(b => (
        <rect key={b.x} x={(b.x + dibujo.zonaSilenciosa) * modulo} y={soporte} width={b.ancho * modulo} height={alto} className="fill-texto" />
      ))}
      {mostrarNumero && (
        <text x={ancho / 2} y={alto + soporte * 2 + 13} textAnchor="middle" className="fill-texto font-mono" fontSize={12} letterSpacing={1}>
          {valor}
        </text>
      )}
    </svg>
  )
}
