-- ════════════════════════════════════════════════════════════════
-- Velora — ID único por PC (sistemas registrados)
-- Ejecutar MANUALMENTE en Supabase → SQL Editor.
-- ════════════════════════════════════════════════════════════════

-- Tabla de sistemas registrados
CREATE TABLE IF NOT EXISTS sistemas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  system_id     TEXT NOT NULL UNIQUE,
  nombre        TEXT,
  local_id      UUID REFERENCES locales(id),
  empresa_id    UUID REFERENCES empresas(id),
  version_app   TEXT,
  ultimo_acceso TIMESTAMPTZ DEFAULT NOW(),
  activo        BOOLEAN DEFAULT true,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sistemas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON sistemas;
CREATE POLICY "allow_all_authenticated" ON sistemas
  FOR ALL TO authenticated USING (true);

-- Trazabilidad: system_id en heartbeat y sync_log
ALTER TABLE heartbeat
  ADD COLUMN IF NOT EXISTS system_id TEXT;

ALTER TABLE sync_log
  ADD COLUMN IF NOT EXISTS system_id TEXT;
