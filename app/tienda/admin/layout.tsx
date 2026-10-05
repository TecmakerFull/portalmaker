// =============================================================================
// PORTALMAKER — Layout del Panel Admin de Tienda
// "El portal del Maker" | portalmaker.com.ar
//
// Protege el acceso asegurando que solo el dueño (admin_email) pueda
// gestionar los productos y configuración de su tienda.
// =============================================================================

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { Package, Palette, Store, ExternalLink, ArrowLeft, LogIn } from 'lucide-react'

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

  // Tenant slug para mantener en los links en desarrollo local (?tenant=slug)
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  // Si no es el admin de esta tienda, mostrar pantalla de bloqueo amigable
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F4F1] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-black/10 p-6 sm:p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center mb-4">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-black mb-2">Acceso a la Administración</h2>
          <p className="text-sm text-black/60 mb-6">
            Para gestionar la tienda <strong>{store.nombre}</strong> debes iniciar sesión con la cuenta de email administradora (<code>{store.admin_email}</code>).
          </p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6B8F71] text-white text-sm font-semibold hover:bg-[#58775d] transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión</span>
            </Link>
            <Link
              href={`/tienda${tenantQuery}`}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-black/15 text-sm font-medium hover:bg-black/5 transition-all text-black/80"
            >
              <ExternalLink className="w-4 h-4 text-black/50" />
              <span>Ver Tienda Pública</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F8F7] text-[#202224] font-sans flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-black/10 flex flex-col shrink-0">
        {/* Header del Sidebar */}
        <div className="p-5 border-b border-black/10 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B8F71]">
              Panel de Tienda
            </span>
            <h2 className="text-lg font-bold text-black/90 truncate max-w-[180px]">
              {store.nombre}
            </h2>
          </div>
          <Link
            href="/dashboard/maker"
            title="Volver al Portal Maker"
            className="p-2 rounded-lg hover:bg-black/5 text-black/60 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Navegación */}
        <nav className="p-3 space-y-1 flex-1">
          <Link
            href={`/tienda/admin/productos${tenantQuery}`}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-black/80 hover:bg-black/5 hover:text-black transition-colors"
          >
            <Package className="w-4 h-4 text-[#6B8F71]" />
            <span>Productos</span>
          </Link>

          <Link
            href={`/tienda/admin/branding${tenantQuery}`}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-black/80 hover:bg-black/5 hover:text-black transition-colors"
          >
            <Palette className="w-4 h-4 text-[#6B8F71]" />
            <span>Colores y Marca</span>
          </Link>

          <div className="pt-4 mt-4 border-t border-black/5">
            <Link
              href={`/tienda${tenantQuery}`}
              target="_blank"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-black/60 hover:bg-black/5 hover:text-black transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Store className="w-4 h-4 text-black/50" />
                <span>Ver Tienda</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-black/40" />
            </Link>
          </div>
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-black/10 text-xs text-black/50 flex items-center justify-between">
          <span className="truncate">{store.admin_email}</span>
        </div>
      </aside>

      {/* Contenedor del Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
