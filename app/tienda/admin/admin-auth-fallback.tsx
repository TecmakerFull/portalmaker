'use client'

// =============================================================================
// PORTALMAKER — Admin Auth Fallback con Rehidratación de Sesión desde Navegador
// =============================================================================

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store as StoreIcon, ExternalLink, LogIn, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store as StoreType } from '@/types/database'

interface AdminAuthFallbackProps {
  store: StoreType
  loginUrl: string
  tenantQuery: string
}

export default function AdminAuthFallback({
  store,
  loginUrl,
  tenantQuery,
}: AdminAuthFallbackProps) {
  const router = useRouter()
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function checkClientSession() {
      try {
        const supabase = createSupabaseBrowserClient()
        // Verificar si existe sesión activa guardada en localStorage o cookies del navegador
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user?.email) {
          if (isMounted) setCheckingSession(false)
          return
        }

        const userEmail = session.user.email.trim().toLowerCase()
        const storeAdminEmail = (store.admin_email || '').trim().toLowerCase()

        // Si es el dueño de la tienda
        if (storeAdminEmail && userEmail === storeAdminEmail) {
          // Refrescar para que el Server Component tome las cookies actualizadas
          router.refresh()
          return
        }

        // Si es superadmin de la plataforma
        const { data: platformAdmin } = await supabase
          .from('platform_admins')
          .select('id')
          .ilike('email', userEmail)
          .maybeSingle()

        if (platformAdmin) {
          router.refresh()
          return
        }

        // Si es colaborador activo
        const { data: collab } = await supabase
          .from('store_collaborators')
          .select('id')
          .eq('store_id', store.id)
          .ilike('email', userEmail)
          .eq('estado', 'activo')
          .maybeSingle()

        if (collab) {
          router.refresh()
          return
        }

        // Si está logueado pero no tiene permisos para esta tienda
        if (isMounted) setCheckingSession(false)
      } catch {
        if (isMounted) setCheckingSession(false)
      }
    }

    checkClientSession()

    return () => {
      isMounted = false
    }
  }, [router, store.admin_email, store.id])

  if (checkingSession) {
    return (
      <div className="portal-admin-root min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/20 text-[#CA8A04] mx-auto flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-[#CA8A04]" />
          </div>
          <h2 className="text-lg font-bold font-[var(--font-portal-heading)] mb-1">
            Comprobando sesión...
          </h2>
          <p className="text-xs opacity-70">
            Sincronizando credenciales de administración
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="portal-admin-root min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-8 text-center shadow-lg">
        <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/20 text-[#CA8A04] mx-auto flex items-center justify-center mb-4">
          <StoreIcon className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold font-[var(--font-portal-heading)] mb-2">
          Acceso a la Administración
        </h2>
        <p className="text-sm opacity-70 mb-6">
          Para gestionar la tienda <strong>{store.nombre}</strong> debes iniciar sesión con una cuenta autorizada (propietario o colaborador invitado).
        </p>
        <div className="space-y-3">
          <Link
            href={loginUrl}
            style={{ color: '#1F2937' }}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] transition-all shadow-xs"
          >
            <LogIn className="w-4 h-4 text-[#1F2937]" />
            <span>Iniciar Sesión</span>
          </Link>
          <Link
            href={`/tienda${tenantQuery}`}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--color-borde)] text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all opacity-80 hover:opacity-100"
          >
            <ExternalLink className="w-4 h-4 opacity-50" />
            <span>Ver Tienda Pública</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
