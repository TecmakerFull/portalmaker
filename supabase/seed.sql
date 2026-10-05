-- =============================================================================
-- PORTALMAKER — Datos iniciales (seed)
-- "El portal del Maker" | portalmaker.com.ar
--
-- INSTRUCCIONES DE USO:
--   Ejecutar DESPUÉS de supabase/schema.sql
--
-- Este script carga:
--   1. Los tipos de proceso maker (global a la plataforma)
--   2. Tu email como platform_admin
--
-- IMPORTANTE: reemplazá 'tu-email@gmail.com' con tu email real de Google
--   antes de ejecutar este script.
-- =============================================================================


-- =============================================================================
-- 1. TIPOS DE PROCESO
--    Los 4 tipos base. Si en el futuro aparece un nuevo rubro (ej. "Termoformado"),
--    se agrega aquí con un INSERT adicional — sin tocar el schema.
-- =============================================================================
insert into process_types (nombre, slug, orden) values
  ('Impresión 3D',  'impresion-3d',  1),
  ('Grabado Láser', 'grabado-laser', 2),
  ('Corte Láser',   'corte-laser',   3),
  ('Otro',          'otro',          4);


-- =============================================================================
-- 2. PLATFORM ADMIN
--    Reemplazá este email con el tuyo antes de ejecutar.
--    Debe ser el mismo email que usás con Google OAuth.
-- =============================================================================
insert into platform_admins (email) values
  ('tu-email@gmail.com');  -- ← CAMBIAR ANTES DE EJECUTAR


-- =============================================================================
-- 3. TIENDA DE PRUEBA (opcional — comentar si no se necesita)
--    Crea la primera tienda de prueba para desarrollo local.
--    Una vez en producción, las tiendas se dan de alta desde /dashboard/admin.
-- =============================================================================
/*
insert into stores (
  nombre, slug, admin_email,
  color_primario, color_secundario, color_fondo, color_texto,
  color_primario_dark, color_secundario_dark, color_fondo_dark, color_texto_dark
) values (
  'TecMaker 3D',          -- nombre público
  'tecmaker',             -- subdominio: tecmaker.portalmaker.com.ar
  'admin@tecmaker.com',  -- email del admin de esta tienda
  -- Paleta "Industrial" (preset #1)
  '#6B8F71', '#2F3336', '#F5F4F1', '#202224',
  '#82A889', '#44484A', '#1C1E1F', '#EDEDEA'
);
*/


-- =============================================================================
-- 4. PÁGINAS INFORMATIVAS por defecto (para tienda de prueba)
--    Al dar de alta una tienda real, estas páginas se crean automáticamente
--    desde la aplicación con contenido de ejemplo/placeholder.
--    Aquí se dejan como referencia del contenido sugerido.
-- =============================================================================
/*
do $$
declare
  v_store_id uuid;
begin
  select id into v_store_id from stores where slug = 'tecmaker';

  insert into store_pages (store_id, slug, titulo, contenido, visible, orden) values
    (v_store_id, 'sobre-nosotros', 'Sobre Nosotros',
     '<h2>¿Quiénes somos?</h2><p>Contá aquí la historia de tu taller, tu experiencia y qué te apasiona del mundo maker.</p>',
     true, 1),
    (v_store_id, 'contacto', 'Contacto',
     '<p>Usá el formulario o los datos de contacto para escribirnos. Respondemos en menos de 24hs.</p>',
     true, 2),
    (v_store_id, 'preguntas-frecuentes', 'Preguntas Frecuentes',
     '<h3>¿Cuánto tarda un pedido?</h3><p>Completá con los tiempos reales de tu proceso.</p>',
     true, 3),
    (v_store_id, 'envios-y-devoluciones', 'Envíos y Devoluciones',
     '<h3>Opciones de envío</h3><p>Describí tus zonas de cobertura, tiempos y políticas de devolución.</p>',
     true, 4),
    (v_store_id, 'terminos-y-condiciones', 'Términos y Condiciones',
     '<p>Especificá aquí los términos legales aplicables a las compras en tu tienda.</p>',
     true, 5);
end;
$$;
*/
