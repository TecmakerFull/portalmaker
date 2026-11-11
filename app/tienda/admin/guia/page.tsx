// =============================================================================
// PORTALMAKER — Página de Manual / Guía Paso a Paso para la Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import GuiaView from './guia-view'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getEffectiveStoreConfig } from '@/lib/config/store-config'
import { PLANS_CONFIG } from '@/lib/plans'

export default async function AdminGuiaPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  // La comisión que se muestra es la que realmente se cobra: la del plan de la tienda o su
  // excepción acordada. Las comisiones de cada plan salen de la tabla `plans` (editable por
  // el superadmin) y solo caen a lib/plans.ts si la tabla no responde.
  const config = await getEffectiveStoreConfig(store.id)
  const supabase = await createSupabaseServerClient()
  const { data: planRows } = await supabase.from('plans').select('id, commission_pct').in('id', ['free', 'starter', 'maker_pro', 'enterprise'])
  const planCommissions = Object.fromEntries(
    (['free', 'starter', 'maker_pro', 'enterprise'] as const).map((id) => {
      const row = (planRows ?? []).find((r) => r.id === id)
      return [id, row ? Number(row.commission_pct) : PLANS_CONFIG[id].comisionPortalmakerPct]
    })
  ) as Record<'free' | 'starter' | 'maker_pro' | 'enterprise', number>

  return (
    <GuiaView
      store={store}
      tenantQuery={tenantQuery}
      commission={{ pct: Number(config.commission_pct) || 0, source: config.commission_source }}
      planCommissions={planCommissions}
    />
  )
}
