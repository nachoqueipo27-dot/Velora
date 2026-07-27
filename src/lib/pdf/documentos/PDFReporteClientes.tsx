import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { ClienteDetalle, ClienteInactivo, ClienteRanking } from '../../../store/reporteClientesStore'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface Props {
  negocio: DatosNegocio
  desde: string
  hasta: string
  clientesNuevos: number
  totalFacturado: number
  ranking: ClienteRanking[]
  inactivos: ClienteInactivo[]
  clientes: ClienteDetalle[]
  fecha: string
}

export const PDFReporteClientes = ({
  negocio, desde, hasta, clientesNuevos, totalFacturado, ranking, inactivos, clientes, fecha,
}: Props) => (
  <Document>
    <Page size="A4" style={s.pagina}>
      <Encabezado
        negocio={negocio}
        titulo="REPORTE DE CLIENTES"
        numero={`${format(new Date(desde), 'dd/MM/yyyy')} — ${format(new Date(hasta), 'dd/MM/yyyy')}`}
      />

      <View style={s.totalesBox}>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Clientes nuevos</Text>
          <Text style={s.totalValor}>{clientesNuevos}</Text>
        </View>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Clientes inactivos</Text>
          <Text style={s.totalValor}>{inactivos.length}</Text>
        </View>
        <View style={[s.filaTotal, { marginTop: 4 }]}>
          <Text style={s.totalFinalLabel}>Facturado</Text>
          <Text style={s.totalFinalValor}>{money(totalFacturado)}</Text>
        </View>
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Top 10 clientes por facturación</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Cliente</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Operac.</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Facturación</Text>
        </View>
        {ranking.map((r, i) => (
          <View key={r.clienteId} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{r.nombre}</Text>
            <Text style={s.colCantidad}>{r.operaciones}</Text>
            <Text style={s.colPrecio}>{money(r.facturacion)}</Text>
          </View>
        ))}
        {ranking.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin facturación en el período</Text>}
        <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>
          Incluye órdenes de trabajo finalizadas o entregadas y presupuestos convertidos sin OT asociada. Las ventas de mostrador no se incluyen porque no registran cliente.
        </Text>
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Clientes inactivos — sin operaciones en los últimos 90 días ({inactivos.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Cliente</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Teléfono</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Última operación</Text>
        </View>
        {inactivos.map((c, i) => (
          <View key={c.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{c.nombre}</Text>
            <Text style={s.colNombre}>{c.telefono ?? '—'}</Text>
            <Text style={s.colNombre}>{c.ultimaOperacion ? format(new Date(c.ultimaOperacion), 'dd/MM/yyyy') : 'Nunca'}</Text>
          </View>
        ))}
        {inactivos.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>No hay clientes inactivos</Text>}
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Detalle de clientes del período ({clientes.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Cliente</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Categoría</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Alta</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Facturación</Text>
        </View>
        {clientes.map((c, i) => (
          <View key={c.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{c.nombre}</Text>
            <Text style={s.colNombre}>{c.categoria ?? '—'}</Text>
            <Text style={s.colNombre}>{format(new Date(c.creadoEn), 'dd/MM/yyyy')}</Text>
            <Text style={s.colPrecio}>{money(c.facturacion)}</Text>
          </View>
        ))}
        {clientes.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin clientes en el período</Text>}
      </View>

      <PiePagina negocio={negocio} fecha={fecha} />
    </Page>
  </Document>
)
