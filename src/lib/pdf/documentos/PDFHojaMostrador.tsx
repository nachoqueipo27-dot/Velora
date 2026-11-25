import { Document, Page, View, Text } from '@react-pdf/renderer'
import { CodigoBarrasPDF } from '../componentes/CodigoBarrasPDF'
import { C, FUENTE } from '../estilos'
import { formatearPesos } from '../../dinero'
import { UNIDAD_ABREVIADA, permiteDecimales, type UnidadMedida } from '../../../types/inventario'
import { mm } from '../../etiquetas/plantillas'

// Hoja de mostrador: para lo que no se puede etiquetar (pan, fiambre suelto, verdura).
// A4 con nombre, precio y código grande de cada producto, para escanear desde el papel.

export interface ItemMostrador {
  productoId: number
  nombre: string
  codigo: string
  /** Centavos. */
  precio: number
  unidadMedida: UnidadMedida
}

const POR_HOJA = 10 // 2 columnas × 5 filas
const ANCHO_CELDA = mm(92)
const ALTO_CELDA = mm(52)

export const PDFHojaMostrador = ({ items, titulo, fecha }: { items: ItemMostrador[]; titulo: string; fecha: string }) => {
  const hojas: ItemMostrador[][] = []
  for (let i = 0; i < items.length; i += POR_HOJA) hojas.push(items.slice(i, i + POR_HOJA))
  return (
    <Document title="Hoja de mostrador">
      {hojas.map((hoja, h) => (
        <Page key={h} size="A4" style={{ fontFamily: FUENTE, padding: mm(10), backgroundColor: '#FFFFFF', color: C.texto }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: mm(4) }}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{titulo}</Text>
            <Text style={{ fontSize: 8, color: C.suave }}>Precios al {fecha} · hoja {h + 1} de {hojas.length}</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: mm(4) }}>
            {hoja.map(it => (
              <View key={it.productoId} wrap={false}
                style={{ width: ANCHO_CELDA, height: ALTO_CELDA, borderWidth: 0.6, borderColor: C.borde, borderRadius: 4, padding: mm(3), justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', maxLines: 2, textOverflow: 'ellipsis', flex: 1 }}>{it.nombre}</Text>
                  <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold' }}>
                    {formatearPesos(it.precio, { sinCentavosSiCero: true })}{permiteDecimales(it.unidadMedida) ? ` / ${UNIDAD_ABREVIADA[it.unidadMedida]}` : ''}
                  </Text>
                </View>
                <CodigoBarrasPDF valor={it.codigo} ancho={ANCHO_CELDA - mm(6)} alto={mm(26)} tamanoNumero={9} />
              </View>
            ))}
          </View>
        </Page>
      ))}
    </Document>
  )
}
