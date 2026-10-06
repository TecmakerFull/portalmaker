// =============================================================================
// PORTALMAKER — Editar Producto Existente
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ProductoForm from '../producto-form'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: PageProps) {
  const { id } = await params
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Cargar el producto
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('store_id', store.id)
    .single()

  if (!product) {
    notFound()
  }

  // Cargar detalles extendidos (dimensiones, peso)
  const { data: details } = await supabase
    .from('product_details')
    .select('*')
    .eq('product_id', id)
    .maybeSingle()

  // Cargar variantes / atributos
  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', id)
    .order('orden', { ascending: true })

  // Cargar categorías existentes
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('orden', { ascending: true })

  return (
    <ProductoForm
      store={store}
      initialProduct={product}
      initialDetails={details}
      initialVariants={variants ?? []}
      categories={categories ?? []}
      tenantQuery={tenantQuery}
    />
  )
}
