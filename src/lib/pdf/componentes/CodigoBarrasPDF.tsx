import { Svg, Rect, Text, View } from '@react-pdf/renderer'
import { barrasDe, codificar, type TipoBarras } from '../../barras'
import { C, FUENTE } from '../estilos'

interface CodigoBarrasPDFProps {
  valor: string
  tipo?: TipoBarras
  /** Ancho total disponible en puntos (incluye la zona silenciosa). */
  ancho: number
  /** Alto de las barras en puntos. */
  alto: number
  mostrarNumero?: boolean
  tamanoNumero?: number
}

/** Código de barras vectorial para @react-pdf (rectángulos): nítido en cualquier impresora. */
export const CodigoBarrasPDF = ({ valor, tipo, ancho, alto, mostrarNumero = true, tamanoNumero = 7 }: CodigoBarrasPDFProps) => {
  let dibujo
  try { dibujo = codificar(valor, tipo) } catch { dibujo = null }
  if (!dibujo) return <Text style={{ fontSize: tamanoNumero, color: C.error }}>{valor}</Text>

  const total = dibujo.modulos.length + dibujo.zonaSilenciosa * 2
  const modulo = ancho / total
  const soporte = dibujo.soporte ? Math.max(modulo * 2, 1) : 0
  const barras = barrasDe(dibujo.modulos)

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={ancho} height={alto + soporte * 2} viewBox={`0 0 ${ancho} ${alto + soporte * 2}`}>
        {dibujo.soporte && <Rect x={0} y={0} width={ancho} height={soporte} fill={C.texto} />}
        {dibujo.soporte && <Rect x={0} y={alto + soporte} width={ancho} height={soporte} fill={C.texto} />}
        {barras.map(b => (
          <Rect key={b.x} x={(b.x + dibujo.zonaSilenciosa) * modulo} y={soporte} width={b.ancho * modulo} height={alto} fill={C.texto} />
        ))}
      </Svg>
      {mostrarNumero && (
        <Text style={{ fontFamily: FUENTE, fontSize: tamanoNumero, letterSpacing: 0.6, marginTop: 1.5, color: C.texto }}>{valor}</Text>
      )}
    </View>
  )
}
