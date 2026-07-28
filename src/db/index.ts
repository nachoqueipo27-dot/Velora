import Database from '@tauri-apps/plugin-sql'

// Una única conexión SQLite fija — instalación single-tenant (un negocio, un local).
// Guardamos la PROMESA (no la conexión resuelta) para que llamadas concurrentes
// compartan la misma inicialización y no corran initSchema/seedDemoData dos veces.
let dbPromise: Promise<Db> | null = null

export function getDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await Database.load('sqlite:velora.db')
      await initSchema(database)
      await seedDemoData(database)
      return database
    })()
  }
  return dbPromise
}

async function initSchema(database: Db) {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS configuracion (
      id    INTEGER PRIMARY KEY,
      clave TEXT NOT NULL UNIQUE,
      valor TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS clientes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre         TEXT NOT NULL,
      telefono       TEXT,
      email          TEXT,
      direccion      TEXT,
      categoria      TEXT DEFAULT 'General',
      notas          TEXT,
      creado_en      TEXT NOT NULL,
      actualizado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS log_comunicaciones (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id  INTEGER NOT NULL,
      fecha       TEXT NOT NULL,
      responsable TEXT NOT NULL,
      resumen     TEXT NOT NULL,
      creado_en   TEXT NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS roles (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre    TEXT NOT NULL UNIQUE,
      es_admin  INTEGER DEFAULT 0,
      creado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS permisos (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      rol_id INTEGER NOT NULL,
      modulo TEXT NOT NULL,
      nivel  TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS empleados (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre         TEXT NOT NULL,
      dni            TEXT,
      rol_id         INTEGER NOT NULL,
      password       TEXT NOT NULL,
      avatar         TEXT,
      activo         INTEGER DEFAULT 1,
      tipo_horario   TEXT DEFAULT 'fijo',
      creado_en      TEXT NOT NULL,
      actualizado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS horarios_fijos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      dia_semana  INTEGER NOT NULL,
      entrada     TEXT,
      salida      TEXT,
      laborable   INTEGER DEFAULT 1
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS turnos (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre    TEXT NOT NULL,
      entrada   TEXT NOT NULL,
      salida    TEXT NOT NULL,
      creado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS asignacion_turnos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id INTEGER NOT NULL,
      turno_id    INTEGER NOT NULL,
      desde       TEXT NOT NULL,
      hasta       TEXT
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS fichajes (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id      INTEGER NOT NULL,
      fecha            TEXT NOT NULL,
      entrada          TEXT,
      salida           TEXT,
      horas_trabajadas REAL,
      editado_por      TEXT,
      creado_en        TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS horas_extras (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id     INTEGER NOT NULL,
      fecha           TEXT NOT NULL,
      horario_vigente TEXT NOT NULL,
      hora_salida_real TEXT NOT NULL,
      minutos_extra   INTEGER NOT NULL,
      tipo            TEXT NOT NULL,
      observacion     TEXT,
      registrado_por  TEXT NOT NULL,
      creado_en       TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS ausencias (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      empleado_id      INTEGER NOT NULL,
      tipo             TEXT NOT NULL,
      fecha_inicio     TEXT NOT NULL,
      fecha_fin        TEXT NOT NULL,
      horario_afectado TEXT NOT NULL,
      observacion      TEXT NOT NULL,
      comprobante      TEXT,
      creado_en        TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS categorias (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre    TEXT NOT NULL UNIQUE,
      creado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS productos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre          TEXT NOT NULL,
      tipo            TEXT NOT NULL,
      descripcion     TEXT,
      categoria_id    INTEGER,
      precio          REAL NOT NULL DEFAULT 0,
      precio_costo    REAL DEFAULT 0,
      moneda_costo    TEXT DEFAULT 'ARS',
      codigo_sku      TEXT,
      codigo_barras   TEXT,
      stock           REAL DEFAULT 0,
      stock_minimo    INTEGER DEFAULT 5,
      imagen          TEXT,
      trazabilidad    TEXT DEFAULT 'ninguna',
      unidad_medida   TEXT NOT NULL DEFAULT 'unidad',
      activo          INTEGER DEFAULT 1,
      creado_en       TEXT NOT NULL,
      actualizado_en  TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS conjunto_componentes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      conjunto_id    INTEGER NOT NULL,
      componente_id  INTEGER NOT NULL,
      cantidad       REAL NOT NULL DEFAULT 1,
      FOREIGN KEY (conjunto_id)   REFERENCES productos(id),
      FOREIGN KEY (componente_id) REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS movimientos_stock (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id   INTEGER NOT NULL,
      tipo          TEXT NOT NULL,
      cantidad      REAL NOT NULL,
      motivo        TEXT,
      referencia_id INTEGER,
      lote          TEXT,
      serie         TEXT,
      fecha         TEXT NOT NULL,
      creado_en     TEXT NOT NULL,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS proveedores (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre         TEXT NOT NULL,
      rubro          TEXT,
      contacto       TEXT,
      telefono       TEXT,
      email          TEXT,
      direccion      TEXT,
      notas          TEXT,
      activo         INTEGER DEFAULT 1,
      creado_en      TEXT NOT NULL,
      actualizado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS ordenes_compra (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      proveedor_id     INTEGER NOT NULL,
      estado           TEXT NOT NULL DEFAULT 'borrador',
      numero           INTEGER NOT NULL,
      notas            TEXT,
      total            REAL DEFAULT 0,
      fecha_envio      TEXT,
      fecha_recepcion  TEXT,
      creado_en        TEXT NOT NULL,
      actualizado_en   TEXT NOT NULL,
      FOREIGN KEY (proveedor_id) REFERENCES proveedores(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS items_orden_compra (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_id     INTEGER NOT NULL,
      producto_id  INTEGER NOT NULL,
      cantidad     REAL NOT NULL,
      precio_costo REAL DEFAULT 0,
      recibido     INTEGER DEFAULT 0,
      FOREIGN KEY (orden_id)    REFERENCES ordenes_compra(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS historial_precios (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id     INTEGER NOT NULL,
      precio_anterior REAL NOT NULL,
      precio_nuevo    REAL NOT NULL,
      porcentaje      REAL,
      motivo          TEXT,
      aplicado_por    TEXT NOT NULL,
      fecha           TEXT NOT NULL,
      creado_en       TEXT NOT NULL,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS listas_precios_snapshot (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre         TEXT NOT NULL,
      descripcion    TEXT,
      snapshot       TEXT NOT NULL,
      creado_por     TEXT NOT NULL,
      vigencia_desde TEXT NOT NULL,
      creado_en      TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS presupuestos (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      numero           INTEGER NOT NULL,
      cliente_id       INTEGER NOT NULL,
      estado           TEXT NOT NULL DEFAULT 'borrador',
      descripcion      TEXT,
      descuento        REAL DEFAULT 0,
      tipo_descuento   TEXT DEFAULT 'porcentaje',
      subtotal         REAL DEFAULT 0,
      total_final      REAL DEFAULT 0,
      motivo_rechazo   TEXT,
      vigencia_dias    INTEGER DEFAULT 7,
      fecha_vigencia   TEXT,
      ot_id            INTEGER,
      creado_por       TEXT NOT NULL,
      creado_en        TEXT NOT NULL,
      actualizado_en   TEXT NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS items_presupuesto (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      presupuesto_id   INTEGER NOT NULL,
      producto_id      INTEGER NOT NULL,
      tipo_item        TEXT NOT NULL,
      nombre           TEXT NOT NULL,
      cantidad         REAL NOT NULL DEFAULT 1,
      precio_unitario  REAL NOT NULL,
      descuento_item   REAL DEFAULT 0,
      subtotal         REAL NOT NULL,
      FOREIGN KEY (presupuesto_id) REFERENCES presupuestos(id),
      FOREIGN KEY (producto_id)    REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS etiquetas_ot (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre    TEXT NOT NULL,
      color     TEXT NOT NULL DEFAULT '#4A7FA5',
      creado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS plantillas_ot (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre      TEXT NOT NULL,
      descripcion TEXT,
      producto_id INTEGER,
      tipo_item   TEXT,
      creado_en   TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS ordenes_trabajo (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      numero             INTEGER NOT NULL,
      cliente_id         INTEGER NOT NULL,
      empleado_id        INTEGER,
      producto_id        INTEGER NOT NULL,
      tipo_item          TEXT NOT NULL,
      producto_nombre    TEXT NOT NULL,
      descripcion        TEXT,
      estado             TEXT NOT NULL DEFAULT 'recepcion',
      descuento          REAL DEFAULT 0,
      tipo_descuento     TEXT DEFAULT 'porcentaje',
      precio             REAL NOT NULL,
      total_final        REAL NOT NULL,
      motivo_cancelacion TEXT,
      notas              TEXT,
      presupuesto_id     INTEGER,
      es_recurrente      INTEGER DEFAULT 0,
      frecuencia         TEXT,
      proxima_fecha      TEXT,
      garantia_dias      INTEGER DEFAULT 0,
      garantia_vence     TEXT,
      creado_por         TEXT NOT NULL,
      creado_en          TEXT NOT NULL,
      actualizado_en     TEXT NOT NULL,
      FOREIGN KEY (cliente_id)  REFERENCES clientes(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS ot_etiquetas (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ot_id       INTEGER NOT NULL,
      etiqueta_id INTEGER NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS ot_notas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      ot_id      INTEGER NOT NULL,
      nota       TEXT NOT NULL,
      creado_por TEXT NOT NULL,
      creado_en  TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS garantias (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ot_id         INTEGER NOT NULL,
      cliente_id    INTEGER NOT NULL,
      producto_id   INTEGER NOT NULL,
      dias_garantia INTEGER NOT NULL,
      fecha_inicio  TEXT NOT NULL,
      fecha_vence   TEXT NOT NULL,
      activa        INTEGER DEFAULT 1
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS citas (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo         TEXT NOT NULL,
      cliente_id     INTEGER,
      empleado_id    INTEGER,
      ot_id          INTEGER,
      fecha_inicio   TEXT NOT NULL,
      fecha_fin      TEXT NOT NULL,
      descripcion    TEXT,
      color          TEXT DEFAULT '#4A7FA5',
      creado_por     TEXT NOT NULL,
      creado_en      TEXT NOT NULL,
      actualizado_en TEXT NOT NULL,
      FOREIGN KEY (cliente_id)  REFERENCES clientes(id),
      FOREIGN KEY (empleado_id) REFERENCES empleados(id),
      FOREIGN KEY (ot_id)       REFERENCES ordenes_trabajo(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS ventas_pos (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      numero           INTEGER NOT NULL,
      empleado_id      INTEGER,
      empleado_nombre  TEXT,
      subtotal         REAL NOT NULL,
      descuento        REAL DEFAULT 0,
      total_final      REAL NOT NULL,
      forma_pago       TEXT NOT NULL,
      fecha            TEXT NOT NULL,
      creado_en        TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS items_venta_pos (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      venta_id         INTEGER NOT NULL,
      producto_id      INTEGER NOT NULL,
      tipo_item        TEXT NOT NULL,
      nombre           TEXT NOT NULL,
      cantidad         REAL NOT NULL,
      precio_unitario  REAL NOT NULL,
      descuento_item   REAL DEFAULT 0,
      subtotal         REAL NOT NULL,
      FOREIGN KEY (venta_id)    REFERENCES ventas_pos(id),
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS cobros_caja (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha         TEXT NOT NULL,
      monto         REAL NOT NULL,
      forma_pago    TEXT NOT NULL,
      concepto      TEXT,
      ot_id         INTEGER,
      venta_pos_id  INTEGER,
      empleado_id   INTEGER,
      creado_en     TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS gastos_operativos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha        TEXT NOT NULL,
      monto        REAL NOT NULL,
      categoria    TEXT NOT NULL,
      descripcion  TEXT,
      comprobante  TEXT,
      empleado_id  INTEGER,
      creado_en    TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS cierres_caja (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha                TEXT NOT NULL UNIQUE,
      total_efectivo       REAL DEFAULT 0,
      total_transferencia  REAL DEFAULT 0,
      total_tarjeta        REAL DEFAULT 0,
      total_ingresos       REAL DEFAULT 0,
      total_gastos         REAL DEFAULT 0,
      saldo_neto           REAL DEFAULT 0,
      cerrado_por          TEXT NOT NULL,
      notas                TEXT,
      creado_en            TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS cierres_mes (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      anio                 INTEGER NOT NULL,
      mes                  INTEGER NOT NULL,
      total_ingresos       REAL DEFAULT 0,
      total_gastos         REAL DEFAULT 0,
      margen_operativo     REAL DEFAULT 0,
      ots_completadas      INTEGER DEFAULT 0,
      ots_canceladas       INTEGER DEFAULT 0,
      producto_mas_vendido TEXT,
      empleado_destacado   TEXT,
      snapshot             TEXT NOT NULL,
      cerrado_por          TEXT NOT NULL,
      creado_en            TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS devoluciones (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      numero          INTEGER NOT NULL,
      tipo            TEXT NOT NULL,
      ot_id           INTEGER,
      venta_pos_id    INTEGER,
      cliente_id      INTEGER,
      cliente_nombre  TEXT,
      motivo          TEXT NOT NULL,
      observacion     TEXT,
      total_devuelto  REAL DEFAULT 0,
      procesado_por   TEXT NOT NULL,
      fecha           TEXT NOT NULL,
      creado_en       TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS items_devolucion (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      devolucion_id       INTEGER NOT NULL,
      producto_id         INTEGER NOT NULL,
      nombre              TEXT NOT NULL,
      cantidad_original   INTEGER NOT NULL,
      cantidad_devuelta   INTEGER NOT NULL,
      precio_unitario     REAL NOT NULL,
      subtotal_devuelto   REAL NOT NULL,
      FOREIGN KEY (devolucion_id) REFERENCES devoluciones(id),
      FOREIGN KEY (producto_id)   REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS historial_actividad (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario        TEXT NOT NULL,
      modulo         TEXT NOT NULL,
      accion         TEXT NOT NULL,
      detalle        TEXT,
      entidad_tipo   TEXT,
      entidad_id     INTEGER,
      campo_anterior TEXT,
      campo_nuevo    TEXT,
      fecha          TEXT NOT NULL,
      creado_en      TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS backups (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ruta      TEXT NOT NULL,
      tamanio   INTEGER DEFAULT 0,
      estado    TEXT NOT NULL,
      tipo      TEXT NOT NULL,
      creado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS configuracion_ticket (
      id               INTEGER PRIMARY KEY,
      bloques          TEXT NOT NULL,
      ancho_papel      TEXT DEFAULT '80mm',
      impresora_nombre TEXT,
      actualizado_en   TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS configuracion_pdf (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo           TEXT NOT NULL UNIQUE,
      bloques        TEXT NOT NULL,
      actualizado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS motivos_cancelacion (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre    TEXT NOT NULL,
      fijo      INTEGER DEFAULT 0,
      creado_en TEXT NOT NULL
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS tipos_cambio (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      valor      REAL NOT NULL,
      fecha      TEXT NOT NULL,
      creado_por TEXT NOT NULL,
      creado_en  TEXT NOT NULL
    )
  `)

  // Migración: columna dni en empleados (DBs creadas antes de este cambio).
  try {
    await database.execute(`ALTER TABLE empleados ADD COLUMN dni TEXT`)
  } catch { /* la columna ya existe */ }

  // Migración: unidad de medida en productos (DBs creadas antes de este cambio).
  // SQLite calcula el DEFAULT constante para las filas existentes sin reescribir la tabla.
  try {
    await database.execute(`ALTER TABLE productos ADD COLUMN unidad_medida TEXT NOT NULL DEFAULT 'unidad'`)
  } catch { /* la columna ya existe */ }

  // NOTA sobre productos.stock / movimientos_stock.cantidad / items_venta_pos.cantidad /
  // items_presupuesto.cantidad / items_orden_compra.cantidad / conjunto_componentes.cantidad
  // (INTEGER -> REAL): en DBs ya existentes estas columnas NO se migran con ALTER/recreación
  // de tabla, y es deliberado, no un olvido.
  // SQLite usa "type affinity", no tipado estricto: una columna declarada INTEGER que
  // recibe un valor como 2.5 lo guarda tal cual como REAL (no lo trunca ni lo redondea),
  // y SUM()/agregaciones sobre esa columna devuelven el resultado real correcto — probado
  // empíricamente antes de tomar esta decisión (ver Prompt 1: unidad de medida en productos).
  // El único efecto del tipo declarado es metadata en PRAGMA table_info, no el valor
  // almacenado ni el comportamiento en runtime. Las dos columnas agregadas en este prompt
  // (items_orden_compra.cantidad, conjunto_componentes.cantidad) son el mismo caso: mismo
  // criterio, sin necesidad de repetir la verificación empírica.
  // Reescribir estas 6 tablas (con FKs desde tablas relacionadas) para cambiar solo esa
  // metadata agregaría riesgo real de pérdida de datos sin ningún beneficio funcional.
  // El CREATE TABLE de arriba ya declara REAL para instalaciones nuevas.
}

// Sólo configuración base. La app nunca carga datos de ejemplo: toda instalación
// (dev o producción) arranca vacía de datos de negocio.
async function seedDemoData(database: Db) {
  await seedRolesBase(database)
  await seedConfiguracionBase(database)
}

// Configuración base que necesita TODO local para funcionar (no son datos de ejemplo):
// plantillas de ticket/PDF, motivos de cancelación, categorías de gastos y tipo de
// cambio inicial. Idempotente.
async function seedConfiguracionBase(database: Db) {
  const now = new Date().toISOString()

  const bloquesTicketDefault = JSON.stringify([
    { id: 'encabezado',  tipo: 'encabezado',  activo: true,  negrita: false },
    { id: 'sep1',        tipo: 'separador',   activo: true  },
    { id: 'fecha',       tipo: 'fecha',       activo: true  },
    { id: 'numero_ot',   tipo: 'numero_ot',   activo: true  },
    { id: 'cliente',     tipo: 'cliente',     activo: true  },
    { id: 'sep2',        tipo: 'separador',   activo: true  },
    { id: 'productos',   tipo: 'productos',   activo: true  },
    { id: 'sep3',        tipo: 'separador',   activo: true  },
    { id: 'total',       tipo: 'total',       activo: true,  negrita: true },
    { id: 'forma_pago',  tipo: 'forma_pago',  activo: true  },
    { id: 'sep4',        tipo: 'separador',   activo: true  },
    { id: 'pie',         tipo: 'pie_pagina',  activo: true,  texto: '¡Gracias por su compra!' },
  ])
  await database.execute(
    `INSERT OR IGNORE INTO configuracion_ticket (id, bloques, ancho_papel, actualizado_en)
     VALUES (1, ?, '80mm', ?)`,
    [bloquesTicketDefault, now]
  )

  for (const tipo of ['presupuesto', 'remito', 'recibo']) {
    const bloquesPDFDefault = JSON.stringify([
      { id: 'encabezado', tipo: 'encabezado', activo: true },
      { id: 'datos_negocio', tipo: 'datos_negocio', activo: true },
      { id: 'sep1', tipo: 'separador', activo: true },
      { id: 'cliente', tipo: 'cliente', activo: true },
      { id: 'fecha', tipo: 'fecha', activo: true },
      { id: 'items', tipo: 'items', activo: true },
      { id: 'totales', tipo: 'totales', activo: true },
      { id: 'sep2', tipo: 'separador', activo: true },
      { id: 'pie', tipo: 'pie_pagina', activo: true, texto: 'Gracias por confiar en nosotros.' },
    ])
    await database.execute(
      `INSERT OR IGNORE INTO configuracion_pdf (tipo, bloques, actualizado_en) VALUES (?, ?, ?)`,
      [tipo, bloquesPDFDefault, now]
    )
  }

  const motivosFijos = ['Precio muy alto', 'Cliente desistió', 'Producto sin stock', 'Demora excesiva', 'Error de carga', 'Otro']
  for (const m of motivosFijos) {
    const existe = await database.select<{ n: number }[]>('SELECT COUNT(*) as n FROM motivos_cancelacion WHERE nombre = ?', [m])
    if ((existe[0]?.n ?? 0) === 0) {
      await database.execute('INSERT INTO motivos_cancelacion (nombre, fijo, creado_en) VALUES (?, 1, ?)', [m, now])
    }
  }

  // Categorías de gastos default (reusa tabla configuracion como kv)
  const catGastos = ['Servicios', 'Alquiler', 'Insumos', 'Transporte', 'Personal', 'Impuestos', 'Mantenimiento', 'Marketing', 'Otro']
  await database.execute(
    `INSERT OR IGNORE INTO configuracion (clave, valor) VALUES ('categorias_gastos', ?)`,
    [JSON.stringify(catGastos)]
  )

  // Tipo de cambio inicial
  const tc = await database.select<{ n: number }[]>('SELECT COUNT(*) as n FROM tipos_cambio')
  if ((tc[0]?.n ?? 0) === 0) {
    await database.execute(
      `INSERT INTO tipos_cambio (valor, fecha, creado_por, creado_en) VALUES (?, ?, 'Administrador', ?)`,
      [1000, now, now]
    )
  }
}

type Db = Awaited<ReturnType<typeof Database.load>>

// Roles base — se siembran SIEMPRE (idempotente), independiente de si hay empleados.
// Toda DB nueva (incluido un local nuevo) queda con los 3 roles base desde el arranque.
async function seedRolesBase(database: Db) {
  const rolesCount = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM roles'
  )
  if (rolesCount[0].count > 0) return

  const now = new Date().toISOString()
  await database.execute(`INSERT INTO roles (nombre, es_admin, creado_en) VALUES ('Admin', 1, ?)`, [now])
  await database.execute(`INSERT INTO roles (nombre, es_admin, creado_en) VALUES ('Supervisor', 0, ?)`, [now])
  await database.execute(`INSERT INTO roles (nombre, es_admin, creado_en) VALUES ('Operario', 0, ?)`, [now])
}
