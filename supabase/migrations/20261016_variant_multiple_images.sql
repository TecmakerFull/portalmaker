-- =============================================================================
-- Migración: Soporte para múltiples fotos por variante (Estilo Mercado Libre)
-- =============================================================================

alter table product_variants
  add column if not exists imagenes text[] default '{}'::text[];

-- Migrar retroactivamente la foto única actual a la lista de imágenes de la variante
update product_variants
set imagenes = array[imagen_url]
where imagen_url is not null and (imagenes is null or cardinality(imagenes) = 0);
