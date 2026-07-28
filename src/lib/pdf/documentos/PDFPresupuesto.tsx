import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { Presupuesto, ItemPresupuesto } from '../../../types/presupuestos'
import { UNIDADES_MEDIDA } from '../../../types/inventario'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
const LABEL_UNIDAD: Record<string, string> = Object.fromEntries(UNIDADES_MEDIDA.map(u => [u.value, u.label]))

interface Props {
  presupuesto: Presupuesto
  items: ItemPresupuesto[]
  negocio: DatosNegocio
}

export const PDFPresupuesto = ({ presupuesto: p, items, negocio }: Props) => {
  const vigencia = p.fechaVigencia ? format(new Date(p.fechaVigencia), 'dd/MM/yyyy') : '—'
  const hoy = format(new Date(), 'dd/MM/yyyy')

  return (
    <Document>
      <Page size="A4" style={s.pagina}>
        <Encabezado negocio={negocio} titulo="PRESUPUESTO" numero={`#${String(p.numero).padStart(3, '0')}`} />

        <View style={s.seccion}>
          <Text style={s.labelSeccion}>Cliente</Text>
          <Text style={s.datoFuerte}>{p.clienteNombre || 'Sin cliente'}</Text>
          <Text style={[s.dato, { color: '#606060' }]}>Válido hasta el {vigencia}</Text>
        </View>

        {p.descripcion ? <Text style={[s.dato, { marginBottom: 12 }]}>{p.descripcion}</Text> : null}

        {/* Tabla de items */}
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Producto</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Cant.</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>P. unit.</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Desc.</Text>
          <Text style={[s.colSubtotal, s.tablaHeaderTexto]}>Subtotal</Text>
        </View>
        {items.map((it, i) => (
          <View key={it.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{it.nombre}</Text>
            <Text style={s.colCantidad}>{it.cantidad} {LABEL_UNIDAD[it.unidadMedida] ?? ''}</Text>
            <Text style={s.colPrecio}>{money(it.precioUnitario)}</Text>
            <Text style={s.colPrecio}>{it.descuentoItem ? money(it.descuentoItem) : '—'}</Text>
            <Text style={s.colSubtotal}>{money(it.subtotal)}</Text>
          </View>
        ))}

        {/* Totales */}
        <View style={s.totalesBox}>
          <View style={s.filaTotal}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValor}>{money(p.subtotal)}</Text>
          </View>
          {p.descuento > 0 && (
            <View style={s.filaTotal}>
              <Text style={s.totalLabel}>Descuento</Text>
              <Text style={s.totalValor}>
                - {p.tipoDescuento === 'porcentaje' ? `${p.descuento}%` : money(p.descuento)}
              </Text>
            </View>
          )}
          <View style={[s.filaTotal, { marginTop: 4 }]}>
            <Text style={s.totalFinalLabel}>Total final</Text>
            <Text style={s.totalFinalValor}>{money(p.totalFinal)}</Text>
          </View>
        </View>

        <View style={[s.seccion, { marginTop: 24 }]}>
          <Text style={[s.dato, { color: '#888888', fontSize: 9 }]}>
            Este presupuesto tiene validez hasta el {vigencia}. Precios sujetos a modificación sin previo aviso.
          </Text>
        </View>

        <PiePagina negocio={negocio} fecha={hoy} />
      </Page>
    </Document>
  )
}
