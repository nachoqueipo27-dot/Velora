import { Document, Page, Text, View } from '@react-pdf/renderer'
import { estilosPDF as s } from '../estilos'
import { Encabezado, type DatosNegocio } from '../componentes/Encabezado'
import { PiePagina } from '../componentes/PiePagina'
import type {
  AusenciaPorTipo, AusenciaResumen, EmpleadoHoras, EmpleadoMinutosExtra, ExtraPorTipo, FichajeResumen,
} from '../../../store/reporteRRHHStore'
import { TIPOS_AUSENCIA } from '../../../types/empleados'
import { format } from 'date-fns'

const LABEL_AUSENCIA = Object.fromEntries(TIPOS_AUSENCIA.map(t => [t.value, t.label]))

const horas = (n: number) => `${n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h`
const minutos = (m: number) => {
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return h > 0 ? `${h}h ${r}m` : `${r}m`
}

interface Props {
  negocio: DatosNegocio
  desde: string
  hasta: string
  totalHorasTrabajadas: number
  rankingHoras: EmpleadoHoras[]
  totalMinutosExtra: number
  extrasPorTipo: ExtraPorTipo[]
  rankingExtras: EmpleadoMinutosExtra[]
  totalAusencias: number
  ausenciasPorTipo: AusenciaPorTipo[]
  ausencias: AusenciaResumen[]
  fichajes: FichajeResumen[]
  fecha: string
}

export const PDFReporteRRHH = ({
  negocio, desde, hasta, totalHorasTrabajadas, rankingHoras,
  totalMinutosExtra, extrasPorTipo, rankingExtras,
  totalAusencias, ausenciasPorTipo, ausencias, fichajes, fecha,
}: Props) => (
  <Document>
    <Page size="A4" style={s.pagina}>
      <Encabezado
        negocio={negocio}
        titulo="REPORTE DE RECURSOS HUMANOS"
        numero={`${format(new Date(desde), 'dd/MM/yyyy')} — ${format(new Date(hasta), 'dd/MM/yyyy')}`}
      />

      <View style={s.totalesBox}>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Horas extra</Text>
          <Text style={s.totalValor}>{minutos(totalMinutosExtra)}</Text>
        </View>
        <View style={s.filaTotal}>
          <Text style={s.totalLabel}>Ausencias</Text>
          <Text style={s.totalValor}>{totalAusencias}</Text>
        </View>
        <View style={[s.filaTotal, { marginTop: 4 }]}>
          <Text style={s.totalFinalLabel}>Horas trabajadas</Text>
          <Text style={s.totalFinalValor}>{horas(totalHorasTrabajadas)}</Text>
        </View>
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Ranking de horas trabajadas</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Empleado</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Horas</Text>
        </View>
        {rankingHoras.map((r, i) => (
          <View key={r.empleadoId} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{r.empleadoNombre}</Text>
            <Text style={s.colPrecio}>{horas(r.horas)}</Text>
          </View>
        ))}
        {rankingHoras.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin fichajes en el período</Text>}
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Horas extra por tipo</Text>
        <View style={s.fila}>
          {extrasPorTipo.map(t => (
            <Text key={t.tipo} style={s.dato}>{t.label}: {minutos(t.minutos)}</Text>
          ))}
        </View>
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Ranking de horas extra</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Empleado</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Extra</Text>
        </View>
        {rankingExtras.map((r, i) => (
          <View key={r.empleadoId} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{r.empleadoNombre}</Text>
            <Text style={s.colPrecio}>{minutos(r.minutos)}</Text>
          </View>
        ))}
        {rankingExtras.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin horas extra en el período</Text>}
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Ausencias por tipo</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Tipo</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Cantidad</Text>
        </View>
        {ausenciasPorTipo.map((t, i) => (
          <View key={t.tipo} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{t.label}</Text>
            <Text style={s.colCantidad}>{t.cantidad}</Text>
          </View>
        ))}
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Detalle de ausencias ({ausencias.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Empleado</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Tipo</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Desde</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Hasta</Text>
        </View>
        {ausencias.map((a, i) => (
          <View key={a.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{a.empleadoNombre}</Text>
            <Text style={s.colNombre}>{LABEL_AUSENCIA[a.tipo] ?? a.tipo}</Text>
            <Text style={s.colNombre}>{format(new Date(a.fechaInicio), 'dd/MM/yyyy')}</Text>
            <Text style={s.colNombre}>{format(new Date(a.fechaFin), 'dd/MM/yyyy')}</Text>
          </View>
        ))}
        {ausencias.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin ausencias en el período</Text>}
      </View>

      <View style={[s.seccion, { marginTop: 12 }]}>
        <Text style={s.labelSeccion}>Detalle de fichajes ({fichajes.length})</Text>
        <View style={s.tablaHeader}>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Fecha</Text>
          <Text style={[s.colNombre, s.tablaHeaderTexto]}>Empleado</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Entrada</Text>
          <Text style={[s.colCantidad, s.tablaHeaderTexto]}>Salida</Text>
          <Text style={[s.colPrecio, s.tablaHeaderTexto]}>Horas</Text>
        </View>
        {fichajes.map((f, i) => (
          <View key={f.id} style={i % 2 === 1 ? [s.tablaFila, s.tablaFilaAlt] : s.tablaFila}>
            <Text style={s.colNombre}>{format(new Date(f.fecha), 'dd/MM/yyyy')}</Text>
            <Text style={s.colNombre}>{f.empleadoNombre}</Text>
            <Text style={s.colCantidad}>{f.entrada ?? '—'}</Text>
            <Text style={s.colCantidad}>{f.salida ?? '—'}</Text>
            <Text style={s.colPrecio}>{f.horasTrabajadas != null ? horas(f.horasTrabajadas) : '—'}</Text>
          </View>
        ))}
        {fichajes.length === 0 && <Text style={[s.dato, { color: '#888888', marginTop: 4 }]}>Sin fichajes en el período</Text>}
      </View>

      <PiePagina negocio={negocio} fecha={fecha} />
    </Page>
  </Document>
)
