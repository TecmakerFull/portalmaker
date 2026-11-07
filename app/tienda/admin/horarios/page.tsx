// =============================================================================
// PORTALMAKER — Panel: Horarios y reglas de turnos
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ensureBookingSetup } from '@/lib/booking/setup'
import { getRequestOrigin } from '@/lib/store-metadata'
import HorariosManager from './horarios-manager'
import type { StaffBlock } from '@/types/database'

export default async function AdminHorariosPage() {
  const tenant = await getTenantStore()
  if (!tenant) notFound()

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''
  // Revalidación de permisos: ensureBookingSetup usa service_role y las
  // páginas se ejecutan en paralelo con el layout que hace el chequeo.
  if (!(await isStoreAdmin(store))) notFound()

  const { settings, staff } = await ensureBookingSetup(store)

  const supabase = await createSupabaseServerClient()
  const { data: bloqueos } = await supabase
    .from('staff_blocks')
    .select('*')
    .eq('store_id', store.id)
    .gte('ends_at', new Date().toISOString())
    .order('starts_at', { ascending: true })

  return (
    <div className="w-full space-y-6">
      <HorariosManager
        store={store}
        initialSettings={settings}
        initialStaff={staff}
        initialBloqueos={(bloqueos as StaffBlock[]) ?? []}
        origin={await getRequestOrigin()}
        tenantQuery={tenantQuery}
      />
    </div>
  )
}
