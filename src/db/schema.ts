import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ─── Columnas de sincronización con Supabase (Fase 2) ───────────
// Aditivas; presentes solo en las tablas que se sincronizan con la nube.
// Factory: genera builders frescos por tabla (evita reusar instancias en Drizzle).
const syncCols = () => ({
  syncStatus: text('sync_status').default('pendiente'), // 'pendiente'|'sincronizado'|'error'
  syncedAt:   text('synced_at'),   // timestamp de la última sync exitosa
  remoteId:   text('remote_id'),   // UUID asignado por Supabase
  deletedAt:  text('deleted_at'),  // soft delete para sync
})

// Schema base — se expandirá en cada paso de módulo
export const configuracion = sqliteTable('configuracion', {
  id:    integer('id').primaryKey(),
  clave: text('clave').notNull().unique(),
  valor: text('valor').notNull(),
})

export const clientes = sqliteTable('clientes', {
  ...syncCols(),
  id:            integer('id').primaryKey({ autoIncrement: true }),
  nombre:        text('nombre').notNull(),
  telefono:      text('telefono'),
  email:         text('email'),
  direccion:     text('direccion'),
  categoria:     text('categoria').default('General'),
  notas:         text('notas'),
  creadoEn:      text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
})

export const logComunicaciones = sqliteTable('log_comunicaciones', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  clienteId:   integer('cliente_id').notNull(),
  fecha:       text('fecha').notNull(),
  responsable: text('responsable').notNull(),
  resumen:     text('resumen').notNull(),
  creadoEn:    text('creado_en').notNull(),
})

// ─── Empleados, roles y permisos ───────────────────────────────

export const roles = sqliteTable('roles', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  nombre:   text('nombre').notNull().unique(),
  esAdmin:  integer('es_admin').default(0),
  creadoEn: text('creado_en').notNull(),
})

export const permisos = sqliteTable('permisos', {
  id:     integer('id').primaryKey({ autoIncrement: true }),
  rolId:  integer('rol_id').notNull(),
  modulo: text('modulo').notNull(),
  nivel:  text('nivel').notNull(), // 'sin_acceso' | 'solo_ver' | 'editar'
})

export const empleados = sqliteTable('empleados', {
  ...syncCols(),
  id:            integer('id').primaryKey({ autoIncrement: true }),
  nombre:        text('nombre').notNull(),
  rolId:         integer('rol_id').notNull(),
  password:      text('password').notNull(),
  avatar:        text('avatar'),
  activo:        integer('activo').default(1),
  tipoHorario:   text('tipo_horario').default('fijo'), // 'fijo' | 'turno'
  creadoEn:      text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
})

export const horariosFijos = sqliteTable('horarios_fijos', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  empleadoId: integer('empleado_id').notNull(),
  diaSemana:  integer('dia_semana').notNull(), // 0=Dom, 1=Lun...6=Sab
  entrada:    text('entrada'),   // '09:00' o null si no trabaja
  salida:     text('salida'),
  laborable:  integer('laborable').default(1),
})

export const turnos = sqliteTable('turnos', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  nombre:   text('nombre').notNull(),
  entrada:  text('entrada').notNull(),
  salida:   text('salida').notNull(),
  creadoEn: text('creado_en').notNull(),
})

export const asignacionTurnos = sqliteTable('asignacion_turnos', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  empleadoId: integer('empleado_id').notNull(),
  turnoId:    integer('turno_id').notNull(),
  desde:      text('desde').notNull(),
  hasta:      text('hasta'),
})

export const fichajes = sqliteTable('fichajes', {
  ...syncCols(),
  id:              integer('id').primaryKey({ autoIncrement: true }),
  empleadoId:      integer('empleado_id').notNull(),
  fecha:           text('fecha').notNull(),
  entrada:         text('entrada'),
  salida:          text('salida'),
  horasTrabajadas: real('horas_trabajadas'),
  editadoPor:      text('editado_por'),
  creadoEn:        text('creado_en').notNull(),
})

export const horasExtras = sqliteTable('horas_extras', {
  ...syncCols(),
  id:             integer('id').primaryKey({ autoIncrement: true }),
  empleadoId:     integer('empleado_id').notNull(),
  fecha:          text('fecha').notNull(),
  horarioVigente: text('horario_vigente').notNull(),
  horaSalidaReal: text('hora_salida_real').notNull(),
  minutosExtra:   integer('minutos_extra').notNull(),
  tipo:           text('tipo').notNull(), // 'comun' | 'nocturna' | 'feriado'
  observacion:    text('observacion'),
  registradoPor:  text('registrado_por').notNull(),
  creadoEn:       text('creado_en').notNull(),
})

