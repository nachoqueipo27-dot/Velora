import { Document, Page, View, Text } from '@react-pdf/renderer'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { estilosPDF as s, C } from '../estilos'
import type { LineaReclamo } from '../../recepcion/reclamo'

// Reclamo al proveedor por una recepción: encabezado del negocio, número de recepción y una
// línea por diferencia. Mismo contenido que el texto de WhatsApp.

const TITULO: Record<LineaReclamo['tipo'], string> = {
  falta: 'Faltante', demas: 'De más', no_pedido: 'No pedido', danado: 'Dañado', vencido: 'Vencido', precio: 'Precio',
}

export const PDFReclamo = ({ negocio, numero, proveedor, orden, fecha, lineas }: {
  negocio: DatosNegocio; numero: string; proveedor: string; orden: string | null; fecha: string; lineas: LineaReclamo[]
}) => (
  <Document title={`Reclamo ${numero}`}>
    <Page size="A4" style={s.pagina}>
      <Encabezado negocio={negocio} titulo="RECLAMO AL PROVEEDOR" numero={numero} />
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 11, marginBottom: 2 }}>Para: {proveedor}</Text>
        <Text style={{ fontSize: 9, color: C.suave }}>Entrega del {fecha}{orden ? ` · ${orden}` : ''}</Text>
      </View>
      <Text style={{ fontSize: 10, marginBottom: 8 }}>En la entrega notamos lo siguiente:</Text>
      {lineas.map((l, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 8, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: C.borde }}>
          <Text style={{ width: 70, fontSize: 8, color: C.suave, textTransform: 'uppercase' }}>{TITULO[l.tipo]}</Text>
          <Text style={{ flex: 1, fontSize: 10 }}>{l.texto}</Text>
        </View>
      ))}
      <Text style={{ fontSize: 9, color: C.suave, marginTop: 16 }}>Por favor, confirmanos cómo seguimos con estas diferencias. ¡Gracias!</Text>
    </Page>
  </Document>
)
