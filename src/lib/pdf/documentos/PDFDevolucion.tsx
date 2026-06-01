import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { Devolucion } from '../../../types/devoluciones'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface Props {
  devolucion: Devolucion
  negocio: DatosNegocio
}

export const PDFDevolucion = ({ devolucion: d, negocio }: Props) => {
  const fecha = format(new Date(d.fecha), 'dd/MM/yyyy HH:mm')
  const origen = d.tipo === 'ot'
    ? (d.otId != null ? `Orden de Trabajo` : 'Orden de Trabajo')
    : `Venta POS`

  return (
    <Document>
      <Page size="A4" style={s.pagina}>
        <Encabezado negocio={negocio} titulo="DOCUMENTO DE DEVOLUCIÓN" numero={`#${String(d.numero).padStart(3, '0')}`} />

        <View style={s.seccion}>
          <Text style={s.labelSeccion}>Cliente</Text>
          <Text style={s.datoFuerte}>{d.clienteNombre || 'Sin cliente'}</Text>
          <Text style={[s.dato, { color: '#606060' }]}>Origen: {origen}</Text>
        </View>

        {/* Tabla de items devueltos */}
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Producto</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Cant.</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>P. unit.</Text>
          <Text style={[s.colSubtotal, s.tablaHeaderTexto]}>Subtotal</Text>
        </View>
        {d.items.map((it, i) => (
          <View key={it.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{it.nombre}</Text>
            <Text style={s.colCantidad}>{it.cantidadDevuelta}</Text>
            <Text style={s.colPrecio}>{money(it.precioUnitario)}</Text>
            <Text style={s.colSubtotal}>{money(it.subtotalDevuelto)}</Text>
          </View>
        ))}

        <View style={s.totalesBox}>
          <View style={[s.filaTotal, { marginTop: 4 }]}>
            <Text style={s.totalFinalLabel}>Total devuelto</Text>
            <Text style={s.totalFinalValor}>{money(d.totalDevuelto)}</Text>
          </View>
        </View>

        <View style={[s.seccion, { marginTop: 20 }]}>
          <Text style={s.labelSeccion}>Motivo</Text>
          <Text style={s.dato}>{d.motivo}</Text>
          {d.observacion ? <Text style={[s.dato, { color: '#606060' }]}>{d.observacion}</Text> : null}
        </View>

        <Text style={[s.dato, { color: '#606060', marginTop: 8 }]}>Procesado por: {d.procesadoPor}</Text>

        <PiePagina negocio={negocio} fecha={fecha} />
      </Page>
    </Document>
  )
}
