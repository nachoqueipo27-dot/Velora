-- ═══════════════════════════════════════
-- VELORA — Schema Supabase (Fase 2)
-- Ejecutar MANUALMENTE en el SQL Editor de Supabase
-- (Dashboard → SQL Editor → New query → pegar y Run)
-- ═══════════════════════════════════════

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══ MULTI-TENANT ═══

CREATE TABLE IF NOT EXISTS empresas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre      TEXT NOT NULL,
  logo        TEXT,
  activa      BOOLEAN DEFAULT true,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locales (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id),
  nombre       TEXT NOT NULL,
  logo         TEXT,
  direccion    TEXT,
  activa       BOOLEAN DEFAULT true,
  api_key      TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  ultima_sync  TIMESTAMPTZ,
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usuarios_portal (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supabase_auth_id UUID REFERENCES auth.users(id),
  nombre           TEXT NOT NULL,
  email            TEXT NOT NULL UNIQUE,
  rol              TEXT NOT NULL CHECK (
                     rol IN ('admin_master','admin','supervisor','operario')
                   ),
  empresa_id       UUID REFERENCES empresas(id),
  local_id         UUID REFERENCES locales(id),
  activo           BOOLEAN DEFAULT true,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ SYNC ═══

CREATE TABLE IF NOT EXISTS sync_log (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id             UUID NOT NULL REFERENCES locales(id),
  tipo                 TEXT NOT NULL CHECK (tipo IN ('auto','manual','cierre_dia','pre_operacion')),
  estado               TEXT NOT NULL CHECK (estado IN ('ok','error','parcial')),
  registros_procesados INTEGER DEFAULT 0,
  error_detalle        TEXT,
  fecha                TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ HEARTBEAT ═══

CREATE TABLE IF NOT EXISTS heartbeat (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id         UUID NOT NULL REFERENCES locales(id),
  modulo_activo    TEXT,
  ots_activas      INTEGER DEFAULT 0,
  saldo_caja_hoy   NUMERIC DEFAULT 0,
  empleados_online INTEGER DEFAULT 0,
  version_app      TEXT,
  fecha            TIMESTAMPTZ DEFAULT NOW()
);

-- Solo conservar el último heartbeat por local
CREATE UNIQUE INDEX IF NOT EXISTS heartbeat_local_unique
  ON heartbeat(local_id);

-- ═══ TABLAS ESPEJO (MIRROR) ═══
-- Reciben los datos sincronizados desde el .exe

CREATE TABLE IF NOT EXISTS clientes_mirror (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id       UUID NOT NULL REFERENCES locales(id),
  local_row_id   INTEGER NOT NULL,
  nombre         TEXT NOT NULL,
  telefono       TEXT,
  email          TEXT,
  direccion      TEXT,
  categoria      TEXT DEFAULT 'General',
  notas          TEXT,
  creado_en      TIMESTAMPTZ,
  actualizado_en TIMESTAMPTZ,
  synced_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS empleados_mirror (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id       UUID NOT NULL REFERENCES locales(id),
  local_row_id   INTEGER NOT NULL,
  nombre         TEXT NOT NULL,
  rol_nombre     TEXT,
  activo         BOOLEAN DEFAULT true,
  tipo_horario   TEXT,
  creado_en      TIMESTAMPTZ,
  actualizado_en TIMESTAMPTZ,
  synced_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS productos_mirror (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id       UUID NOT NULL REFERENCES locales(id),
  local_row_id   INTEGER NOT NULL,
  nombre         TEXT NOT NULL,
  tipo           TEXT,
  categoria      TEXT,
  precio         NUMERIC DEFAULT 0,
  precio_costo   NUMERIC DEFAULT 0,
  stock          INTEGER DEFAULT 0,
  stock_minimo   INTEGER DEFAULT 0,
  activo         BOOLEAN DEFAULT true,
  creado_en      TIMESTAMPTZ,
  actualizado_en TIMESTAMPTZ,
  synced_at      TIMESTAMPTZ DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ,
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS ordenes_trabajo_mirror (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id         UUID NOT NULL REFERENCES locales(id),
  local_row_id     INTEGER NOT NULL,
  numero           INTEGER,
  cliente_nombre   TEXT,
  empleado_nombre  TEXT,
  producto_nombre  TEXT,
  tipo_item        TEXT,
  descripcion      TEXT,
  estado           TEXT,
  precio           NUMERIC DEFAULT 0,
  total_final      NUMERIC DEFAULT 0,
  creado_en        TIMESTAMPTZ,
  actualizado_en   TIMESTAMPTZ,
  synced_at        TIMESTAMPTZ DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS presupuestos_mirror (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id        UUID NOT NULL REFERENCES locales(id),
  local_row_id    INTEGER NOT NULL,
  numero          INTEGER,
  cliente_nombre  TEXT,
  estado          TEXT,
  total_final     NUMERIC DEFAULT 0,
  fecha_vigencia  TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ,
  actualizado_en  TIMESTAMPTZ,
  synced_at       TIMESTAMPTZ DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS cobros_caja_mirror (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id      UUID NOT NULL REFERENCES locales(id),
  local_row_id  INTEGER NOT NULL,
  fecha         TIMESTAMPTZ,
  monto         NUMERIC DEFAULT 0,
  forma_pago    TEXT,
  concepto      TEXT,
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS gastos_operativos_mirror (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id      UUID NOT NULL REFERENCES locales(id),
  local_row_id  INTEGER NOT NULL,
  fecha         TIMESTAMPTZ,
  monto         NUMERIC DEFAULT 0,
  categoria     TEXT,
  descripcion   TEXT,
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS cierres_caja_mirror (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id            UUID NOT NULL REFERENCES locales(id),
  local_row_id        INTEGER NOT NULL,
  fecha               DATE,
  total_efectivo      NUMERIC DEFAULT 0,
  total_transferencia NUMERIC DEFAULT 0,
  total_tarjeta       NUMERIC DEFAULT 0,
  total_ingresos      NUMERIC DEFAULT 0,
  total_gastos        NUMERIC DEFAULT 0,
  saldo_neto          NUMERIC DEFAULT 0,
  cerrado_por         TEXT,
  synced_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS cierres_mes_mirror (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id             UUID NOT NULL REFERENCES locales(id),
  local_row_id         INTEGER NOT NULL,
  anio                 INTEGER,
  mes                  INTEGER,
  total_ingresos       NUMERIC DEFAULT 0,
  total_gastos         NUMERIC DEFAULT 0,
  margen_operativo     NUMERIC DEFAULT 0,
  ots_completadas      INTEGER DEFAULT 0,
  ots_canceladas       INTEGER DEFAULT 0,
  producto_mas_vendido TEXT,
  empleado_destacado   TEXT,
  cerrado_por          TEXT,
  synced_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS fichajes_mirror (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id         UUID NOT NULL REFERENCES locales(id),
  local_row_id     INTEGER NOT NULL,
  empleado_nombre  TEXT,
  fecha            DATE,
  entrada          TEXT,
  salida           TEXT,
  horas_trabajadas NUMERIC,
  synced_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(local_id, local_row_id)
);

CREATE TABLE IF NOT EXISTS movimientos_stock_mirror (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id       UUID NOT NULL REFERENCES locales(id),
  local_row_id   INTEGER NOT NULL,
  producto_nombre TEXT,
  tipo           TEXT,
  cantidad       INTEGER,
  motivo         TEXT,
  fecha          TIMESTAMPTZ,
  synced_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(local_id, local_row_id)
);

-- ═══ PORTAL FEATURES ═══

CREATE TABLE IF NOT EXISTS objetivos (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id       UUID NOT NULL REFERENCES locales(id),
  periodo_anio   INTEGER NOT NULL,
  periodo_mes    INTEGER NOT NULL,
  tipo           TEXT NOT NULL CHECK (
                   tipo IN ('facturacion','ots','cancelaciones','ticket_promedio')
                 ),
  valor_objetivo NUMERIC NOT NULL,
  creado_por     TEXT NOT NULL,
  creado_en      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decisiones (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id       UUID NOT NULL REFERENCES locales(id),
  usuario        TEXT NOT NULL,
  tipo           TEXT NOT NULL CHECK (tipo IN ('manual','automatica')),
  modulo         TEXT,
  accion         TEXT NOT NULL,
  detalle        TEXT,
  entidad_tipo   TEXT,
  entidad_id     TEXT,
  valor_anterior JSONB,
  valor_nuevo    JSONB,
  fecha          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confirmaciones_cierre (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id        UUID NOT NULL REFERENCES locales(id),
  fecha_caja      DATE NOT NULL,
  estado          TEXT NOT NULL DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','aprobado','revision')),
  resumen_json    JSONB,
  solicitado_en   TIMESTAMPTZ DEFAULT NOW(),
  confirmado_por  TEXT,
  confirmado_en   TIMESTAMPTZ,
  comentario      TEXT,
  UNIQUE(local_id, fecha_caja)
);

CREATE TABLE IF NOT EXISTS reportes_email (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  local_id        UUID NOT NULL REFERENCES locales(id),
  tipo            TEXT NOT NULL,
  frecuencia      TEXT NOT NULL CHECK (
                    frecuencia IN ('diario','semanal','mensual','por_evento')
                  ),
  hora_envio      TEXT,
  dia_semana      INTEGER,
  destinatarios   TEXT[] NOT NULL DEFAULT '{}',
  activo          BOOLEAN DEFAULT true,
  ultimo_envio    TIMESTAMPTZ,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══ ROW LEVEL SECURITY ═══

ALTER TABLE empresas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE locales                ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_portal        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_mirror        ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados_mirror       ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos_mirror       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_trabajo_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos_mirror    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros_caja_mirror     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_operativos_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_caja_mirror    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_mes_mirror     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichajes_mirror        ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock_mirror ENABLE ROW LEVEL SECURITY;
ALTER TABLE objetivos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisiones             ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmaciones_cierre  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reportes_email         ENABLE ROW LEVEL SECURITY;

-- Política base: el .exe usa service_role key para sync
-- El portal usa anon key con JWT claims
-- Por ahora política permisiva para desarrollo:

CREATE POLICY "allow_all_authenticated" ON empresas
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON locales
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON usuarios_portal
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON sync_log
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON heartbeat
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON clientes_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON empleados_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON productos_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON ordenes_trabajo_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON presupuestos_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON cobros_caja_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON gastos_operativos_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON cierres_caja_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON cierres_mes_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON fichajes_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON movimientos_stock_mirror
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON objetivos
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON decisiones
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON confirmaciones_cierre
  FOR ALL TO authenticated USING (true);
CREATE POLICY "allow_all_authenticated" ON reportes_email
  FOR ALL TO authenticated USING (true);

-- ═══ DATOS INICIALES DE PRUEBA ═══

-- Empresa demo
INSERT INTO empresas (id, nombre, activa)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Mi Negocio Demo',
  true
) ON CONFLICT DO NOTHING;

-- Local demo
INSERT INTO locales (id, empresa_id, nombre, direccion)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Local Principal',
  'Dirección del local'
) ON CONFLICT DO NOTHING;