export const ausencias = sqliteTable('ausencias', {
  ...syncCols(),
  id:              integer('id').primaryKey({ autoIncrement: true }),
  empleadoId:      integer('empleado_id').notNull(),
  tipo:            text('tipo').notNull(),
  fechaInicio:     text('fecha_inicio').notNull(),
  fechaFin:        text('fecha_fin').notNull(),
  horarioAfectado: text('horario_afectado').notNull(),
  observacion:     text('observacion').notNull(),
  comprobante:     text('comprobante'),
  creadoEn:        text('creado_en').notNull(),
})

// ─── Inventario ────────────────────────────────────────────────

export const categorias = sqliteTable('categorias', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  nombre:   text('nombre').notNull().unique(),
  creadoEn: text('creado_en').notNull(),
})

export const productos = sqliteTable('productos', {
  ...syncCols(),
  id:            integer('id').primaryKey({ autoIncrement: true }),
  nombre:        text('nombre').notNull(),
  tipo:          text('tipo').notNull(), // 'simple' | 'conjunto'
  descripcion:   text('descripcion'),
  categoriaId:   integer('categoria_id'),
  precio:        real('precio').notNull().default(0),
  precioCosto:   real('precio_costo').default(0),
  monedaCosto:   text('moneda_costo').default('ARS'),
  codigoSku:     text('codigo_sku'),
  codigoBarras:  text('codigo_barras'),
  stock:         integer('stock').default(0),
  stockMinimo:   integer('stock_minimo').default(5),
  imagen:        text('imagen'),
  trazabilidad:  text('trazabilidad').default('ninguna'), // 'ninguna'|'serie'|'lote'
  activo:        integer('activo').default(1),
  creadoEn:      text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
})

export const conjuntoComponentes = sqliteTable('conjunto_componentes', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  conjuntoId:   integer('conjunto_id').notNull(),
  componenteId: integer('componente_id').notNull(),
  cantidad:     integer('cantidad').notNull().default(1),
})

export const movimientosStock = sqliteTable('movimientos_stock', {
  ...syncCols(),
  id:           integer('id').primaryKey({ autoIncrement: true }),
  productoId:   integer('producto_id').notNull(),
  tipo:         text('tipo').notNull(), // 'entrada'|'salida'|'ajuste'
  cantidad:     integer('cantidad').notNull(),
  motivo:       text('motivo'),
  referenciaId: integer('referencia_id'),
  lote:         text('lote'),
  serie:        text('serie'),
  fecha:        text('fecha').notNull(),
  creadoEn:     text('creado_en').notNull(),
})

// ─── Proveedores y compras ─────────────────────────────────────

export const proveedores = sqliteTable('proveedores', {
  ...syncCols(),
  id:            integer('id').primaryKey({ autoIncrement: true }),
  nombre:        text('nombre').notNull(),
  rubro:         text('rubro'),
  contacto:      text('contacto'),
  telefono:      text('telefono'),
  email:         text('email'),
  direccion:     text('direccion'),
  notas:         text('notas'),
  activo:        integer('activo').default(1),
  creadoEn:      text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
})

export const ordenesCompra = sqliteTable('ordenes_compra', {
  ...syncCols(),
  id:             integer('id').primaryKey({ autoIncrement: true }),
  proveedorId:    integer('proveedor_id').notNull(),
  estado:         text('estado').notNull().default('borrador'), // 'borrador'|'enviada'|'recibida'
  numero:         integer('numero').notNull(),
  notas:          text('notas'),
  total:          real('total').default(0),
  fechaEnvio:     text('fecha_envio'),
  fechaRecepcion: text('fecha_recepcion'),
  creadoEn:       text('creado_en').notNull(),
  actualizadoEn:  text('actualizado_en').notNull(),
})

export const itemsOrdenCompra = sqliteTable('items_orden_compra', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  ordenId:     integer('orden_id').notNull(),
  productoId:  integer('producto_id').notNull(),
  cantidad:    integer('cantidad').notNull(),
  precioCosto: real('precio_costo').default(0),
  recibido:    integer('recibido').default(0),
})

// ─── Lista de precios ──────────────────────────────────────────

