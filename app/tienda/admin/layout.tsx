// =============================================================================
// PORTALMAKER — Layout del Panel Admin de Tienda
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { Package, Palette, Store, ExternalLink, ArrowLeft, LogIn } from 'lucide-react'

import AdminSidebar from './sidebar'
import AdminAuthFallback from './admin-auth-fallback'

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
      <div style={portalAdminStyles}>
        <AdminAuthFallback
          store={store}
          loginUrl={loginUrl}
          tenantQuery={tenantQuery}
        />
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
