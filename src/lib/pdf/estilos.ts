import { StyleSheet } from '@react-pdf/renderer'

// NOTA: Las fuentes Plus Jakarta Sans (.ttf) no están disponibles en /public/fonts,
// por lo que usamos Helvetica (incluida por defecto en react-pdf) como fallback.
// Cuando se agreguen los .ttf se puede registrar la familia con Font.register.
export const FUENTE = 'Helvetica'

// Paleta del documento (clara — los PDFs siempre se imprimen en blanco)
export const C = {
  texto: '#0A0A0A',
  suave: '#606060',
  tenue: '#888888',
  borde: '#E4E4E4',
  bordeTenue: '#F4F4F4',
  fondoAlt: '#FAFAFA',
  success: '#2E7D52',
  warning: '#B57614',
  error: '#A62E22',
  info: '#3A6585',
}

export const estilosPDF = StyleSheet.create({
  pagina: {
    fontFamily: FUENTE,
    fontSize: 10,
    padding: 40,
    paddingBottom: 64,
    backgroundColor: '#FFFFFF',
    color: C.texto,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borde,
  },
  encabezadoIzq: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  encabezadoDer: { alignItems: 'flex-end' },
  logo: { width: 52, height: 52, objectFit: 'contain' },
  logoPlaceholder: {
    width: 52, height: 52, borderRadius: 8,
    backgroundColor: '#0A0A0A', color: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    fontSize: 20, fontWeight: 700,
  },
  nombreNegocio: { fontSize: 15, fontWeight: 700, color: C.texto },
  subtituloNegocio: { fontSize: 9, color: C.tenue, marginTop: 2 },
  tituloPDF: { fontSize: 17, fontWeight: 700, marginBottom: 2, textAlign: 'right' },
  numeroPDF: { fontSize: 11, color: C.suave, textAlign: 'right' },

  seccion: { marginBottom: 16 },
  labelSeccion: {
    fontSize: 8, fontWeight: 700, color: C.tenue,
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6,
  },

  // Filas de datos (cliente, producto)
  fila: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  dato: { fontSize: 10, color: C.texto, marginBottom: 2 },
  datoFuerte: { fontSize: 11, fontWeight: 700, color: C.texto, marginBottom: 2 },

  // Tabla
  tablaHeader: {
    flexDirection: 'row', backgroundColor: C.bordeTenue,
    paddingVertical: 6, paddingHorizontal: 8, borderRadius: 4, marginBottom: 2,
  },
  tablaHeaderTexto: { fontSize: 8, fontWeight: 700, color: C.suave, textTransform: 'uppercase', letterSpacing: 0.5 },
  tablaFila: {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: C.bordeTenue,
  },
  tablaFilaAlt: { backgroundColor: C.fondoAlt },
  colNombre: { flex: 3, fontSize: 9 },
  colCantidad: { flex: 1, textAlign: 'center', fontSize: 9 },
  colPrecio: { flex: 1.5, textAlign: 'right', fontSize: 9 },
  colSubtotal: { flex: 1.5, textAlign: 'right', fontSize: 9 },

  // Totales
  totalesBox: { marginTop: 12, alignItems: 'flex-end' },
  filaTotal: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  totalLabel: { fontSize: 9, color: C.suave, width: 110, textAlign: 'right' },
  totalValor: { fontSize: 9, width: 90, textAlign: 'right' },
  totalFinalLabel: { fontSize: 12, fontWeight: 700, width: 110, textAlign: 'right' },
  totalFinalValor: { fontSize: 12, fontWeight: 700, width: 90, textAlign: 'right' },

  // Destacado (monto grande)
  montoGrande: { fontSize: 26, fontWeight: 700, color: C.texto },

  separador: { borderBottomWidth: 1, borderBottomColor: C.borde, marginVertical: 12 },

  piePagina: {
    position: 'absolute', bottom: 30, left: 40, right: 40,
    textAlign: 'center', fontSize: 8, color: '#A0A0A0',
    borderTopWidth: 1, borderTopColor: C.borde, paddingTop: 8,
  },

  badgeEstado: {
    paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4,
    fontSize: 9, fontWeight: 700, alignSelf: 'flex-start',
  },

  // Firma (remito)
  firmaBox: { marginTop: 40 },
  firmaLinea: { borderBottomWidth: 1, borderBottomColor: C.texto, width: 240, marginTop: 28, marginBottom: 4 },
  firmaLabel: { fontSize: 8, color: C.suave },

  // Caja de resumen (recibo / cierre)
  cajaResumen: {
    borderWidth: 1, borderColor: C.borde, borderRadius: 6, padding: 14, marginBottom: 12,
  },
})

// Colores de badge por estado de OT / presupuesto
export const colorEstado = (estado: string): { bg: string; color: string } => {
  switch (estado) {
    case 'recepcion':  return { bg: '#E8F0F5', color: C.info }
    case 'en_proceso': return { bg: '#FBF1DF', color: C.warning }
    case 'finalizado':
    case 'aprobado':   return { bg: '#E4F2EA', color: C.success }
    case 'entregado':
    case 'convertido': return { bg: '#EFEFEF', color: C.suave }
    case 'cancelado':
    case 'rechazado':  return { bg: '#F7E4E2', color: C.error }
    default:           return { bg: C.bordeTenue, color: C.suave }
  }
}
