// =============================================================================
// PORTALMAKER — Carga (solo servidor) de mensajes de confianza y footer
//
// Separado de lib/store-sections.ts porque ese archivo también lo importan
// componentes de cliente y este usa el cliente de Supabase con cookies.
// cache() evita repetir la consulta cuando la portada (franja de confianza) y
// el footer la piden en el mismo request.
// =============================================================================

import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  mergeExtraSections,
  getDefaultExtraSections,
  EXTRA_SECTION_TYPES,
  type StoreExtraSections,
} from '@/lib/store-sections'
import type { Store, StoreSection } from '@/types/database'

const fetchExtraSectionRows = cache(async (storeId: string): Promise<StoreSection[]> => {
  try {
    const supabase = await createSupabaseServerClient()
    const { data } = await supabase
      .from('store_sections')
      .select('*')
      .eq('store_id', storeId)
      .in('section_type', [...EXTRA_SECTION_TYPES])
    return (data as StoreSection[]) ?? []
  } catch {
    return []
  }
})

export async function getStoreExtraSections(store: Store): Promise<StoreExtraSections> {
  try {
    const rows = await fetchExtraSectionRows(store.id)
    return mergeExtraSections(store, rows)
  } catch {
    return getDefaultExtraSections(store)
  }
}
