import { Document, Page, View, Text } from '@react-pdf/renderer'
import { CodigoBarrasPDF } from '../componentes/CodigoBarrasPDF'
import { C, FUENTE } from '../estilos'
import { formatearPesos } from '../../dinero'
import { UNIDAD_ABREVIADA, permiteDecimales, type UnidadMedida } from '../../../types/inventario'
import { A4, distribuirEnHojas, mm, posicionCelda, type PlantillaEtiqueta } from '../../etiquetas/plantillas'

// Etiquetas de productos: nombre (2 líneas máx.), código dibujado con su número y, opcional, precio.
// Rollo: una etiqueta por página del tamaño de la etiqueta. A4: grilla de la plantilla.

export interface EtiquetaPDF {
  productoId: number
  nombre: string
  codigo: string
  /** Centavos. */
  precio: number
  unidadMedida: UnidadMedida
  copias: number
}

/** Corta a dos líneas aproximadas (respaldo por si el visor no respeta maxLines). */
function cortarNombre(nombre: string, anchoPt: number, tamano: number): string {
  const porLinea = Math.max(8, Math.floor(anchoPt / (tamano * 0.5)))
  return nombre.length > porLinea * 2 ? nombre.slice(0, porLinea * 2 - 1).trimEnd() + '…' : nombre
}

/** Contenido de una etiqueta de `anchoMm` × `altoMm`. */
const Etiqueta = ({ e, anchoMm, altoMm, conPrecio }: { e: EtiquetaPDF; anchoMm: number; altoMm: number; conPrecio: boolean }) => {
  const pad = mm(altoMm < 25 ? 1.2 : 1.8)
  const ancho = mm(anchoMm) - pad * 2
  const alto = mm(altoMm) - pad * 2
  // Tamaños según el alto de la etiqueta (21 mm → 6 pt; 42 mm → 9 pt).
  const tamano = Math.min(9, Math.max(5.5, altoMm / 4.6))
  const altoNombre = tamano * 1.2 * 2
  const altoPrecio = conPrecio ? tamano * 1.9 : 0
  const altoNumero = tamano * 0.9 + 2
  const altoBarras = Math.max(mm(6), alto - altoNombre - altoPrecio - altoNumero - 2)
  const porUnidad = permiteDecimales(e.unidadMedida) ? ` / ${UNIDAD_ABREVIADA[e.unidadMedida]}` : ''

  return (
    <View style={{ width: mm(anchoMm), height: mm(altoMm), padding: pad, justifyContent: 'space-between' }}>
      <Text style={{ fontFamily: FUENTE, fontSize: tamano, lineHeight: 1.2, maxLines: 2, textOverflow: 'ellipsis', color: C.texto }}>
        {cortarNombre(e.nombre, ancho, tamano)}
      </Text>
      {conPrecio && (
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: tamano * 1.5, color: C.texto }}>
          {formatearPesos(e.precio, { sinCentavosSiCero: true })}{porUnidad}
        </Text>
      )}
      <CodigoBarrasPDF valor={e.codigo} ancho={ancho} alto={altoBarras} tamanoNumero={tamano * 0.9} />
    </View>
  )
}

/** Rollo: una página de 40 × 30 mm (o el tamaño de la plantilla) por copia. */
export const PDFEtiquetasRollo = ({ etiquetas, plantilla, conPrecio }: { etiquetas: EtiquetaPDF[]; plantilla: PlantillaEtiqueta; conPrecio: boolean }) => (
  <Document title="Etiquetas">
    {etiquetas.flatMap(e => Array.from({ length: e.copias }, (_, i) => (
      <Page key={`${e.productoId}-${i}`} size={[mm(plantilla.anchoMm), mm(plantilla.altoMm)]} style={{ backgroundColor: '#FFFFFF' }}>
        <Etiqueta e={e} anchoMm={plantilla.anchoMm} altoMm={plantilla.altoMm} conPrecio={conPrecio} />
      </Page>
    )))}
  </Document>
)

/** Hoja A4 autoadhesiva: grilla de la plantilla, desde la posición `inicio`. */
export const PDFEtiquetasA4 = ({ etiquetas, plantilla, conPrecio, inicio, filaNueva }: {
  etiquetas: EtiquetaPDF[]; plantilla: PlantillaEtiqueta; conPrecio: boolean; inicio: number; filaNueva: boolean
}) => {
  const { hojas } = distribuirEnHojas(etiquetas, plantilla, inicio, filaNueva)
  return (
    <Document title="Etiquetas A4">
      {hojas.map((celdas, h) => (
        <Page key={h} size={[mm(A4.anchoMm), mm(A4.altoMm)]} style={{ backgroundColor: '#FFFFFF', position: 'relative' }}>
          {celdas.map((c, i) => {
            if (!c) return null
            const { xMm, yMm } = posicionCelda(plantilla, i)
            return (
              <View key={i} style={{ position: 'absolute', left: mm(xMm), top: mm(yMm) }}>
                <Etiqueta e={c.item} anchoMm={plantilla.anchoMm} altoMm={plantilla.altoMm} conPrecio={conPrecio} />
              </View>
            )
          })}
        </Page>
      ))}
    </Document>
  )
}
