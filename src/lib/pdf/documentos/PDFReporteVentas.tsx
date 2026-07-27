import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { ProductoTop, VentaResumen } from '../../../store/reporteVentasStore'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface Props {
  negocio: DatosNegocio
  desde: string
  hasta: string
  totalFacturado: number
  cantidadVentas: number
  ticketPromedio: number
  topPorCantidad: ProductoTop[]
  topPorFacturacion: ProductoTop[]
  ventas: VentaResumen[]
  fecha: string
}

const TablaTop = ({ titulo, items }: { titulo: string; items: ProductoTop[] }) => (
  <View style={[s.seccion, { marginTop: 12 }]}>
    <Text style={s.labelSeccion}>{titulo}</Text>
    <View style={s.tablaHeader}>
      <Text style={[s.colNombre, s.tablaHeaderTexto]}>Producto</Text>
      <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Cant.</Text>
      <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Facturación</Text>
    </View>
    {items.map((it, i) => (
      <View key={i} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
        <Text style={s.colNombre}>{it.productoNombre}</Text>
        <Text style={s.colCantidad}>{it.cantidad}</Text>
        <Text style={s.colPrecio}>{money(it.facturacion)}</Text>
      </View>
    ))}
    {items.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin datos en el período</Text>}
  </View>
)

export const PDFReporteVentas = ({
  negocio, desde, hasta, totalFacturado, cantidadVentas, ticketPromedio,
  topPorCantidad, topPorFacturacion, ventas, fecha,
}: Props) => (
  <Document>
    <Page size="A4" style={s.pagina}>
      <Encabezado
        negocio={negocio}
        titulo="REPORTE DE VENTAS"
        numero={`${format(new Date(desde), 'dd/MM/yyyy')} — ${format(new Date(hasta), 'dd/MM/yyyy')}`}
      />

      <View style={s.totalesBox}>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Ventas realizadas</Text>
          <Text style={s.totalValor}>{cantidadVentas}</Text>
        </View>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Ticket promedio</Text>
          <Text style={s.totalValor}>{money(ticketPromedio)}</Text>
        </View>
        <View style={[s.filaTotal, { marginTop: 4 }]}>
          <Text style={s.totalFinalLabel}>Total facturado</Text>
          <Text style={s.totalFinalValor}>{money(totalFacturado)}</Text>
        </View>
      </View>

      <TablaTop titulo="Top 5 — Más vendidos" items={topPorCantidad} />
      <TablaTop titulo="Top 5 — Mayor facturación" items={topPorFacturacion} />

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Detalle de ventas ({ventas.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>N°</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Fecha</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Ítems</Text>
          <Text style={[s.colSubtotal, s.tablaHeaderTexto]}>Total</Text>
        </View>
        {ventas.map((v, i) => (
          <View key={v.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>#{String(v.numero).padStart(3, '0')}</Text>
            <Text style={s.colNombre}>{format(new Date(v.fecha), 'dd/MM/yyyy HH:mm')}</Text>
            <Text style={s.colCantidad}>{v.cantidadItems}</Text>
            <Text style={s.colSubtotal}>{money(v.totalFinal)}</Text>
          </View>
        ))}
        {ventas.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin ventas en el período</Text>}
      </View>

      <PiePagina negocio={negocio} fecha={fecha} />
    </Page>
  </Document>
)
