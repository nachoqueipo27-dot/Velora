import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { CobroCaja } from '../../../types/caja'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const FORMA_LABEL: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' }

interface Props {
  cobro: CobroCaja
  negocio: DatosNegocio
  otNumero?: number
  clienteNombre?: string
}

export const PDFRecibo = ({ cobro, negocio, otNumero, clienteNombre }: Props) => {
  const fecha = format(new Date(cobro.fecha), 'dd/MM/yyyy HH:mm')

  return (
    <Document>
      <Page size="A4" style={s.pagina}>
        <Encabezado negocio={negocio} titulo="RECIBO DE PAGO" numero={`#${String(cobro.id).padStart(3, '0')}`} />

        {clienteNombre ? (
          <View style={s.seccion}>
            <Text style={s.labelSeccion}>Cliente</Text>
            <Text style={s.datoFuerte}>{clienteNombre}</Text>
          </View>
        ) : null}

        <View style={s.cajaResumen}>
          <View style={s.fila}>
            <Text style={[s.dato, { color: '#606060' }]}>Concepto</Text>
            <Text style={s.dato}>{cobro.concepto || 'Pago'}</Text>
          </View>
          <View style={s.fila}>
            <Text style={[s.dato, { color: '#606060' }]}>Forma de pago</Text>
            <Text style={s.dato}>{FORMA_LABEL[cobro.formaPago] ?? cobro.formaPago}</Text>
          </View>
          {otNumero != null ? (
            <View style={s.fila}>
              <Text style={[s.dato, { color: '#606060' }]}>OT asociada</Text>
              <Text style={s.dato}>#{String(otNumero).padStart(3, '0')}</Text>
            </View>
          ) : null}
          <View style={s.fila}>
            <Text style={[s.dato, { color: '#606060' }]}>Fecha</Text>
            <Text style={s.dato}>{fecha}</Text>
          </View>
        </View>

        <View style={[s.seccion, { alignItems: 'center', marginTop: 16 }]}>
          <Text style={s.labelSeccion}>Total recibido</Text>
          <Text style={s.montoGrande}>{money(cobro.monto)}</Text>
        </View>

        <Text style={[s.dato, { textAlign: 'center', color: '#606060', marginTop: 16 }]}>
          Se recibió conforme el pago detallado.
        </Text>

        <PiePagina negocio={negocio} fecha={fecha} />
      </Page>
    </Document>
  )
}
