import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import { MESES, type CierreMes } from '../../../types/caja'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface Props {
  cierre: CierreMes
  negocio: DatosNegocio
}

export const PDFCierreMes = ({ cierre: c, negocio }: Props) => {
  const fecha = format(new Date(c.creadoEn), 'dd/MM/yyyy HH:mm')
  const totalOTs = c.otsCompletadas + c.otsCanceladas
  const tasaCancelacion = totalOTs > 0 ? Math.round((c.otsCanceladas / totalOTs) * 100) : 0

  const fila = (label: string, valor: string, fuerte = false) => (
    <View style={s.fila}>
      <Text style={[s.dato, { color: '#606060' }]}>{label}</Text>
      <Text style={fuerte ? s.datoFuerte : s.dato}>{valor}</Text>
    </View>
  )

  return (
    <Document>
      <Page size="A4" style={s.pagina}>
        <Encabezado negocio={negocio} titulo={`CIERRE DE MES`} numero={`${MESES[c.mes - 1]} ${c.anio}`} />

        <View style={s.seccion}>
          <Text style={s.labelSeccion}>Resumen financiero</Text>
          <View style={s.cajaResumen}>
            {fila('Ingresos totales', money(c.totalIngresos))}
            {fila('Gastos totales', money(c.totalGastos))}
            {fila('Margen operativo', money(c.margenOperativo), true)}
          </View>
        </View>

        <View style={s.seccion}>
          <Text style={s.labelSeccion}>Órdenes de trabajo</Text>
          <View style={s.cajaResumen}>
            {fila('Completadas', String(c.otsCompletadas))}
            {fila('Canceladas', String(c.otsCanceladas))}
            {fila('Tasa de cancelación', `${tasaCancelacion}%`)}
          </View>
        </View>

        <View style={s.seccion}>
          <Text style={s.labelSeccion}>Destacados</Text>
          <View style={s.cajaResumen}>
            {fila('Producto más vendido', c.productoMasVendido ?? '—')}
            {fila('Empleado destacado', c.empleadoDestacado ?? '—')}
          </View>
        </View>

        <Text style={[s.dato, { color: '#606060', marginTop: 8 }]}>Cerrado por: {c.cerradoPor}</Text>

        <PiePagina negocio={negocio} fecha={fecha} />
      </Page>
    </Document>
  )
}
