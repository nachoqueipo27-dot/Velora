-- ════════════════════════════════════════════════════════════════
-- Velora — Sistema de usuarios con DNI
-- Ejecutar MANUALMENTE en Supabase → SQL Editor ANTES de usar el .exe.
-- ════════════════════════════════════════════════════════════════

-- 1. Agregar columna dni a usuarios_portal
ALTER TABLE usuarios_portal
  ADD COLUMN IF NOT EXISTS dni TEXT;

-- 2. Índice único por DNI (solo para DNIs no nulos)
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_portal_dni_unique
  ON usuarios_portal(dni)
  WHERE dni IS NOT NULL;

-- 3. Insertar / actualizar el Admin General (vive SOLO en Supabase)
INSERT INTO usuarios_portal
  (supabase_auth_id, nombre, dni, email, rol, activo)
VALUES (
  '1ccf0f28-2324-40b7-a3df-b64184da9066',
  'Administrador',
  '42997462',
  'admin@velora.app',
  'admin_master',
  true
)
ON CONFLICT (email) DO UPDATE SET
  supabase_auth_id = EXCLUDED.supabase_auth_id,
  nombre = EXCLUDED.nombre,
  dni = EXCLUDED.dni,
  rol = EXCLUDED.rol;

-- 4. Tabla de relación usuario ↔ locales
CREATE TABLE IF NOT EXISTS usuario_locales (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID NOT NULL REFERENCES usuarios_portal(id),
  empresa_id  UUID NOT NULL REFERENCES empresas(id),
  local_id    UUID NOT NULL REFERENCES locales(id),
  creado_en   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, local_id)
);

-- 5. RLS
ALTER TABLE usuario_locales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_authenticated" ON usuario_locales;
CREATE POLICY "allow_all_authenticated" ON usuario_locales
  FOR ALL TO authenticated USING (true);
