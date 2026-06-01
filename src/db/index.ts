import Database from '@tauri-apps/plugin-sql'

let db: Awaited<ReturnType<typeof Database.load>> | null = null

export async function getDb() {
  if (!db) {
    db = await Database.load('sqlite:velora.db')
    await initSchema()
    await seedDemoData()
  }
  return db
}

async function initSchema() {
  const database = db!

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
      stock           INTEGER DEFAULT 0,
      stock_minimo    INTEGER DEFAULT 5,
      imagen          TEXT,
      trazabilidad    TEXT DEFAULT 'ninguna',
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
      cantidad       INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (conjunto_id)   REFERENCES productos(id),
      FOREIGN KEY (componente_id) REFERENCES productos(id)
    )
  `)

  await database.execute(`
    CREATE TABLE IF NOT EXISTS movimientos_stock (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      producto_id   INTEGER NOT NULL,
      tipo          TEXT NOT NULL,
      cantidad      INTEGER NOT NULL,
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
      cantidad     INTEGER NOT NULL,
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
      cantidad         INTEGER NOT NULL DEFAULT 1,
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
      cantidad         INTEGER NOT NULL,
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

  // ─── Migración segura — columnas de sync (Fase 2) ─────────────
  // Agrega sync_status / synced_at / remote_id / deleted_at a las tablas que se
  // sincronizan con Supabase, solo si no existen (idempotente sobre DBs existentes).
  const tablasSync = [
    'clientes', 'empleados', 'productos', 'ordenes_trabajo',
    'presupuestos', 'items_presupuesto', 'cobros_caja',
    'gastos_operativos', 'cierres_caja', 'cierres_mes',
    'fichajes', 'horas_extras', 'ausencias',
    'movimientos_stock', 'proveedores', 'ordenes_compra',
  ]
  for (const tabla of tablasSync) {
    const cols = await database.select<{ name: string }[]>(`PRAGMA table_info(${tabla})`)
    const nombres = cols.map(c => c.name)
    if (!nombres.includes('sync_status')) {
      await database.execute(`ALTER TABLE ${tabla} ADD COLUMN sync_status TEXT DEFAULT 'pendiente'`)
    }
    if (!nombres.includes('synced_at')) {
      await database.execute(`ALTER TABLE ${tabla} ADD COLUMN synced_at TEXT`)
    }
    if (!nombres.includes('remote_id')) {
      await database.execute(`ALTER TABLE ${tabla} ADD COLUMN remote_id TEXT`)
    }
    if (!nombres.includes('deleted_at')) {
      await database.execute(`ALTER TABLE ${tabla} ADD COLUMN deleted_at TEXT`)
    }
  }
}

async function seedDemoData() {
  const database = db!
  await seedClientesDemo(database)
  await seedEmpleadosDemo(database)
  await seedProductosDemo(database)
  await seedProveedoresDemo(database)
  await seedListaPreciosDemo(database)
  await seedPresupuestosDemo(database)
  await seedOTsDemo(database)
  await seedCitasDemo(database)
  await seedCajaDemo(database)
  await seedConfiguracionDemo(database)
}

