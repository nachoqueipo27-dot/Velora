import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { MovimientoStockResumen } from '../../../store/reporteInventarioStore'
import { UNIDADES_MEDIDA } from '../../../types/inventario'
import { format } from 'date-fns'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

const TIPO_LABEL: Record<string, string> = { entrada: 'Entrada', salida: 'Salida', ajuste: 'Ajuste' }
const LABEL_UNIDAD: Record<string, string> = Object.fromEntries(UNIDADES_MEDIDA.map(u => [u.value, u.label]))

interface Props {
  negocio: DatosNegocio
  desde: string
  hasta: string
  productosStockCritico: number
  valorizacionInventario: number
  productosStockEstancado: number
  movimientosEntrada: number
  movimientosSalida: number
  movimientos: MovimientoStockResumen[]
  fecha: string
}

export const PDFReporteInventario = ({
  negocio, desde, hasta, productosStockCritico, valorizacionInventario, productosStockEstancado,
  movimientosEntrada, movimientosSalida, movimientos, fecha,
}: Props) => (
  <Document>
    <Page size="A4" style={s.pagina}>
      <Encabezado
        negocio={negocio}
        titulo="REPORTE DE INVENTARIO Y STOCK"
        numero={`${format(new Date(desde), 'dd/MM/yyyy')} — ${format(new Date(hasta), 'dd/MM/yyyy')}`}
      />

      <View style={s.seccion}>
        <Text style={s.labelSeccion}>Estado actual (al momento del reporte)</Text>
        <View style={s.totalesBox}>
          <View style={s.filaTotal}>
            <Text style={s.totalLabel}>Productos con stock crítico</Text>
            <Text style={s.totalValor}>{productosStockCritico}</Text>
          </View>
          <View style={s.filaTotal}>
            <Text style={s.totalLabel}>Sin movimiento en 90 días</Text>
            <Text style={s.totalValor}>{productosStockEstancado}</Text>
          </View>
          <View style={[s.filaTotal, { marginTop: 4 }]}>
            <Text style={s.totalFinalLabel}>Valorización (a costo)</Text>
            <Text style={s.totalFinalValor}>{money(valorizacionInventario)}</Text>
          </View>
        </View>
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Movimientos del período</Text>
        <View style={s.fila}>
          <Text style={s.dato}>Entradas: {movimientosEntrada}</Text>
          <Text style={s.dato}>Salidas: {movimientosSalida}</Text>
        </View>
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Detalle de movimientos ({movimientos.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Fecha</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Producto</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Tipo</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Cant.</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Motivo</Text>
        </View>
        {movimientos.map((m, i) => (
          <View key={m.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{format(new Date(m.fecha), 'dd/MM/yyyy')}</Text>
            <Text style={s.colNombre}>{m.productoNombre}</Text>
            <Text style={s.colCantidad}>{TIPO_LABEL[m.tipo] ?? m.tipo}</Text>
            <Text style={s.colCantidad}>{m.cantidad} {LABEL_UNIDAD[m.unidadMedida] ?? ''}</Text>
            <Text style={s.colNombre}>{m.motivo ?? '—'}</Text>
          </View>
        ))}
        {movimientos.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin movimientos en el período</Text>}
      </View>

      <PiePagina negocio={negocio} fecha={fecha} />
    </Page>
  </Document>
)
