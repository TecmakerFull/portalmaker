// =============================================================================
// PORTALMAKER — Panel Admin: Personalización de Diseño y Secciones del Storefront
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation';
import { getTenantStore } from '@/lib/tenant';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getStoreSections } from '@/lib/store-sections';
import { DisenoManager } from './diseno-manager';

export default async function AdminDisenoPage() {
  const tenant = await getTenantStore();

  if (!tenant) {
    notFound();
  }

  const { store, context } = tenant;
  const tenantQuery =
    context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : '';

  const supabase = await createSupabaseServerClient();

  // 1. Obtener las secciones del storefront estructuradas
  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    false
  );

  // 2. Obtener lista de categorías para selectores de navegación y CTA
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true });

  // 3. Obtener lista de productos para selectores
  const { data: products } = await supabase
    .from('products')
    .select('id, nombre, slug, visible')
    .eq('store_id', store.id)
    .order('nombre', { ascending: true });

  // 4. Obtener lista de páginas estáticas de la tienda
  const { data: pages } = await supabase
    .from('store_pages')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      <DisenoManager
        store={store}
        initialSections={resolvedSections.sectionsList}
        categories={categories ?? []}
        products={(products as any) ?? []}
        pages={pages ?? []}
        tenantQuery={tenantQuery}
      />
    </div>
  );
}
