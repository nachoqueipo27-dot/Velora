import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { OrdenTrabajo } from '../../../types/ordenesTrabajo'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface Props {
  ot: OrdenTrabajo
  negocio: DatosNegocio
  fecha: string
}

export const PDFRemito = ({ ot, negocio, fecha }: Props) => (
  <Document>
    <Page size="A4" style={s.pagina}>
      <Encabezado negocio={negocio} titulo="REMITO DE ENTREGA" numero={`#${String(ot.numero).padStart(3, '0')}`} />

      <View style={s.seccion}>
        <Text style={s.labelSeccion}>Cliente</Text>
        <Text style={s.datoFuerte}>{ot.clienteNombre || 'Sin cliente'}</Text>
      </View>

      {/* Detalle del ítem entregado */}
      <View style={s.tablaHeader}>
        <Text style={[s.colNombre, s.tablaHeaderTexto]}>Producto entregado</Text>
        <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Cant.</Text>
        <Text style={[s.colSubtotal, s.tablaHeaderTexto]}>Valor</Text>
      </View>
      <View style={s.tablaFila}>
        <Text style={s.colNombre}>{ot.productoNombre}{ot.tipoItem === 'conjunto' ? '  (Conjunto)' : ''}</Text>
        <Text style={s.colCantidad}>1</Text>
        <Text style={s.colSubtotal}>{money(ot.totalFinal)}</Text>
      </View>

      <View style={[s.cajaResumen, { marginTop: 24 }]}>
        <Text style={s.dato}>
          Recibí de conformidad el/los producto/s detallados en el presente remito, en buen estado y a entera satisfacción.
        </Text>
        <View style={s.firmaBox}>
          <View style={s.firmaLinea} />
          <Text style={s.firmaLabel}>Firma y aclaración</Text>
        </View>
      </View>

      <Text style={[s.dato, { color: '#606060', marginTop: 16 }]}>Fecha y hora de entrega: {fecha}</Text>

      <PiePagina negocio={negocio} fecha={fecha} />
    </Page>
  </Document>
)
