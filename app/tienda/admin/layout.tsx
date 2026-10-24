// =============================================================================
// PORTALMAKER — Layout del Panel Admin de Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { Package, Palette, Store, ExternalLink, ArrowLeft, LogIn } from 'lucide-react'

import AdminSidebar from './sidebar'

// Variables de estilo aisladas para el portal de administración.
// Garantiza que la identidad de Portalmaker (Paleta 06 Industrial Yellow & Gray)
// se use en todo el panel de configuración, independientemente de los colores de la tienda.
const portalAdminStyles: React.CSSProperties = {
  '--tenant-primario': '#FACC15',
  '--tenant-primario-texto': '#111827',
  '--tenant-primario-legible': '#CA8A04',
  '--tenant-secundario': '#4B5563',
  '--tenant-secundario-texto': '#FFFFFF',
  '--tenant-secundario-legible': '#374151',
  '--tenant-fondo': '#F3F4F6',
  '--tenant-texto': '#111827',
  '--tenant-primario-dark': '#FACC15',
  '--tenant-primario-dark-texto': '#111827',
  '--tenant-primario-dark-legible': '#FACC15',
  '--tenant-secundario-dark': '#9CA3AF',
  '--tenant-secundario-dark-texto': '#FFFFFF',
  '--tenant-secundario-dark-legible': '#9CA3AF',
  '--tenant-fondo-dark': '#111827',
  '--tenant-texto-dark': '#F9FAFB',
} as React.CSSProperties

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
    const isCustom = context.resolved_by === 'custom_domain'
    const adminDestination = `/tienda/admin?tenant=${store.slug}`
    const loginUrl = isCustom
      ? `https://portalmaker.ar/login?next=${encodeURIComponent(`https://portalmaker.ar${adminDestination}`)}`
      : `/login?next=${encodeURIComponent(tenantQuery ? `/tienda/admin${tenantQuery}` : adminDestination)}`

    return (
      <div
        style={portalAdminStyles}
        className="portal-admin-root min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] flex items-center justify-center p-4"
      >
        <div className="max-w-md w-full bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/20 text-[#CA8A04] mx-auto flex items-center justify-center mb-4">
            <Store className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold font-[var(--font-portal-heading)] mb-2">Acceso a la Administración</h2>
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

  return (
    <div
      style={portalAdminStyles}
      className="portal-admin-root min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] flex flex-col md:flex-row transition-colors duration-200"
    >
      {/* Sidebar Expandible */}
      <AdminSidebar store={store} tenantQuery={tenantQuery} />

      {/* Contenedor del Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-[1680px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
