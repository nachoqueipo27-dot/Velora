import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s, colorEstado } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import { ESTADOS_OT, type OrdenTrabajo } from '../../../types/ordenesTrabajo'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface Props {
  ot: OrdenTrabajo
  negocio: DatosNegocio
  fecha: string
}

export const PDFOrdenTrabajo = ({ ot, negocio, fecha }: Props) => {
  const estadoLabel = ESTADOS_OT.find(e => e.value === ot.estado)?.label ?? ot.estado
  const badge = colorEstado(ot.estado)
  const conDescuento = ot.descuento > 0

  return (
    <Document>
      <Page size="A4" style={s.pagina}>
        <Encabezado negocio={negocio} titulo="ORDEN DE TRABAJO" numero={`#${String(ot.numero).padStart(3, '0')}`} />

        <View style={[s.badgeEstado, { backgroundColor: badge.bg, color: badge.color, marginBottom: 16 }]}>
          <Text>{estadoLabel.toUpperCase()}</Text>
        </View>

        <View style={s.seccion}>
          <Text style={s.labelSeccion}>Cliente</Text>
          <Text style={s.datoFuerte}>{ot.clienteNombre || 'Sin cliente'}</Text>
          {ot.empleadoNombre ? <Text style={s.dato}>Responsable: {ot.empleadoNombre}</Text> : null}
        </View>

        <View style={s.seccion}>
          <Text style={s.labelSeccion}>Producto / Servicio</Text>
          <Text style={s.datoFuerte}>{ot.productoNombre}</Text>
          <Text style={s.dato}>{ot.tipoItem === 'conjunto' ? 'Conjunto' : 'Simple'}</Text>
          {ot.descripcion ? <Text style={[s.dato, { color: '#606060' }]}>{ot.descripcion}</Text> : null}
        </View>

        <View style={s.totalesBox}>
          {conDescuento && (
            <>
              <View style={s.filaTotal}>
                <Text style={s.totalLabel}>Precio</Text>
                <Text style={s.totalValor}>{money(ot.precio)}</Text>
              </View>
              <View style={s.filaTotal}>
                <Text style={s.totalLabel}>Descuento</Text>
                <Text style={s.totalValor}>
                  - {ot.tipoDescuento === 'porcentaje' ? `${ot.descuento}%` : money(ot.descuento)}
                </Text>
              </View>
            </>
          )}
          <View style={[s.filaTotal, { marginTop: 4 }]}>
            <Text style={s.totalFinalLabel}>Total</Text>
            <Text style={s.totalFinalValor}>{money(ot.totalFinal)}</Text>
          </View>
        </View>

        {ot.garantiaVence ? (
          <View style={[s.seccion, { marginTop: 16 }]}>
            <Text style={s.labelSeccion}>Garantía</Text>
            <Text style={s.dato}>
              {ot.garantiaDias} días — vence el {format(new Date(ot.garantiaVence), 'dd/MM/yyyy')}
            </Text>
          </View>
        ) : null}

        {ot.estado === 'cancelado' && ot.motivoCancelacion ? (
          <View style={s.seccion}>
            <Text style={s.labelSeccion}>Cancelación</Text>
            <Text style={s.dato}>{ot.motivoCancelacion}</Text>
          </View>
        ) : null}

        <PiePagina negocio={negocio} fecha={fecha} />
      </Page>
    </Document>
  )
}
