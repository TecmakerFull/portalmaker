-- =============================================================================
-- PORTALMAKER — Envíos Fase 1: defensa en profundidad
-- Supabase otorga SELECT a `anon` por default privileges en tablas nuevas.
-- Las políticas RLS ya lo bloquean (no hay fuga), pero estas tablas contienen
-- datos de envíos/pedidos que anon nunca debe poder consultar: se revoca el
-- privilegio para que no dependa solo de RLS. Operación solo de permisos
-- (no toca datos), idempotente.
-- =============================================================================

revoke select on public.shipments, public.shipment_events, public.order_events from anon;