export const historialPrecios = sqliteTable('historial_precios', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  productoId:     integer('producto_id').notNull(),
  precioAnterior: real('precio_anterior').notNull(),
  precioNuevo:    real('precio_nuevo').notNull(),
  porcentaje:     real('porcentaje'),
  motivo:         text('motivo'),
  aplicadoPor:    text('aplicado_por').notNull(),
  fecha:          text('fecha').notNull(),
  creadoEn:       text('creado_en').notNull(),
})

export const listasPreciosSnapshot = sqliteTable('listas_precios_snapshot', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  nombre:        text('nombre').notNull(),
  descripcion:   text('descripcion'),
  snapshot:      text('snapshot').notNull(), // JSON con array de {productoId, nombre, precio}
  creadoPor:     text('creado_por').notNull(),
  vigenciaDesde: text('vigencia_desde').notNull(),
  creadoEn:      text('creado_en').notNull(),
})

// ─── Presupuestos ──────────────────────────────────────────────

export const presupuestos = sqliteTable('presupuestos', {
  ...syncCols(),
  id:            integer('id').primaryKey({ autoIncrement: true }),
  numero:        integer('numero').notNull(),
  clienteId:     integer('cliente_id').notNull(),
  estado:        text('estado').notNull().default('borrador'),
  // 'borrador' | 'enviado' | 'aprobado' | 'rechazado' | 'convertido'
  descripcion:   text('descripcion'),
  descuento:     real('descuento').default(0),
  tipoDescuento: text('tipo_descuento').default('porcentaje'), // 'porcentaje' | 'monto'
  subtotal:      real('subtotal').default(0),
  totalFinal:    real('total_final').default(0),
  motivoRechazo: text('motivo_rechazo'),
  vigenciaDias:  integer('vigencia_dias').default(7),
  fechaVigencia: text('fecha_vigencia'),
  otId:          integer('ot_id'),
  creadoPor:     text('creado_por').notNull(),
  creadoEn:      text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
})

export const itemsPresupuesto = sqliteTable('items_presupuesto', {
  ...syncCols(),
  id:             integer('id').primaryKey({ autoIncrement: true }),
  presupuestoId:  integer('presupuesto_id').notNull(),
  productoId:     integer('producto_id').notNull(),
  tipoItem:       text('tipo_item').notNull(), // 'simple' | 'conjunto'
  nombre:         text('nombre').notNull(),
  cantidad:       integer('cantidad').notNull().default(1),
  precioUnitario: real('precio_unitario').notNull(),
  descuentoItem:  real('descuento_item').default(0),
  subtotal:       real('subtotal').notNull(),
})

// ─── Órdenes de trabajo ────────────────────────────────────────

export const etiquetasOT = sqliteTable('etiquetas_ot', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  nombre:   text('nombre').notNull(),
  color:    text('color').notNull().default('#4A7FA5'),
  creadoEn: text('creado_en').notNull(),
})

export const plantillasOT = sqliteTable('plantillas_ot', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  nombre:      text('nombre').notNull(),
  descripcion: text('descripcion'),
  productoId:  integer('producto_id'),
  tipoItem:    text('tipo_item'), // 'simple' | 'conjunto'
  creadoEn:    text('creado_en').notNull(),
})

export const ordenesTrabajo = sqliteTable('ordenes_trabajo', {
  ...syncCols(),
  id:                integer('id').primaryKey({ autoIncrement: true }),
  numero:            integer('numero').notNull(),
  clienteId:         integer('cliente_id').notNull(),
  empleadoId:        integer('empleado_id'),
  productoId:        integer('producto_id').notNull(),
  tipoItem:          text('tipo_item').notNull(),
  productoNombre:    text('producto_nombre').notNull(),
  descripcion:       text('descripcion'),
  estado:            text('estado').notNull().default('recepcion'),
  descuento:         real('descuento').default(0),
  tipoDescuento:     text('tipo_descuento').default('porcentaje'),
  precio:            real('precio').notNull(),
  totalFinal:        real('total_final').notNull(),
  motivoCancelacion: text('motivo_cancelacion'),
  notas:             text('notas'),
  presupuestoId:     integer('presupuesto_id'),
  esRecurrente:      integer('es_recurrente').default(0),
  frecuencia:        text('frecuencia'),
  proximaFecha:      text('proxima_fecha'),
  garantiaDias:      integer('garantia_dias').default(0),
  garantiaVence:     text('garantia_vence'),
  creadoPor:         text('creado_por').notNull(),
  creadoEn:          text('creado_en').notNull(),
  actualizadoEn:     text('actualizado_en').notNull(),
})