async function seedConfiguracionDemo(database: Db) {
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

async function seedClientesDemo(database: Db) {
  const result = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM clientes'
  )
  if (result[0].count > 0) return

  const now = new Date().toISOString()

  const clientesDemo = [
    {
      nombre: 'Restaurante El Rincón',
      telefono: '011-4523-7890',
      email: 'contacto@elrincon.com',
      direccion: 'Av. Corrientes 1234, CABA',
      categoria: 'VIP',
      notas: 'Cliente frecuente, prefiere facturas a fin de mes',
    },
    {
      nombre: 'María González',
      telefono: '011-1534-2210',
      email: 'maria.gonzalez@gmail.com',
      direccion: 'Palermo, CABA',
      categoria: 'Frecuente',
      notas: '',
    },
    {
      nombre: 'Distribuidora Norte SA',
      telefono: '011-4001-5566',
      email: 'compras@disnorte.com.ar',
      direccion: 'Zona Norte, GBA',
      categoria: 'Mayorista',
      notas: 'Pago a 30 días',
    },
    {
      nombre: 'Carlos Pérez',
      telefono: '011-1567-4432',
      email: '',
      direccion: '',
      categoria: 'Ocasional',
      notas: '',
    },
    {
      nombre: 'Cafetería Roma',
      telefono: '011-4788-1122',
      email: 'roma@cafeteria.com',
      direccion: 'San Telmo, CABA',
      categoria: 'Frecuente',
      notas: 'Pedidos los lunes',
    },
  ]

  for (const c of clientesDemo) {
    await database.execute(
      `INSERT INTO clientes (nombre, telefono, email, direccion, categoria, notas, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.nombre, c.telefono, c.email, c.direccion, c.categoria, c.notas, now, now]
    )
  }

  const logs = [
    { clienteId: 1, responsable: 'Admin', resumen: 'Llamado para confirmar pedido semanal' },
    { clienteId: 1, responsable: 'Admin', resumen: 'Consulta sobre nuevo producto disponible' },
    { clienteId: 2, responsable: 'Admin', resumen: 'Coordinación de entrega' },
    { clienteId: 3, responsable: 'Admin', resumen: 'Negociación de precio por volumen' },
  ]

  for (const l of logs) {
    await database.execute(
      `INSERT INTO log_comunicaciones (cliente_id, fecha, responsable, resumen, creado_en)
       VALUES (?, ?, ?, ?, ?)`,
      [l.clienteId, now, l.responsable, l.resumen, now]
    )
  }
}

async function seedEmpleadosDemo(database: Db) {
  const empCount = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM empleados'
  )
  if (empCount[0].count > 0) return

  const now = new Date().toISOString()

  // Roles
  await database.execute(
    `INSERT INTO roles (nombre, es_admin, creado_en) VALUES (?, ?, ?)`,
    ['Admin', 1, now]
  )
  await database.execute(
    `INSERT INTO roles (nombre, es_admin, creado_en) VALUES (?, ?, ?)`,
    ['Supervisor', 0, now]
  )
  await database.execute(
    `INSERT INTO roles (nombre, es_admin, creado_en) VALUES (?, ?, ?)`,
    ['Operario', 0, now]
  )

  // Empleados
  await database.execute(
    `INSERT INTO empleados (nombre, rol_id, password, activo, tipo_horario, creado_en, actualizado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Administrador', 1, btoa('admin123'), 1, 'fijo', now, now]
  )
  await database.execute(
    `INSERT INTO empleados (nombre, rol_id, password, activo, tipo_horario, creado_en, actualizado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['María López', 2, btoa('pass123'), 1, 'turno', now, now]
  )
  await database.execute(
    `INSERT INTO empleados (nombre, rol_id, password, activo, tipo_horario, creado_en, actualizado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ['Carlos Ruiz', 3, btoa('pass123'), 1, 'fijo', now, now]
  )

  // Turnos
  await database.execute(
    `INSERT INTO turnos (nombre, entrada, salida, creado_en) VALUES (?, ?, ?, ?)`,
    ['Turno Mañana', '07:00', '13:00', now]
  )
  await database.execute(
    `INSERT INTO turnos (nombre, entrada, salida, creado_en) VALUES (?, ?, ?, ?)`,
    ['Turno Tarde', '13:00', '19:00', now]
  )
  await database.execute(
    `INSERT INTO turnos (nombre, entrada, salida, creado_en) VALUES (?, ?, ?, ?)`,
    ['Turno Completo', '09:00', '18:00', now]
  )

  // Asignación de turno para María López (empleado 2 -> Turno Mañana)
  await database.execute(
    `INSERT INTO asignacion_turnos (empleado_id, turno_id, desde, hasta) VALUES (?, ?, ?, ?)`,
    [2, 1, now, null]
  )

  // Horario fijo para Administrador (1) y Carlos (3): Lun-Vie 09:00-18:00
  for (const empId of [1, 3]) {
    for (let dia = 1; dia <= 5; dia++) {
      await database.execute(
        `INSERT INTO horarios_fijos (empleado_id, dia_semana, entrada, salida, laborable)
         VALUES (?, ?, ?, ?, ?)`,
        [empId, dia, '09:00', '18:00', 1]
      )
    }
    for (const dia of [0, 6]) {
      await database.execute(
        `INSERT INTO horarios_fijos (empleado_id, dia_semana, entrada, salida, laborable)
         VALUES (?, ?, ?, ?, ?)`,
        [empId, dia, null, null, 0]
      )
    }
  }
}

async function seedProductosDemo(database: Db) {
  const count = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM productos'
  )
  if (count[0].count > 0) return

  const now = new Date().toISOString()

  // Categorías
  const cats = ['Bebidas', 'Comidas', 'Combos', 'Insumos', 'Electrónica']
  for (const c of cats) {
    await database.execute('INSERT INTO categorias (nombre, creado_en) VALUES (?, ?)', [c, now])
  }

  // Productos simples
  const simples = [
    { nombre: 'Pan de hamburguesa',  cat: 4, precio: 150,  costo: 80,   stock: 50, min: 10 },
    { nombre: 'Medallón de carne',   cat: 4, precio: 400,  costo: 200,  stock: 30, min: 10 },
    { nombre: 'Queso feteado',       cat: 4, precio: 120,  costo: 60,   stock: 40, min: 10 },
    { nombre: 'Tomate',              cat: 4, precio: 80,   costo: 30,   stock: 20, min: 5  },
    { nombre: 'Gaseosa 500ml',       cat: 1, precio: 400,  costo: 180,  stock: 60, min: 20 },
    { nombre: 'Agua mineral 500ml',  cat: 1, precio: 250,  costo: 100,  stock: 45, min: 15 },
    { nombre: 'Cable USB-C',         cat: 5, precio: 2500, costo: 1200, stock: 8,  min: 3  },
    { nombre: 'Auriculares in-ear',  cat: 5, precio: 8000, costo: 4000, stock: 5,  min: 2  },
  ]

  for (const p of simples) {
    await database.execute(
      `INSERT INTO productos
       (nombre, tipo, categoria_id, precio, precio_costo, stock, stock_minimo, creado_en, actualizado_en)
       VALUES (?, 'simple', ?, ?, ?, ?, ?, ?, ?)`,
      [p.nombre, p.cat, p.precio, p.costo, p.stock, p.min, now, now]
    )
  }

  // Conjunto: Combo Hamburguesa (id 9)
  await database.execute(
    `INSERT INTO productos
     (nombre, tipo, descripcion, categoria_id, precio, precio_costo, stock, stock_minimo, creado_en, actualizado_en)
     VALUES (?, 'conjunto', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Combo Hamburguesa', 'Pan + medallón + queso + tomate', 3, 2500, 370, 0, 0, now, now]
  )

  // Componentes del combo (conjunto id = 9)
  const componentes = [
    { comp: 1, cant: 1 }, // Pan
    { comp: 2, cant: 1 }, // Medallón
    { comp: 3, cant: 2 }, // Queso x2
    { comp: 4, cant: 1 }, // Tomate
  ]
  for (const c of componentes) {
    await database.execute(
      'INSERT INTO conjunto_componentes (conjunto_id, componente_id, cantidad) VALUES (?, ?, ?)',
      [9, c.comp, c.cant]
    )
  }

  // Movimientos demo para rotación
  const movs = [
    { prod: 1, tipo: 'salida', cant: 10 },
    { prod: 2, tipo: 'salida', cant: 8  },
    { prod: 5, tipo: 'salida', cant: 20 },
    { prod: 6, tipo: 'salida', cant: 5  },
    { prod: 7, tipo: 'salida', cant: 3  },
  ]
  for (const m of movs) {
    await database.execute(
      `INSERT INTO movimientos_stock (producto_id, tipo, cantidad, motivo, fecha, creado_en)
       VALUES (?, ?, ?, 'demo', ?, ?)`,
      [m.prod, m.tipo, m.cant, now, now]
    )
  }
}

async function seedProveedoresDemo(database: Db) {
  const count = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM proveedores'
  )
  if (count[0].count > 0) return

  const now = new Date().toISOString()

  const provs = [
    {
      nombre: 'Distribuidora Sur SA',
      rubro: 'Alimentos y bebidas',
      contacto: 'Roberto Méndez',
      telefono: '011-4523-1100',
      email: 'ventas@dissur.com.ar',
      direccion: 'Av. San Martín 2200, GBA Sur',
    },
    {
      nombre: 'TechImport SRL',
      rubro: 'Electrónica',
      contacto: 'Laura Ríos',
      telefono: '011-5588-4400',
      email: 'compras@techimport.com.ar',
      direccion: 'Once, CABA',
    },
    {
      nombre: 'Insumos del Norte',
      rubro: 'Insumos generales',
      contacto: 'Miguel Torres',
      telefono: '011-4001-7700',
      email: 'info@insumosnorte.com.ar',
      direccion: 'Zona Norte, GBA',
    },
  ]

  for (const p of provs) {
    await database.execute(
      `INSERT INTO proveedores
       (nombre, rubro, contacto, telefono, email, direccion, activo, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [p.nombre, p.rubro, p.contacto, p.telefono, p.email, p.direccion, now, now]
    )
  }

  // Orden de compra demo en estado borrador
  await database.execute(
    `INSERT INTO ordenes_compra
     (proveedor_id, estado, numero, notas, total, creado_en, actualizado_en)
     VALUES (?, 'borrador', ?, ?, ?, ?, ?)`,
    [1, 1, 'Pedido semanal de insumos', 2500, now, now]
  )

  await database.execute(
    `INSERT INTO items_orden_compra (orden_id, producto_id, cantidad, precio_costo)
     VALUES (?, ?, ?, ?)`,
    [1, 1, 20, 80]  // Pan de hamburguesa x20
  )
  await database.execute(
    `INSERT INTO items_orden_compra (orden_id, producto_id, cantidad, precio_costo)
     VALUES (?, ?, ?, ?)`,
    [1, 2, 15, 200] // Medallón x15
  )
}

async function seedListaPreciosDemo(database: Db) {
  const count = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM listas_precios_snapshot'
  )
  if (count[0].count > 0) return

  const now = new Date().toISOString()

  const productos = await database.select<any[]>(
    'SELECT id, nombre, precio FROM productos WHERE activo = 1'
  )
  const snapshot = JSON.stringify(
    productos.map(p => ({ productoId: p.id, nombre: p.nombre, precio: p.precio }))
  )

  await database.execute(
    `INSERT INTO listas_precios_snapshot
     (nombre, descripcion, snapshot, creado_por, vigencia_desde, creado_en)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['Lista inicial', 'Precios de apertura del sistema', snapshot, 'Administrador', now, now]
  )
}

async function seedPresupuestosDemo(database: Db) {
  const count = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM presupuestos'
  )
  if (count[0].count > 0) return

  const now = new Date().toISOString()
  const vigencia = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Presupuesto demo en estado enviado
  await database.execute(
    `INSERT INTO presupuestos
     (numero, cliente_id, estado, descripcion, subtotal, total_final,
      vigencia_dias, fecha_vigencia, creado_por, creado_en, actualizado_en)
     VALUES (?, ?, 'enviado', ?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, 1, 'Pedido de combos para el local', 5000, 5000, 7, vigencia, 'Administrador', now, now]
  )

  await database.execute(
    `INSERT INTO items_presupuesto
     (presupuesto_id, producto_id, tipo_item, nombre, cantidad, precio_unitario, subtotal)
     VALUES (?, ?, 'conjunto', ?, ?, ?, ?)`,
    [1, 9, 'Combo Hamburguesa', 2, 2500, 5000]
  )

  // Presupuesto rechazado demo
  await database.execute(
    `INSERT INTO presupuestos
     (numero, cliente_id, estado, descripcion, subtotal, total_final,
      motivo_rechazo, vigencia_dias, fecha_vigencia, creado_por, creado_en, actualizado_en)
     VALUES (?, ?, 'rechazado', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [2, 2, 'Pedido de bebidas', 1600, 1600, 'Precio muy alto', 7, vigencia, 'Administrador', now, now]
  )

  await database.execute(
    `INSERT INTO items_presupuesto
     (presupuesto_id, producto_id, tipo_item, nombre, cantidad, precio_unitario, subtotal)
     VALUES (?, ?, 'simple', ?, ?, ?, ?)`,
    [2, 5, 'Gaseosa 500ml', 4, 400, 1600]
  )
}

async function seedOTsDemo(database: Db) {
  const count = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM ordenes_trabajo'
  )
  if (count[0].count > 0) return

  const now = new Date().toISOString()

  // Etiquetas demo
  await database.execute(`INSERT INTO etiquetas_ot (nombre, color, creado_en) VALUES (?, ?, ?)`, ['Urgente', '#C0392B', now])
  await database.execute(`INSERT INTO etiquetas_ot (nombre, color, creado_en) VALUES (?, ?, ?)`, ['Garantía', '#D4921A', now])
  await database.execute(`INSERT INTO etiquetas_ot (nombre, color, creado_en) VALUES (?, ?, ?)`, ['Corporativo', '#4A7FA5', now])

  // Plantilla demo
  await database.execute(
    `INSERT INTO plantillas_ot (nombre, descripcion, producto_id, tipo_item, creado_en) VALUES (?, ?, ?, ?, ?)`,
    ['Combo estándar', 'Pedido habitual de combo hamburguesa', 9, 'conjunto', now]
  )

  const ots = [
    { numero: 1, clienteId: 1, productoId: 9, tipoItem: 'conjunto', productoNombre: 'Combo Hamburguesa', estado: 'en_proceso', precio: 2500, totalFinal: 2500, descripcion: 'Pedido para el local' },
    { numero: 2, clienteId: 2, productoId: 5, tipoItem: 'simple', productoNombre: 'Gaseosa 500ml', estado: 'recepcion', precio: 400, totalFinal: 400, descripcion: null },
    { numero: 3, clienteId: 3, productoId: 7, tipoItem: 'simple', productoNombre: 'Cable USB-C', estado: 'finalizado', precio: 2500, totalFinal: 2500, descripcion: 'Cable de repuesto' },
    { numero: 4, clienteId: 1, productoId: 9, tipoItem: 'conjunto', productoNombre: 'Combo Hamburguesa', estado: 'entregado', precio: 2500, totalFinal: 2500, descripcion: null },
  ]

  for (const ot of ots) {
    await database.execute(
      `INSERT INTO ordenes_trabajo
       (numero, cliente_id, producto_id, tipo_item, producto_nombre, descripcion, estado, precio, total_final, creado_por, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Administrador', ?, ?)`,
      [ot.numero, ot.clienteId, ot.productoId, ot.tipoItem, ot.productoNombre, ot.descripcion, ot.estado, ot.precio, ot.totalFinal, now, now]
    )
  }

  // Etiqueta urgente en OT 1
  await database.execute(`INSERT INTO ot_etiquetas (ot_id, etiqueta_id) VALUES (1, 1)`, [])
}

async function seedCitasDemo(database: Db) {
  const count = await database.select<{ count: number }[]>('SELECT COUNT(*) as count FROM citas')
  if (count[0].count > 0) return

  const now = new Date()
  const hoy = now.toISOString().split('T')[0]

  const citas = [
    { titulo: 'Reunión con Restaurante El Rincón', clienteId: 1, empleadoId: 1, fechaInicio: `${hoy}T10:00:00`, fechaFin: `${hoy}T11:00:00`, color: '#4A7FA5' },
    { titulo: 'Entrega pedido María González',     clienteId: 2, empleadoId: 2, fechaInicio: `${hoy}T14:00:00`, fechaFin: `${hoy}T14:30:00`, color: '#4CAF7D' },
    { titulo: 'Revisión stock Distribuidora Norte', clienteId: 3, empleadoId: 1, fechaInicio: `${hoy}T16:00:00`, fechaFin: `${hoy}T17:00:00`, color: '#D4921A' },
  ]

  for (const c of citas) {
    await database.execute(
      `INSERT INTO citas (titulo, cliente_id, empleado_id, fecha_inicio, fecha_fin, color, creado_por, creado_en, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, 'Administrador', ?, ?)`,
      [c.titulo, c.clienteId, c.empleadoId, c.fechaInicio, c.fechaFin, c.color, now.toISOString(), now.toISOString()]
    )
  }
}

async function seedCajaDemo(database: Db) {
  const count = await database.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM gastos_operativos'
  )
  if (count[0].count > 0) return

  const now = new Date().toISOString()

  // Cobros demo (además de los que genera el POS)
  const cobros = [
    { monto: 2500, forma: 'efectivo',      concepto: 'OT #001 — Combo Hamburguesa' },
    { monto: 2500, forma: 'transferencia', concepto: 'OT #003 — Cable USB-C' },
    { monto: 400,  forma: 'tarjeta',       concepto: 'Venta POS — Gaseosa' },
  ]
  for (const c of cobros) {
    await database.execute(
      `INSERT INTO cobros_caja (fecha, monto, forma_pago, concepto, creado_en)
       VALUES (?, ?, ?, ?, ?)`,
      [now, c.monto, c.forma, c.concepto, now]
    )
  }

  // Gastos demo
  const gastos = [
    { cat: 'Servicios',  desc: 'Internet del local',    monto: 3500 },
    { cat: 'Insumos',    desc: 'Bolsas y envases',       monto: 1200 },
    { cat: 'Transporte', desc: 'Envío de mercadería',    monto: 800  },
  ]
  for (const g of gastos) {
    await database.execute(
      `INSERT INTO gastos_operativos (fecha, monto, categoria, descripcion, creado_en)
       VALUES (?, ?, ?, ?, ?)`,
      [now, g.monto, g.cat, g.desc, now]
    )
  }
}
