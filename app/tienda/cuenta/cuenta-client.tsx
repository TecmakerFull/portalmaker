// =============================================================================
// PORTALMAKER — Vista Interactiva de Cuenta de Cliente (Client Component)
// Permite login, registro, visualización de favoritos, historial de pedidos y reseñas.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Store, ProductReview } from '@/types/database'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/cart-context'
import {
  UserRound,
  Heart,
  ShoppingBag,
  ArrowRight,
  Check,
  Star,
  Clock,
  Loader2,
  Mail,
  Lock,
  User,
  LogOut,
  AlertCircle,
  Package,
} from 'lucide-react'

interface CuentaClientProps {
  store: Store
  tenantQuery: string
}

export default function CuentaClient({ store, tenantQuery }: CuentaClientProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { favorites } = useCart()

  // Estados de autenticación
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ email: string; nombre: string } | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [nombreInput, setNombreInput] = useState('')
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)

  // Datos del cliente logueado
  const [orders, setOrders] = useState<any[]>([])
  const [reviews, setReviews] = useState<(ProductReview & { product?: { nombre: string; slug: string } | null })[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState<'resumen' | 'pedidos' | 'resenas'>('resumen')

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  // Formato ARS
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val)
  }

  // Cargar pedidos y reseñas del usuario
  const loadCustomerData = async (email: string) => {
    setLoadingData(true)
    try {
      const cleanEmail = email.toLowerCase()

      // Pedidos
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store.id)
        .eq('email_comprador', cleanEmail)
        .order('created_at', { ascending: false })

      // Reseñas
      const { data: revs } = await supabase
        .from('product_reviews')
        .select('*, product:products(nombre, slug)')
        .eq('store_id', store.id)
        .eq('user_email', cleanEmail)
        .order('created_at', { ascending: false })

      setOrders(ords || [])
      setReviews((revs as any[]) || [])
    } catch (e) {
      console.error('Error al cargar datos del cliente:', e)
    } finally {
      setLoadingData(false)
    }
  }

  // Registrar login en store_customers para CRM
  const syncCustomerCrm = async (email: string, nombre?: string) => {
    try {
      await supabase.from('store_customers').upsert(
        {
          store_id: store.id,
          email: email.toLowerCase(),
          nombre: nombre || email.split('@')[0],
          ultimo_login: new Date().toISOString(),
        },
        { onConflict: 'store_id,email' }
      )
    } catch (e) {
      console.error('Error sincronizando CRM de cliente:', e)
    }
  }

  // Comprobar sesión de Supabase al montar
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const name = user.user_metadata?.nombre || user.email.split('@')[0]
        setCurrentUser({ email: user.email, nombre: name })
        setIsLoggedIn(true)
        await syncCustomerCrm(user.email, name)
        await loadCustomerData(user.email)
      }
    }
    checkUser()
  }, [])

  // Iniciar Sesión o Registrarse
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)
    setLoadingAuth(true)

    const cleanEmail = emailInput.trim().toLowerCase()

    try {
      if (isRegister) {
        // Registro
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: passwordInput,
          options: {
            data: { nombre: nombreInput || cleanEmail.split('@')[0] },
          },
        })

        if (error) throw error

        if (data.user) {
          const name = nombreInput || cleanEmail.split('@')[0]
          setCurrentUser({ email: cleanEmail, nombre: name })
          setIsLoggedIn(true)
          await syncCustomerCrm(cleanEmail, name)
          await loadCustomerData(cleanEmail)
          setAuthSuccess('¡Cuenta creada con éxito!')
        }
      } else {
        // Inicio de sesión
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: passwordInput,
        })

        if (error) throw error

        if (data.user) {
          const name = data.user.user_metadata?.nombre || cleanEmail.split('@')[0]
          setCurrentUser({ email: cleanEmail, nombre: name })
          setIsLoggedIn(true)
          await syncCustomerCrm(cleanEmail, name)
          await loadCustomerData(cleanEmail)
        }
      }
    } catch (err: any) {
      console.error('Error de autenticación:', err)
      setAuthError(err.message || 'Error al autenticar. Revisa tus datos.')
    } finally {
      setLoadingAuth(false)
    }
  }

  // Cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setIsLoggedIn(false)
    setCurrentUser(null)
    setOrders([])
    setReviews([])
    setEmailInput('')
    setPasswordInput('')
    setNombreInput('')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Cabecera */}
      <div>
        <div className="w-12 h-12 rounded-2xl bg-[var(--color-primario)]/15 text-[var(--color-primario)] flex items-center justify-center mb-4">
          <UserRound className="w-6 h-6" />
        </div>
        <p className="eyebrow text-[var(--color-primario)]">ESPACIO DE CLIENTE</p>
        <h1 className="text-2xl sm:text-3xl font-medium font-[var(--font-heading)] mt-2 text-[var(--color-texto)]">
          {isLoggedIn ? `Hola, ${currentUser?.nombre}.` : 'Qué bueno verte.'}
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
          {isLoggedIn
            ? `Sesión activa con ${currentUser?.email}. Administra tus pedidos, reseñas y favoritos.`
            : 'Accede o crea tu cuenta para guardar favoritos, ver tus pedidos y calificar productos.'}
        </p>
      </div>

      {isLoggedIn ? (
        /* VISTA DE USUARIO AUTENTICADO */
        <div className="space-y-6">
          {/* Navegación por pestañas */}
          <div className="flex border-b border-black/10 dark:border-white/10 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('resumen')}
              className={`min-h-[44px] pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'resumen'
                  ? 'border-[var(--color-primario)] text-[var(--color-primario)]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              Mi Espacio
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pedidos')}
              className={`min-h-[44px] pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pedidos'
                  ? 'border-[var(--color-primario)] text-[var(--color-primario)]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>Mis Pedidos</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 font-bold">
                {orders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resenas')}
              className={`min-h-[44px] pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'resenas'
                  ? 'border-[var(--color-primario)] text-[var(--color-primario)]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span>Mis Reseñas</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 font-bold">
                {reviews.length}
              </span>
            </button>
          </div>

          {/* Pestaña: Mi Espacio / Resumen */}
          {activeTab === 'resumen' && (
            <div className="space-y-4">
              {/* Acceso a Favoritos */}
              <Link
                href={withTenant('/tienda/favoritos')}
                className="w-full min-h-[52px] px-4 rounded-xl border border-black/15 dark:border-white/15 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-[var(--color-primario)]" />
                  <span>Mis favoritos guardados</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--color-primario)]/15 text-[var(--color-primario)] font-bold">
                    {favorites.length}
                  </span>
                  <ArrowRight className="w-4 h-4 opacity-50" />
                </div>
              </Link>

              {/* Botón Seguir explorando */}
              <Link
                href={withTenant('/tienda')}
                className="w-full min-h-[52px] px-4 rounded-xl border border-black/15 dark:border-white/15 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-[var(--color-primario)]" />
                  <span>Seguir explorando el catálogo</span>
                </span>
                <ArrowRight className="w-4 h-4 opacity-50" />
              </Link>

              {/* Tarjeta de soporte */}
              <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs opacity-75 leading-relaxed">
                Los pedidos y reservas de {store.nombre} se coordinan y despachan directamente desde el taller del Maker.
              </div>

              {/* Botón Cerrar sesión */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="min-h-[44px] text-xs font-semibold opacity-70 hover:opacity-100 hover:text-rose-600 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar sesión de mi cuenta</span>
                </button>
              </div>
            </div>
          )}

          {/* Pestaña: Mis Pedidos */}
          {activeTab === 'pedidos' && (
            <div className="space-y-3">
              {loadingData ? (
                <div className="p-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primario)]" />
                  <span>Cargando tus pedidos...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-black/10 dark:border-white/10 text-xs opacity-60 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-semibold text-sm">No tienes compras registradas aún</p>
                  <p>Cuando realices un pedido con este correo, el seguimiento aparecerá aquí.</p>
                </div>
              ) : (
                orders.map((o) => (
                  <div
                    key={o.id}
                    className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-[var(--color-superficie)] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">Pedido #{o.id.slice(0, 8)}</span>
                      <span className="text-[11px] opacity-60">
                        {new Date(o.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] opacity-75">
                      <span>Estado: <b className="capitalize">{o.estado_pedido}</b></span>
                      <span className="font-bold text-sm text-[var(--color-primario)]">
                        {formatMoney(Number(o.total) || 0)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Pestaña: Mis Reseñas */}
          {activeTab === 'resenas' && (
            <div className="space-y-3">
              {loadingData ? (
                <div className="p-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primario)]" />
                  <span>Cargando reseñas...</span>
                </div>
              ) : reviews.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-black/10 dark:border-white/10 text-xs opacity-60 space-y-2">
                  <Star className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-semibold text-sm">No has dejado reseñas todavía</p>
                  <p>Visita cualquier producto del catálogo para compartir tu opinión y calificación.</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-[var(--color-superficie)] text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={`w-3.5 h-3.5 ${
                              n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] opacity-50">
                        {new Date(r.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                    <p className="italic text-xs">&ldquo;{r.comentario}&rdquo;</p>
                    <div className="text-[11px] opacity-60 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      <span>{r.product?.nombre || 'Producto de catálogo'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* VISTA DE LOGIN / REGISTRO */
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-black/10 dark:border-white/10 shadow-xs space-y-5">
          {/* Selector de Pestaña: Ingresar vs Crear Cuenta */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false)
                setAuthError(null)
              }}
              className={`min-h-[40px] rounded-lg transition-all cursor-pointer ${
                !isRegister
                  ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true)
                setAuthError(null)
              }}
              className={`min-h-[40px] rounded-lg transition-all cursor-pointer ${
                isRegister
                  ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs'
                  : 'opacity-60 hover:opacity-100'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">
                  Tu Nombre Completo
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                  <input
                    type="text"
                    required={isRegister}
                    value={nombreInput}
                    onChange={(e) => setNombreInput(e.target.value)}
                    placeholder="Juan Pérez"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-80">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="nombre@ejemplo.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-80">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingAuth}
              className="w-full min-h-[44px] h-11 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loadingAuth ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRegister ? (
                <>
                  <span>Crear mi cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Ingresar a mi cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
