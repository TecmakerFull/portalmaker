// =============================================================================
// PORTALMAKER — Panel de Control del Maker (Dashboard)
// "El portal del Maker" | portalmaker.com.ar
//
// Permite al maker ver el estado de su tienda, acceder al panel de administración
// o crear su primera tienda si es nuevo en la plataforma.
// =============================================================================

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Store, ExternalLink, Settings, PlusCircle, LogOut, Package, Palette } from 'lucide-react'
import CrearTiendaForm from './crear-tienda-form'

export default async function MakerDashboardPage() {
  const supabase = await createSupabaseServerClient()

  // 1. Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    redirect('/login')
  }

  // 2. Buscar si el maker ya tiene una tienda asignada
  const { data: stores, error } = await supabase
    .from('stores')
    .select('*')
    .eq('admin_email', user.email)
    .order('created_at', { ascending: false })

  const userStores = stores ?? []

  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#202224] font-sans pb-16">
      {/* Header del Dashboard */}
      <header className="bg-white border-b border-black/10 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-[#6B8F71]">
            Portalmaker
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm text-black/60 hidden sm:inline">
              {user.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="min-h-[40px] px-3 py-2 text-xs sm:text-sm font-medium text-black/70 hover:text-black flex items-center gap-1.5 rounded-lg hover:bg-black/5 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>Salir</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Panel de Maker
          </h1>
          <p className="text-sm sm:text-base text-black/60 mt-1">
            Gestiona tus tiendas virtuales, productos y configuración de marca.
          </p>
        </div>

        {userStores.length > 0 ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Store className="w-5 h-5 text-[#6B8F71]" />
              <span>Tus Tiendas Activas</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {userStores.map((store) => (
                <div
                  key={store.id}
                  className="bg-white rounded-2xl border border-black/10 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-black/90">{store.nombre}</h3>
                        <p className="text-xs font-mono text-black/50 mt-0.5">
                          {store.slug}.portalmaker.com.ar
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {store.suscripcion_activa ? 'Activa' : 'En prueba'}
                      </span>
                    </div>

                    {store.slogan && (
                      <p className="text-sm text-black/70 mb-4 italic">
                        &quot;{store.slogan}&quot;
                      </p>
                    )}

                    {/* Previsualización rápida de paleta */}
                    <div className="flex items-center gap-2 py-3 px-3.5 bg-black/5 rounded-xl mb-5">
                      <span className="text-xs font-medium text-black/60">Colores:</span>
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                        style={{ backgroundColor: store.color_primario }}
                        title="Color primario"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                        style={{ backgroundColor: store.color_secundario }}
                        title="Color secundario"
                      />
                      <div
                        className="w-4 h-4 rounded-full border border-black/20 shadow-sm"
                        style={{ backgroundColor: store.color_fondo }}
                        title="Color fondo"
                      />
                      <span className="text-xs text-black/50 ml-auto font-mono">
                        {store.font_heading || 'Inter'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones principales */}
                  <div className="space-y-2 pt-2 border-t border-black/5">
                    <Link
                      href={`/tienda/admin/productos?tenant=${store.slug}`}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6B8F71] text-white text-sm font-semibold hover:bg-[#58775d] transition-all"
                    >
                      <Package className="w-4 h-4" />
                      <span>Cargar y Gestionar Productos</span>
                    </Link>

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href={`/tienda/admin/branding?tenant=${store.slug}`}
                        className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-black/15 bg-white text-xs sm:text-sm font-medium hover:bg-black/5 transition-all text-black/80"
                      >
                        <Palette className="w-4 h-4 text-[#6B8F71]" />
                        <span>Colores & Marca</span>
                      </Link>

                      <Link
                        href={`/tienda?tenant=${store.slug}`}
                        target="_blank"
                        className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-black/15 bg-white text-xs sm:text-sm font-medium hover:bg-black/5 transition-all text-black/80"
                      >
                        <ExternalLink className="w-4 h-4 text-black/50" />
                        <span>Ver Tienda</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Maker sin tienda creada: Formulario de bienvenida */
          <div className="bg-white rounded-2xl border border-black/10 p-6 sm:p-8 max-w-xl shadow-sm">
            <div className="flex items-center gap-3 mb-4 text-[#6B8F71]">
              <PlusCircle className="w-7 h-7 shrink-0" />
              <h2 className="text-xl font-bold text-black">Crea tu primera tienda Maker</h2>
            </div>
            <p className="text-sm text-black/70 mb-6">
              Ingresa los datos iniciales de tu emprendimiento. Podrás cambiar los colores, tipografía y productos en cualquier momento.
            </p>

            <CrearTiendaForm userEmail={user.email} />
          </div>
        )}
      </main>
    </div>
  )
}
