import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type { AvanceMesResumen, CierreCajaResumen, CierreMesResumen, GastoOperativoResumen, GastoPorCategoria } from '../../../store/reporteCajaFinanzasStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

interface Props {
  negocio: DatosNegocio
  desde: string
  hasta: string
  totalCobrado: number
  totalGastos: number
  balanceNeto: number
  cantidadCierres: number
  gastosPorCategoria: GastoPorCategoria[]
  cierres: CierreCajaResumen[]
  gastos: GastoOperativoResumen[]
  cierreMes: CierreMesResumen | null
  avanceMes: AvanceMesResumen | null
  fecha: string
}

export const PDFReporteCajaFinanzas = ({
  negocio, desde, hasta, totalCobrado, totalGastos, balanceNeto, cantidadCierres,
  gastosPorCategoria, cierres, gastos, cierreMes, avanceMes, fecha,
}: Props) => (
  <Document>
    <Page size="A4" style={s.pagina}>
      <Encabezado
        negocio={negocio}
        titulo="REPORTE DE CAJA Y FINANZAS"
        numero={`${format(new Date(desde), 'dd/MM/yyyy')} — ${format(new Date(hasta), 'dd/MM/yyyy')}`}
      />

      <View style={s.totalesBox}>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Total cobrado</Text>
          <Text style={s.totalValor}>{money(totalCobrado)}</Text>
        </View>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Gastos operativos</Text>
          <Text style={s.totalValor}>- {money(totalGastos)}</Text>
        </View>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Cierres de caja</Text>
          <Text style={s.totalValor}>{cantidadCierres}</Text>
        </View>
        <View style={[s.filaTotal, { marginTop: 4 }]}>
          <Text style={s.totalFinalLabel}>Balance neto</Text>
          <Text style={s.totalFinalValor}>{money(balanceNeto)}</Text>
        </View>
      </View>

      {cierreMes && (
        <View style={[s.cajaResumen, { marginTop: 12 }]}>
          <Text style={s.labelSeccion}>
            Cierre de mes (oficial) — {format(new Date(cierreMes.anio, cierreMes.mes - 1, 1), 'MMMM yyyy', { locale: es })}
          </Text>
          <View style={s.fila}>
            <Text style={s.dato}>Ingresos: {money(cierreMes.totalIngresos)}</Text>
            <Text style={s.dato}>Gastos: {money(cierreMes.totalGastos)}</Text>
            <Text style={s.dato}>Margen: {money(cierreMes.margenOperativo)}</Text>
          </View>
          <Text style={[s.dato, { color: '#606060' }]}>Cerrado por {cierreMes.cerradoPor}</Text>
        </View>
      )}

      {!cierreMes && avanceMes && (
        <View style={[s.cajaResumen, { marginTop: 12 }]}>
          <Text style={s.labelSeccion}>
            Mes en curso (avance parcial) — {format(new Date(avanceMes.anio, avanceMes.mes - 1, 1), 'MMMM yyyy', { locale: es })}
          </Text>
          <View style={s.fila}>
            <Text style={s.dato}>Ingresos: {money(avanceMes.totalIngresos)}</Text>
            <Text style={s.dato}>Gastos: {money(avanceMes.totalGastos)}</Text>
            <Text style={s.dato}>Margen: {money(avanceMes.margenOperativo)}</Text>
          </View>
          <Text style={[s.dato, { color: '#606060' }]}>El mes todavía no se cerró — datos parciales hasta la fecha del reporte</Text>
        </View>
      )}

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Gastos por categoría</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Categoría</Text>
          <Text style={[s.colSubtotal, s.tablaHeaderTexto]}>Monto</Text>
        </View>
        {gastosPorCategoria.map((g, i) => (
          <View key={g.categoria} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{g.categoria}</Text>
            <Text style={s.colSubtotal}>{money(g.monto)}</Text>
          </View>
        ))}
        {gastosPorCategoria.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin gastos en el período</Text>}
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Cierres de caja ({cierres.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Fecha</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Cobrado</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Gastos</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Balance</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Cerrado por</Text>
        </View>
        {cierres.map((c, i) => (
          <View key={c.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{format(new Date(c.fecha), 'dd/MM/yyyy')}</Text>
            <Text style={s.colPrecio}>{money(c.totalIngresos)}</Text>
            <Text style={s.colPrecio}>{money(c.totalGastos)}</Text>
            <Text style={s.colPrecio}>{money(c.saldoNeto)}</Text>
            <Text style={s.colNombre}>{c.cerradoPor}</Text>
          </View>
        ))}
        {cierres.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin cierres en el período</Text>}
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Gastos operativos ({gastos.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Fecha</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Categoría</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Monto</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Descripción</Text>
        </View>
        {gastos.map((g, i) => (
          <View key={g.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{format(new Date(g.fecha), 'dd/MM/yyyy')}</Text>
            <Text style={s.colNombre}>{g.categoria}</Text>
            <Text style={s.colPrecio}>{money(g.monto)}</Text>
            <Text style={s.colNombre}>{g.descripcion ?? '—'}</Text>
          </View>
        ))}
        {gastos.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin gastos en el período</Text>}
      </View>

      <PiePagina negocio={negocio} fecha={fecha} />
    </Page>
  </Document>
)
