// =============================================================================
// PORTALMAKER — Panel de Control del Maker (Paleta 06: Yellow & Gray)
// =============================================================================

import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import ThemeToggle from '@/app/tienda/theme-toggle'
import { Store, ExternalLink, LogOut, Package, Palette } from 'lucide-react'
import CrearTiendaForm from './crear-tienda-form'

export default async function MakerDashboardPage() {
  const supabase = await createSupabaseServerClient()

  // 1. Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  // 2. Verificar si es platform_admin
  const { data: platformAdmin } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('email', user.email)
    .single()

  const isSuperadmin = Boolean(platformAdmin) || user.email === 'temperini@gmail.com'

  // 3. Buscar si el maker ya tiene una tienda asignada
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .eq('admin_email', user.email)
    .order('created_at', { ascending: false })

  const userStores = stores ?? []

  // Si el usuario ya tiene su tienda, enviarlo directamente a su panel admin de tienda
  if (userStores.length === 1) {
    redirect(`/tienda/admin?tenant=${userStores[0].slug}`)
  }

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] pb-16 transition-colors duration-200">
      {/* Header del Dashboard */}
      <header className="bg-[var(--color-superficie)] border-b border-[var(--color-borde)] sticky top-0 z-20 transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo.png"
                alt="Portalmaker"
                width={34}
                height={34}
                className="w-8 h-8 rounded-xl object-contain shadow-2xs"
              />
              <span className="text-xl font-bold tracking-tight font-[var(--font-portal-heading)]">
                Portalmaker
              </span>
            </Link>

            {isSuperadmin && (
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-[#FACC15]/20 border border-[#FACC15]/50 text-amber-900 dark:text-amber-200 hover:bg-[#FACC15]/30 transition-colors"
              >
                <span>Panel Superadmin</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="text-xs sm:text-sm opacity-60 hidden sm:inline font-mono">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="min-h-[40px] px-3 py-2 text-xs sm:text-sm font-medium opacity-80 hover:opacity-100 flex items-center gap-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10">
        {userStores.length > 0 ? (
          <div>
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[var(--font-portal-heading)]">
                Panel de Maker
              </h1>
              <p className="text-sm opacity-70 mt-1">
                Gestiona tus tiendas virtuales, productos y configuración de marca.
              </p>
            </div>

            <div className="space-y-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Store className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Tus Tiendas Activas</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {userStores.map((store) => (
                  <div
                    key={store.id}
                    className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-xl font-bold font-[var(--font-portal-heading)]">{store.nombre}</h3>
                          <p className="text-xs font-mono opacity-60 mt-0.5">
                            {store.slug}.portalmaker.ar
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {store.suscripcion_activa ? 'Activa' : 'En prueba'}
                        </span>
                      </div>

                      {store.slogan && (
                        <p className="text-sm opacity-75 mb-4 italic">
                          &quot;{store.slogan}&quot;
                        </p>
                      )}

                      {/* Previsualización rápida de paleta */}
                      <div className="flex items-center gap-2 py-3 px-3.5 bg-black/5 dark:bg-white/5 rounded-2xl mb-5">
                        <span className="text-xs font-bold opacity-60">Colores:</span>
                        <div
                          className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-xs"
                          style={{ backgroundColor: store.color_primario }}
                          title="Color primario"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-xs"
                          style={{ backgroundColor: store.color_secundario }}
                          title="Color secundario"
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shadow-xs"
                          style={{ backgroundColor: store.color_fondo }}
                          title="Color fondo"
                        />
                        <span className="text-xs opacity-50 ml-auto font-mono">
                          {store.font_heading || 'Inter'}
                        </span>
                      </div>
                    </div>

                    {/* Acciones principales */}
                    <div className="space-y-2 pt-2 border-t border-[var(--color-borde)]">
                      <Link
                        href={`/tienda/admin?tenant=${store.slug}`}
                        style={{ color: '#1F2937' }}
                        className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] transition-all shadow-xs"
                      >
                        <Store className="w-4 h-4 text-[#1F2937]" />
                        <span>Administrar Mi Tienda</span>
                      </Link>

                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/tienda/admin/productos?tenant=${store.slug}`}
                          className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-borde)] text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all opacity-85 hover:opacity-100"
                        >
                          <Package className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                          <span>Productos</span>
                        </Link>

                        <Link
                          href={`/tienda?tenant=${store.slug}`}
                          target="_blank"
                          className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--color-borde)] text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all opacity-85 hover:opacity-100"
                        >
                          <ExternalLink className="w-4 h-4 opacity-60" />
                          <span>Ver Tienda</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Maker sin tienda creada: Formulario de bienvenida perfectamente centrado */
          <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center py-6">
            <div className="w-full max-w-lg bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-9 shadow-xl transition-colors duration-200">
              <div className="text-center mb-6">
                <Image
                  src="/logo.png"
                  alt="Portalmaker"
                  width={52}
                  height={52}
                  className="w-13 h-13 rounded-2xl object-contain mx-auto mb-3.5 shadow-md"
                />
                <h1 className="text-2xl font-bold tracking-tight font-[var(--font-portal-heading)]">
                  ¡Crea tu tienda Maker!
                </h1>
                <p className="text-xs sm:text-sm opacity-70 mt-1 max-w-sm mx-auto">
                  En menos de un minuto tendrás tu catálogo online listo para publicar productos y recibir consultas.
                </p>
              </div>

              <CrearTiendaForm userEmail={user.email} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
