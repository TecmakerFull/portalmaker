// =============================================================================
// PORTALMAKER — Layout del Panel Admin de Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import ThemeToggle from '@/app/tienda/theme-toggle'
import { Package, Palette, Store, ExternalLink, ArrowLeft, LogIn } from 'lucide-react'

import AdminSidebar from './sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const isAdmin = await isStoreAdmin(store)
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/20 text-[#CA8A04] mx-auto flex items-center justify-center mb-4">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-[var(--font-heading)] mb-2">Acceso a la Administración</h2>
          <p className="text-sm opacity-70 mb-6">
            Para gestionar la tienda <strong>{store.nombre}</strong> debes iniciar sesión con la cuenta administradora (<code>{store.admin_email}</code>).
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
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

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] flex flex-col md:flex-row transition-colors duration-200">
      {/* Sidebar Expandible */}
      <AdminSidebar store={store} tenantQuery={tenantQuery} />

      {/* Contenedor del Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