export const otEtiquetas = sqliteTable('ot_etiquetas', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  otId:       integer('ot_id').notNull(),
  etiquetaId: integer('etiqueta_id').notNull(),
})

export const otNotas = sqliteTable('ot_notas', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  otId:      integer('ot_id').notNull(),
  nota:      text('nota').notNull(),
  creadoPor: text('creado_por').notNull(),
  creadoEn:  text('creado_en').notNull(),
})

export const garantias = sqliteTable('garantias', {
  id:           integer('id').primaryKey({ autoIncrement: true }),
  otId:         integer('ot_id').notNull(),
  clienteId:    integer('cliente_id').notNull(),
  productoId:   integer('producto_id').notNull(),
  diasGarantia: integer('dias_garantia').notNull(),
  fechaInicio:  text('fecha_inicio').notNull(),
  fechaVence:   text('fecha_vence').notNull(),
  activa:       integer('activa').default(1),
})

// ─── Agenda ────────────────────────────────────────────────────

export const citas = sqliteTable('citas', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  titulo:        text('titulo').notNull(),
  clienteId:     integer('cliente_id'),
  empleadoId:    integer('empleado_id'),
  otId:          integer('ot_id'),
  fechaInicio:   text('fecha_inicio').notNull(),
  fechaFin:      text('fecha_fin').notNull(),
  descripcion:   text('descripcion'),
  color:         text('color').default('#4A7FA5'),
  creadoPor:     text('creado_por').notNull(),
  creadoEn:      text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
})

// ─── Punto de venta ────────────────────────────────────────────

export const ventasPOS = sqliteTable('ventas_pos', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  numero:         integer('numero').notNull(),
  empleadoId:     integer('empleado_id'),
  empleadoNombre: text('empleado_nombre'),
  subtotal:       real('subtotal').notNull(),
  descuento:      real('descuento').default(0),
  totalFinal:     real('total_final').notNull(),
  formaPago:      text('forma_pago').notNull(), // 'efectivo'|'transferencia'|'tarjeta'
  fecha:          text('fecha').notNull(),
  creadoEn:       text('creado_en').notNull(),
})

export const itemsVentaPOS = sqliteTable('items_venta_pos', {
  id:             integer('id').primaryKey({ autoIncrement: true }),
  ventaId:        integer('venta_id').notNull(),
  productoId:     integer('producto_id').notNull(),
  tipoItem:       text('tipo_item').notNull(), // 'simple'|'conjunto'
  nombre:         text('nombre').notNull(),
  cantidad:       integer('cantidad').notNull(),
  precioUnitario: real('precio_unitario').notNull(),
  descuentoItem:  real('descuento_item').default(0),
  subtotal:       real('subtotal').notNull(),
})

export const cobrosCaja = sqliteTable('cobros_caja', {
  ...syncCols(),
  id:         integer('id').primaryKey({ autoIncrement: true }),
  fecha:      text('fecha').notNull(),
  monto:      real('monto').notNull(),
  formaPago:  text('forma_pago').notNull(),
  concepto:   text('concepto'),
  otId:       integer('ot_id'),
  ventaPosId: integer('venta_pos_id'),
  empleadoId: integer('empleado_id'),
  creadoEn:   text('creado_en').notNull(),
})

// ─── Caja diaria ───────────────────────────────────────────────

export const gastosOperativos = sqliteTable('gastos_operativos', {
  ...syncCols(),
  id:           integer('id').primaryKey({ autoIncrement: true }),
  fecha:        text('fecha').notNull(),
  monto:        real('monto').notNull(),
  categoria:    text('categoria').notNull(),
  descripcion:  text('descripcion'),
  comprobante:  text('comprobante'), // nombre del archivo adjunto
  empleadoId:   integer('empleado_id'),
  creadoEn:     text('creado_en').notNull(),
})

export const cierresCaja = sqliteTable('cierres_caja', {
  ...syncCols(),
  id:                 integer('id').primaryKey({ autoIncrement: true }),
  fecha:              text('fecha').notNull().unique(),
  totalEfectivo:      real('total_efectivo').default(0),
  totalTransferencia: real('total_transferencia').default(0),
  totalTarjeta:       real('total_tarjeta').default(0),
  totalIngresos:      real('total_ingresos').default(0),
  totalGastos:        real('total_gastos').default(0),
  saldoNeto:          real('saldo_neto').default(0),
  cerradoPor:         text('cerrado_por').notNull(),
  notas:              text('notas'),
  creadoEn:           text('creado_en').notNull(),
})

