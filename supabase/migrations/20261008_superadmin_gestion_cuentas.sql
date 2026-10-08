-- =============================================================================
-- PORTALMAKER — Migración: Gestión Avanzada de Cuentas y Suscripciones para Superadmin
-- =============================================================================

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'maker_pro',
  ADD COLUMN IF NOT EXISTS precio_mensual NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_pago TEXT DEFAULT 'al_dia',
  ADD COLUMN IF NOT EXISTS limite_productos INT DEFAULT 50,
  ADD COLUMN IF NOT EXISTS notas_admin TEXT;

-- Comentario explicativo
COMMENT ON COLUMN stores.plan IS 'Plan contratado: starter, maker_pro, enterprise, bonificado';
COMMENT ON COLUMN stores.estado_pago IS 'Estado del cobro: al_dia, pendiente, bonificado, gracia, vencido';
COMMENT ON COLUMN stores.limite_productos IS 'Límite máximo de productos permitidos según el plan (ej: 15, 50, 500)';
COMMENT ON COLUMN stores.notas_admin IS 'Anotaciones internas del superadmin sobre el cliente o acuerdos de pago';
