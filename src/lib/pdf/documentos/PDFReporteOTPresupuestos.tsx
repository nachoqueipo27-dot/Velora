import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s, colorEstado } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { OTDetalleResumen, OTPorEstado } from '../../../store/reporteOTPresupuestosStore'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface Props {
  negocio: DatosNegocio
  desde: string
  hasta: string
  otsPorEstado: OTPorEstado[]
  otsCompletadas: number
  facturacionOTs: number
  presupuestosCreados: number
  presupuestosAprobados: number
  tasaAprobacion: number
  montoPresupuestado: number
  montoAprobado: number
  otsDetalle: OTDetalleResumen[]
  fecha: string
}

export const PDFReporteOTPresupuestos = ({
  negocio, desde, hasta, otsPorEstado, otsCompletadas, facturacionOTs,
  presupuestosCreados, presupuestosAprobados, tasaAprobacion, montoPresupuestado, montoAprobado,
  otsDetalle, fecha,
}: Props) => (
  <Document>
    <Page size="A4" style={s.pagina}>
      <Encabezado
        negocio={negocio}
        titulo="REPORTE DE ÓRDENES DE TRABAJO Y PRESUPUESTOS"
        numero={`${format(new Date(desde), 'dd/MM/yyyy')} — ${format(new Date(hasta), 'dd/MM/yyyy')}`}
      />

      <View style={s.seccion}>
        <Text style={s.labelSeccion}>Órdenes de trabajo del período</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Estado</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Cantidad</Text>
        </View>
        {otsPorEstado.map((e, i) => (
          <View key={e.estado} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{e.label}</Text>
            <Text style={s.colCantidad}>{e.cantidad}</Text>
          </View>
        ))}
        <View style={s.totalesBox}>
          <View style={s.filaTotal}>
            <Text style={s.totalLabel}>OTs completadas</Text>
            <Text style={s.totalValor}>{otsCompletadas}</Text>
          </View>
          <View style={[s.filaTotal, { marginTop: 4 }]}>
            <Text style={s.totalFinalLabel}>Facturación (completadas)</Text>
            <Text style={s.totalFinalValor}>{money(facturacionOTs)}</Text>
          </View>
        </View>
        <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>
          Tiempo promedio de cierre: no disponible — el schema no registra una fecha de cierre distinta de la fecha de creación.
        </Text>
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Presupuestos del período</Text>
        <View style={s.fila}>
          <Text style={s.dato}>Creados: {presupuestosCreados}</Text>
          <Text style={s.dato}>Aprobados: {presupuestosAprobados}</Text>
          <Text style={s.dato}>Tasa de aprobación: {tasaAprobacion}%</Text>
        </View>
        <View style={s.totalesBox}>
          <View style={s.filaTotal}>
            <Text style={s.totalLabel}>Monto presupuestado</Text>
            <Text style={s.totalValor}>{money(montoPresupuestado)}</Text>
          </View>
          <View style={[s.filaTotal, { marginTop: 4 }]}>
            <Text style={s.totalFinalLabel}>Monto aprobado</Text>
            <Text style={s.totalFinalValor}>{money(montoAprobado)}</Text>
          </View>
        </View>
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Detalle de órdenes de trabajo ({otsDetalle.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Fecha</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>N°</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Cliente</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Estado</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Monto</Text>
        </View>
        {otsDetalle.map((o, i) => {
          const ce = colorEstado(o.estado)
          return (
            <View key={o.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
              <Text style={s.colNombre}>{format(new Date(o.fecha), 'dd/MM/yyyy')}</Text>
              <Text style={s.colCantidad}>{String(o.numero).padStart(3, '0')}</Text>
              <Text style={s.colNombre}>{o.clienteNombre}</Text>
              <Text style={[s.colNombre, { color: ce.color }]}>{o.estado}</Text>
              <Text style={s.colPrecio}>{money(o.totalFinal)}</Text>
            </View>
          )
        })}
        {otsDetalle.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin órdenes de trabajo en el período</Text>}
      </View>

      <PiePagina negocio={negocio} fecha={fecha} />
    </Page>
  </Document>
)