export const cierresMes = sqliteTable('cierres_mes', {
  ...syncCols(),
  id:                 integer('id').primaryKey({ autoIncrement: true }),
  anio:               integer('anio').notNull(),
  mes:                integer('mes').notNull(), // 1-12
  totalIngresos:      real('total_ingresos').default(0),
  totalGastos:        real('total_gastos').default(0),
  margenOperativo:    real('margen_operativo').default(0),
  otsCompletadas:     integer('ots_completadas').default(0),
  otsCanceladas:      integer('ots_canceladas').default(0),
  productoMasVendido: text('producto_mas_vendido'),
  empleadoDestacado:  text('empleado_destacado'),
  snapshot:           text('snapshot').notNull(), // JSON con detalle
  cerradoPor:         text('cerrado_por').notNull(),
  creadoEn:           text('creado_en').notNull(),
})

// ─── Devoluciones ──────────────────────────────────────────────

export const devoluciones = sqliteTable('devoluciones', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  numero:        integer('numero').notNull(),
  tipo:          text('tipo').notNull(), // 'ot' | 'pos'
  otId:          integer('ot_id'),
  ventaPosId:    integer('venta_pos_id'),
  clienteId:     integer('cliente_id'),
  clienteNombre: text('cliente_nombre'),
  motivo:        text('motivo').notNull(),
  observacion:   text('observacion'),
  totalDevuelto: real('total_devuelto').default(0),
  procesadoPor:  text('procesado_por').notNull(),
  fecha:         text('fecha').notNull(),
  creadoEn:      text('creado_en').notNull(),
})

export const itemsDevolucion = sqliteTable('items_devolucion', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  devolucionId:     integer('devolucion_id').notNull(),
  productoId:       integer('producto_id').notNull(),
  nombre:           text('nombre').notNull(),
  cantidadOriginal: integer('cantidad_original').notNull(),
  cantidadDevuelta: integer('cantidad_devuelta').notNull(),
  precioUnitario:   real('precio_unitario').notNull(),
  subtotalDevuelto: real('subtotal_devuelto').notNull(),
})

// ─── Configuración ─────────────────────────────────────────────

export const historialActividad = sqliteTable('historial_actividad', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  usuario:       text('usuario').notNull(),
  modulo:        text('modulo').notNull(),
  accion:        text('accion').notNull(),
  detalle:       text('detalle'),
  entidadTipo:   text('entidad_tipo'),
  entidadId:     integer('entidad_id'),
  campoAnterior: text('campo_anterior'), // JSON
  campoNuevo:    text('campo_nuevo'),    // JSON
  fecha:         text('fecha').notNull(),
  creadoEn:      text('creado_en').notNull(),
})

export const backups = sqliteTable('backups', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  ruta:     text('ruta').notNull(),
  tamanio:  integer('tamanio').default(0),
  estado:   text('estado').notNull(), // 'ok' | 'corrupto' | 'pendiente'
  tipo:     text('tipo').notNull(),   // 'manual' | 'automatico' | 'pre_operacion'
  creadoEn: text('creado_en').notNull(),
})

export const configuracionTicket = sqliteTable('configuracion_ticket', {
  id:              integer('id').primaryKey(),
  bloques:         text('bloques').notNull(), // JSON array de bloques
  anchoPapel:      text('ancho_papel').default('80mm'),
  impresoraNombre: text('impresora_nombre'),
  actualizadoEn:   text('actualizado_en').notNull(),
})

export const configuracionPDF = sqliteTable('configuracion_pdf', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  tipo:          text('tipo').notNull().unique(), // 'presupuesto'|'remito'|'recibo'
  bloques:       text('bloques').notNull(), // JSON array de bloques
  actualizadoEn: text('actualizado_en').notNull(),
})

export const motivosCancelacion = sqliteTable('motivos_cancelacion', {
  id:       integer('id').primaryKey({ autoIncrement: true }),
  nombre:   text('nombre').notNull(),
  fijo:     integer('fijo').default(0), // 1 = no se puede eliminar
  creadoEn: text('creado_en').notNull(),
})

export const tiposCambio = sqliteTable('tipos_cambio', {
  id:        integer('id').primaryKey({ autoIncrement: true }),
  valor:     real('valor').notNull(),
  fecha:     text('fecha').notNull(),
  creadoPor: text('creado_por').notNull(),
  creadoEn:  text('creado_en').notNull(),
})
