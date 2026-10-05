// =============================================================================
// PORTALMAKER — Route Handler de Cierre de Sesión (Sign Out)
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  const url = new URL('/', request.url)
  return NextResponse.redirect(url, { status: 302 })
}
