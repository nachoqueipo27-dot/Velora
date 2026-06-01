export type OnboardingPaso = 1 | 2 | 3 | 4

export interface Subfuncion {
  id: string
  label: string
}

export interface FuncionDisponible {
  id: string
  label: string
  subfunciones: Subfuncion[]
}

export const FUNCIONES_DISPONIBLES: FuncionDisponible[] = [
  {
    id: 'clientes',
    label: 'Clientes',
    subfunciones: [
      { id: 'clientes.historial', label: 'Historial de OTs' },
      { id: 'clientes.log', label: 'Log de comunicaciones' },
    ],
  },
  {
    id: 'empleados',
    label: 'Empleados',
    subfunciones: [
      { id: 'empleados.historial', label: 'Historial de OTs asignadas' },
      { id: 'empleados.metricas', label: 'Métricas de rendimiento' },
      { id: 'empleados.horario', label: 'Control horario' },
      { id: 'empleados.ausencias', label: 'Faltas y vacaciones' },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    subfunciones: [
      { id: 'inventario.simples', label: 'Productos simples' },
      { id: 'inventario.conjuntos', label: 'Conjuntos de productos' },
      { id: 'inventario.rotacion', label: 'Reporte de rotación' },
      { id: 'inventario.rentabilidad', label: 'Informe de rentabilidad' },
    ],
  },
  {
    id: 'proveedores',
    label: 'Proveedores y Compras',
    subfunciones: [
      { id: 'proveedores.registro', label: 'Registro de proveedores' },
      { id: 'proveedores.ordenes', label: 'Órdenes de compra' },
      { id: 'proveedores.recepcion', label: 'Recepción de mercadería' },
    ],
  },
  {
    id: 'lista-precios',
    label: 'Lista de Precios',
    subfunciones: [
      { id: 'lista-precios.actualizacion', label: 'Actualización por porcentaje' },
      { id: 'lista-precios.historial', label: 'Historial de listas' },
    ],
  },
  {
    id: 'presupuestos',
    label: 'Presupuestos',
    subfunciones: [],
  },
  {
    id: 'ordenes-trabajo',
    label: 'Órdenes de Trabajo',
    subfunciones: [
      { id: 'ot.recurrentes', label: 'OTs Recurrentes' },
      { id: 'ot.plantillas', label: 'Plantillas de OTs' },
      { id: 'ot.duplicar', label: 'Duplicar OT' },
      { id: 'ot.garantias', label: 'Gestión de Garantías' },
    ],
  },
  {
    id: 'agenda',
    label: 'Agenda',
    subfunciones: [],
  },
  {
    id: 'punto-venta',
    label: 'Punto de Venta',
    subfunciones: [],
  },
  {
    id: 'caja-diaria',
    label: 'Caja Diaria',
    subfunciones: [
      { id: 'caja.gastos', label: 'Gastos operativos' },
      { id: 'caja.cierre-mes', label: 'Cierre de mes' },
    ],
  },
  {
    id: 'devoluciones',
    label: 'Gestión de Devoluciones',
    subfunciones: [],
  },
  {
    id: 'pdfs',
    label: 'PDFs',
    subfunciones: [
      { id: 'pdfs.presupuesto', label: 'Presupuesto' },
      { id: 'pdfs.remito', label: 'Remito' },
      { id: 'pdfs.recibo', label: 'Recibo de pago' },
    ],
  },
  {
    id: 'codigos-barras',
    label: 'Códigos de Barras',
    subfunciones: [],
  },
]

// Todos los ids (módulos + subfunciones) — usado para "Activar todas" y default.
export const TODOS_LOS_IDS: string[] = FUNCIONES_DISPONIBLES.flatMap(f => [
  f.id,
  ...f.subfunciones.map(s => s.id),
])

// Props compartidas por cada paso del onboarding.
export interface PasoProps {
  onNext: () => void
  onBack?: () => void
}
