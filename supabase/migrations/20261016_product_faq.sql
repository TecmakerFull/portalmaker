-- =============================================================================
-- Migración: Soporte para Preguntas Frecuentes (FAQ) en Ficha de Producto
-- =============================================================================

alter table product_details
  add column if not exists preguntas_frecuentes jsonb default '[]'::jsonb;
