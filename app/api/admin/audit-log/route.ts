import { NextRequest, NextResponse } from 'next/server'
import { verifySuperadmin } from '@/lib/store-auth'

/**
 * GET /api/admin/audit-log
 * Retorna entradas de auditoría de configuración (planes y overrides de tiendas).
 */
export async function GET(req: NextRequest) {
  const auth = await verifySuperadmin()
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const targetType = searchParams.get('target_type')
  const targetId = searchParams.get('target_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)

  const { supabaseAdmin } = auth
  let query = supabaseAdmin
    .from('config_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (targetType) {
    query = query.eq('target_type', targetType)
  }
  if (targetId) {
    query = query.eq('target_id', targetId)
  }

  const { data: logs, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: logs || [] })
}

