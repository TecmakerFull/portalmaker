// =============================================================================
// PORTALMAKER — Vista Interactiva de Cuenta de Cliente (Client Component)
// Permite autenticación, confirmación de correo con referencia a la tienda,
// recuperación de contraseña, gestión completa de datos de perfil, historial
// detallado de pedidos con desglose de productos y reseñas.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Store, ProductReview, Booking } from '@/types/database'
import { createSupabaseBrowserClient, cerrarSesionCompleta } from '@/lib/supabase/client'
import { useCart } from '@/lib/cart-context'
import { formatFechaTurno } from '@/lib/booking/format'
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
  MapPin,
  Phone,
  Truck,
  ShieldCheck,
  KeyRound,
  Send,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react'

interface CuentaClientProps {
  store: Store
  tenantQuery: string
  /** Zona horaria de la tienda, para mostrar los turnos a la hora correcta. */
  zonaHoraria?: string
}

const ESTADO_TURNO: Record<string, string> = {
  pendiente: 'Por confirmar',
  confirmado: 'Confirmado',
  completado: 'Realizado',
  ausente: 'No asististe',
  cancelado: 'Cancelado',
  expirado: 'Vencido',
}

type AuthMode = 'login' | 'register' | 'recover' | 'magic-link' | 'reset'

export default function CuentaClient({ store, tenantQuery, zonaHoraria = 'America/Argentina/Buenos_Aires' }: CuentaClientProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const { favorites } = useCart()

  // Estados de autenticación — Por defecto 'magic-link' (acceso sin contraseñas estilo Shopify)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<{ email: string; nombre: string } | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('magic-link')
  const [emailInput, setEmailInput] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [newPasswordInput, setNewPasswordInput] = useState('')
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('')
  const [nombreInput, setNombreInput] = useState('')
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authSuccess, setAuthSuccess] = useState<string | null>(null)
  const [returnTo, setReturnTo] = useState<string | null>(null)

  // Datos del cliente logueado
  const [orders, setOrders] = useState<any[]>([])
  const [reviews, setReviews] = useState<(ProductReview & { product?: { nombre: string; slug: string } | null })[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState<'resumen' | 'pedidos' | 'turnos' | 'datos' | 'resenas'>('resumen')
  // Qué ofrece la tienda: pedidos solo si vende productos, turnos solo si da turnos
  const vendeProductos = (store.tipo_negocio ?? 'productos') !== 'servicios'
  const daTurnos = (store.tipo_negocio ?? 'productos') !== 'productos'
  const [turnos, setTurnos] = useState<Booking[]>([])

  // Datos de perfil y envío del usuario para administrar
  const [profileNombre, setProfileNombre] = useState('')
  const [profileTelefono, setProfileTelefono] = useState('')
  const [profileCalleNumero, setProfileCalleNumero] = useState('')
  const [profilePisoDpto, setProfilePisoDpto] = useState('')
  const [profileCiudad, setProfileCiudad] = useState('')
  const [profileProvincia, setProfileProvincia] = useState('')
  const [profileCodigoPostal, setProfileCodigoPostal] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false)

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  // Formato de moneda ARS
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

      // Pedidos ordenados por fecha descendente
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', store.id)
        .eq('email_comprador', cleanEmail)
        .order('created_at', { ascending: false })

      // Reseñas del comprador
      const { data: revs } = await supabase
        .from('product_reviews')
        .select('*, product:products(nombre, slug)')
        .eq('store_id', store.id)
        .eq('user_email', cleanEmail)
        .order('created_at', { ascending: false })

      // Turnos del cliente: la base solo devuelve los suyos (política client_read_own_bookings)
      if (daTurnos) {
        const { data: tur } = await supabase
          .from('bookings')
          .select('*')
          .eq('store_id', store.id)
          .order('starts_at', { ascending: false })
          .limit(60)
        setTurnos((tur as Booking[]) || [])
      }

      setOrders(ords || [])
      setReviews((revs as any[]) || [])
    } catch (e) {
      console.error('Error al cargar datos del cliente:', e)
    } finally {
      setLoadingData(false)
    }
  }

  // Poblar formulario de datos desde metadata y store_customers
  const populateProfileData = async (user: any) => {
    if (!user) return
    const meta = user.user_metadata || {}
    let name = meta.nombre || meta.full_name || meta.name || user.email?.split('@')[0] || ''
    let phone = meta.telefono || ''
    let street = meta.direccion || meta.calleNumero || ''
    let apt = meta.pisoDpto || ''
    let city = meta.ciudad || ''
    let province = meta.provincia || ''
    let zip = meta.codigoPostal || ''

    try {
      const { data: cust } = await supabase
        .from('store_customers')
        .select('*')
        .eq('store_id', store.id)
        .eq('email', user.email.toLowerCase())
        .maybeSingle()

      if (cust) {
        if (cust.nombre && !meta.nombre) name = cust.nombre
        if (cust.telefono && !meta.telefono) phone = cust.telefono
      }
    } catch (e) {
      console.error('Error obteniendo store_customers:', e)
    }

    setProfileNombre(name)
    setProfileTelefono(phone)
    setProfileCalleNumero(street)
    setProfilePisoDpto(apt)
    setProfileCiudad(city)
    setProfileProvincia(province)
    setProfileCodigoPostal(zip)
  }

  // Registrar login en store_customers para CRM de la tienda
  // El alta y la edición del cliente pasan por el servidor: el navegador ya no escribe
  // store_customers (ahí se controla el tope de clientes del plan). El email sale de la
  // sesión, por eso el primer parámetro solo se conserva por compatibilidad con las
  // llamadas existentes. `actualizar` = la persona editó su perfil.
  const syncCustomerCrm = async (_email: string, nombre?: string, telefono?: string, actualizar = false) => {
    try {
      await fetch(`/api/store/customer-sync${tenantQuery}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, actualizar }),
      })
    } catch (e) {
      console.error('Error sincronizando CRM de cliente:', e)
    }
  }

  // Comprobar sesión de Supabase al montar y escuchar cambios de auth
  useEffect(() => {
    const cacheKey = `pm_device_cust_${store.id}`
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const isResetMode = urlParams?.get('mode') === 'reset'
    const nextParam = urlParams?.get('next')

    // Detectar página previa donde estaba parado el comprador para retorno automático
    if (typeof window !== 'undefined') {
      if (nextParam && !nextParam.includes('/tienda/cuenta')) {
        setReturnTo(nextParam)
        try {
          sessionStorage.setItem(`pm_return_to_${store.id}`, nextParam)
        } catch {}
      } else {
        try {
          const savedReturn = sessionStorage.getItem(`pm_return_to_${store.id}`)
          if (savedReturn && !savedReturn.includes('/tienda/cuenta')) {
            setReturnTo(savedReturn)
          } else if (document.referrer) {
            try {
              const refUrl = new URL(document.referrer)
              if (refUrl.origin === window.location.origin && !refUrl.pathname.includes('/tienda/cuenta')) {
                const fullRef = `${refUrl.pathname}${refUrl.search}`
                setReturnTo(fullRef)
                sessionStorage.setItem(`pm_return_to_${store.id}`, fullRef)
              }
            } catch {}
          }
        } catch {}
      }
    }

    if (isResetMode) {
      setAuthMode('reset')
      setIsLoggedIn(false)
    } else if (typeof window !== 'undefined') {
      // Carga inmediata del perfil guardado en el equipo para evitar parpadeos
      try {
        const cachedRaw = localStorage.getItem(cacheKey)
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw)
          if (cached?.email) {
            setCurrentUser(cached)
            setIsLoggedIn(true)
          }
        }
      } catch (err) {
        console.warn('Error leyendo persistencia local:', err)
      }
    }

    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user?.email) {
        if (isResetMode) {
          setAuthMode('reset')
          setIsLoggedIn(false)
          return
        }
        const name = user.user_metadata?.nombre || user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
        setCurrentUser({ email: user.email, nombre: name })
        setIsLoggedIn(true)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ email: user.email, nombre: name }))
        } catch {}
        await populateProfileData(user)
        await syncCustomerCrm(user.email, name, user.user_metadata?.telefono)
        await loadCustomerData(user.email)
      } else if (!isResetMode) {
        // Si no hay sesión activa en Supabase, limpiar cache local
        try {
          localStorage.removeItem(cacheKey)
        } catch {}
        setIsLoggedIn(false)
        setCurrentUser(null)
      }
    }

    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset')
        setIsLoggedIn(false)
        return
      }

      if (session?.user?.email) {
        if (isResetMode) {
          setAuthMode('reset')
          setIsLoggedIn(false)
          return
        }
        const name = session.user.user_metadata?.nombre || session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0]
        setCurrentUser({ email: session.user.email, nombre: name })
        setIsLoggedIn(true)
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ email: session.user.email, nombre: name }))
        } catch {}
        await populateProfileData(session.user)
      } else if (event === 'SIGNED_OUT') {
        setIsLoggedIn(false)
        setCurrentUser(null)
        try {
          localStorage.removeItem(cacheKey)
        } catch {}
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [store.id])

  // Iniciar Sesión o Registrarse
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setAuthSuccess(null)
    setLoadingAuth(true)

    const cleanEmail = emailInput.trim().toLowerCase()
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const isCustomDomain =
      Boolean(origin) &&
      !origin.includes('localhost') &&
      !origin.includes('portalmaker.ar') &&
      !origin.includes('portalmaker.com.ar') &&
      !origin.includes('portalmaker.vercel.app')
    const portalBase = 'https://portalmaker.ar'

    // Ruta destino dentro de la tienda recordando dónde estaba parado el comprador
    const targetDestination = returnTo || '/tienda/cuenta'
    const storePath = withTenant(targetDestination)
    // Si estamos en un dominio propio del maker (ej: armoniashop.com.ar), pasamos por el puente de portalmaker.ar
    // para garantizar que la whitelist de Supabase nunca rechace la redirección
    const redirectUrl = isCustomDomain
      ? `${portalBase}/auth/callback?store_origin=${encodeURIComponent(origin)}&next=${encodeURIComponent(storePath)}`
      : `${origin}/auth/callback?next=${encodeURIComponent(storePath)}`

    try {
      if (authMode === 'register') {
        // Registro con metadata de la tienda
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: passwordInput,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              nombre: nombreInput.trim() || cleanEmail.split('@')[0],
              store_name: store.nombre,
              store_slug: store.slug,
            },
          },
        })

        if (error) throw error

        if (data.user) {
          const name = nombreInput.trim() || cleanEmail.split('@')[0]
          // Si Supabase requiere confirmación de correo (data.session es null)
          if (!data.session) {
            setAuthSuccess(
              `Te enviamos un correo de confirmación a ${cleanEmail} para validar tu acceso a ${store.nombre}. Revisa tu bandeja de entrada o spam para activar tu cuenta.`
            )
          } else {
            setCurrentUser({ email: cleanEmail, nombre: name })
            setIsLoggedIn(true)
            await syncCustomerCrm(cleanEmail, name)
            await loadCustomerData(cleanEmail)
            setAuthSuccess('Cuenta creada con éxito.')

            if (returnTo && !returnTo.includes('/tienda/cuenta')) {
              try {
                sessionStorage.removeItem(`pm_return_to_${store.id}`)
              } catch {}
              router.push(withTenant(returnTo))
            }
          }
        }
      } else if (authMode === 'login') {
        // Inicio de sesión convencional con contraseña
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: passwordInput,
        })

        if (error) throw error

        if (data.user) {
          const name = data.user.user_metadata?.nombre || cleanEmail.split('@')[0]
          setCurrentUser({ email: cleanEmail, nombre: name })
          setIsLoggedIn(true)
          await populateProfileData(data.user)
          await syncCustomerCrm(cleanEmail, name, data.user.user_metadata?.telefono)
          await loadCustomerData(cleanEmail)

          // Si el comprador venía de un producto o checkout, redirigirlo inmediatamente
          if (returnTo && !returnTo.includes('/tienda/cuenta')) {
            try {
              sessionStorage.removeItem(`pm_return_to_${store.id}`)
            } catch {}
            router.push(withTenant(returnTo))
          }
        }
      } else if (authMode === 'magic-link') {
        // Acceso seguro mediante Magic Link personalizado con nombre y diseño de la tienda
        try {
          const res = await fetch('/api/auth/store-magic-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              storeName: store.nombre,
              storeSlug: store.slug,
              storeLogoUrl: store.logo_url,
              colorPrimario: store.color_primario,
              redirectTo: redirectUrl,
            }),
          })

          const data = await res.json()

          if (!res.ok || data?.useFallbackOtp) {
            // Fallback a Supabase OTP nativo
            const { error: otpErr } = await supabase.auth.signInWithOtp({
              email: cleanEmail,
              options: {
                emailRedirectTo: redirectUrl,
                data: {
                  store_name: store.nombre,
                  store_slug: store.slug,
                },
              },
            })
            if (otpErr) throw otpErr
          }
        } catch {
          // Segundo nivel de resguardo en caso de excepción de red
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              emailRedirectTo: redirectUrl,
              data: {
                store_name: store.nombre,
                store_slug: store.slug,
              },
            },
          })
          if (otpErr) throw otpErr
        }

        setAuthSuccess(
          `Te enviamos un enlace de acceso seguro a ${cleanEmail} a nombre de ${store.nombre}. Ábrelo para ingresar de inmediato sin contraseña.`
        )
      } else if (authMode === 'recover') {
        // Solicitud de recuperación de contraseña con callback explícito y contexto de tienda
        const storeAccountPath = `/tienda/cuenta${
          tenantQuery
            ? tenantQuery.startsWith('?')
              ? `${tenantQuery}&mode=reset`
              : `?${tenantQuery}&mode=reset`
            : '?mode=reset'
        }`
        const resetRedirect = isCustomDomain
          ? `${portalBase}/auth/callback?store_origin=${encodeURIComponent(origin)}&next=${encodeURIComponent(storeAccountPath)}`
          : `${origin}/auth/callback?next=${encodeURIComponent(storeAccountPath)}`

        try {
          const res = await fetch('/api/auth/store-recover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: cleanEmail,
              storeName: store.nombre,
              storeSlug: store.slug,
              redirectTo: resetRedirect,
            }),
          })
          const resJson = await res.json()
          if (!res.ok) {
            throw new Error(resJson.error || 'Error al solicitar recuperación')
          }
        } catch (apiErr) {
          // Fallback a llamada directa de Supabase si la API interna tuviera algún problema
          const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
            redirectTo: resetRedirect,
          })
          if (error) throw error
        }

        setAuthSuccess(
          `Se enviaron instrucciones de recuperación a ${cleanEmail} para tu cuenta en ${store.nombre}. Revisa tu bandeja de entrada o correo no deseado.`
        )
      } else if (authMode === 'reset') {
        // Guardar nueva contraseña
        if (newPasswordInput.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.')
        }
        if (newPasswordInput !== confirmPasswordInput) {
          throw new Error('Las contraseñas no coinciden.')
        }

        const { error } = await supabase.auth.updateUser({
          password: newPasswordInput,
        })

        if (error) throw error

        setAuthSuccess('Tu contraseña ha sido actualizada exitosamente.')
        setNewPasswordInput('')
        setConfirmPasswordInput('')

        // Si la sesión quedó autenticada, cargar el perfil y entrar a la cuenta
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user?.email) {
          const name = user.user_metadata?.nombre || user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
          setCurrentUser({ email: user.email, nombre: name })
          setIsLoggedIn(true)
          await populateProfileData(user)
          await syncCustomerCrm(user.email, name, user.user_metadata?.telefono)
          await loadCustomerData(user.email)
        } else {
          setAuthMode('login')
        }
      }
    } catch (err: any) {
      console.error('Error de autenticación:', err)
      setAuthError(err.message || 'Error al procesar la solicitud. Revisa los datos ingresados.')
    } finally {
      setLoadingAuth(false)
    }
  }

  // Inicio de sesión con Google OAuth (primera opción para clientes)
  const handleGoogleLogin = async () => {
    setAuthError(null)
    setAuthSuccess(null)
    setLoadingAuth(true)

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const isCustomDomain =
      Boolean(origin) &&
      !origin.includes('localhost') &&
      !origin.includes('portalmaker.ar') &&
      !origin.includes('portalmaker.com.ar') &&
      !origin.includes('portalmaker.vercel.app')
    const portalBase = 'https://portalmaker.ar'

    // Ruta destino dentro de la tienda recordando dónde estaba parado el comprador
    const targetDestination = returnTo || '/tienda/cuenta'
    const storePath = withTenant(targetDestination)
    const redirectUrl = isCustomDomain
      ? `${portalBase}/auth/callback?store_origin=${encodeURIComponent(origin)}&next=${encodeURIComponent(storePath)}`
      : `${origin}/auth/callback?next=${encodeURIComponent(storePath)}`

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Error al conectar con Google.'
      setAuthError(msg)
      setLoadingAuth(false)
    }
  }

  // Guardar perfil y datos de entrega del usuario
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    setSavingProfile(true)
    setProfileSavedFeedback(false)

    try {
      // 1. Guardar en user_metadata de Supabase Auth
      const { error: authErr } = await supabase.auth.updateUser({
        data: {
          nombre: profileNombre.trim(),
          telefono: profileTelefono.trim(),
          direccion: profileCalleNumero.trim(),
          calleNumero: profileCalleNumero.trim(),
          pisoDpto: profilePisoDpto.trim(),
          ciudad: profileCiudad.trim(),
          provincia: profileProvincia.trim(),
          codigoPostal: profileCodigoPostal.trim(),
        },
      })

      if (authErr) throw authErr

      // 2. Guardar en store_customers de la tienda
      await syncCustomerCrm(currentUser.email, profileNombre.trim(), profileTelefono.trim(), true)

      setCurrentUser((prev) => (prev ? { ...prev, nombre: profileNombre.trim() } : null))
      setProfileSavedFeedback(true)
      setTimeout(() => setProfileSavedFeedback(false), 3500)
    } catch (e: any) {
      console.error('Error al guardar datos de perfil:', e)
      alert(e.message || 'Error al guardar los datos.')
    } finally {
      setSavingProfile(false)
    }
  }

  // Turnos separados en próximos (activos y futuros) y anteriores
  const ahora = new Date()
  const esProximo = (t: Booking) => ['pendiente', 'confirmado'].includes(t.estado) && new Date(t.starts_at) >= ahora
  const turnosProximosLista = turnos.filter(esProximo).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const turnosAnteriores = turnos.filter((t) => !esProximo(t))
  const proximoTurno = turnosProximosLista[0] ?? null

  // Cerrar sesión
  const handleLogout = async () => {
    await cerrarSesionCompleta()
    try {
      localStorage.removeItem(`pm_device_cust_${store.id}`)
      // Fuerza que el próximo ingreso vuelva a registrarse como cliente
      Object.keys(localStorage)
        .filter((k) => k.startsWith(`pm_cust_sync_${store.id}_`))
        .forEach((k) => localStorage.removeItem(k))
    } catch {}
    setIsLoggedIn(false)
    setCurrentUser(null)
    setOrders([])
    setReviews([])
    setEmailInput('')
    setPasswordInput('')
    setNombreInput('')
    setAuthMode('magic-link')
    // Recarga completa: garantiza que no quede ningún estado de la sesión anterior
    window.location.href = withTenant('/tienda/cuenta')
  }

  // Helper para renderizar items de una orden de forma segura
  const parseOrderItems = (raw: any): any[] => {
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primario)]/15 text-[var(--color-primario)] flex items-center justify-center mb-3">
            <UserRound className="w-6 h-6" />
          </div>
          <p className="eyebrow text-[var(--color-primario)]">ESPACIO DE CLIENTE</p>
          <h1 className="text-2xl sm:text-3xl font-medium font-[var(--font-heading)] mt-1 text-[var(--color-texto)]">
            {isLoggedIn ? `Hola, ${currentUser?.nombre}.` : 'Tu cuenta en la tienda'}
          </h1>
          <p className="mt-1 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
            {isLoggedIn
              ? `Sesión activa con ${currentUser?.email} en ${store.nombre}. Administra tus pedidos y datos.`
              : `Gestiona tus compras, guarda favoritos y califica productos en ${store.nombre}.`}
          </p>
        </div>

        {isLoggedIn && (
          <button
            type="button"
            onClick={handleLogout}
            className="self-start sm:self-center min-h-[44px] px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 hover:border-rose-500/30 hover:bg-rose-500/10 text-xs font-semibold text-[var(--color-texto)] hover:text-rose-600 dark:hover:text-rose-400 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        )}
      </div>

      {/* Botón y aviso de retorno hacia la página previa de la tienda */}
      {returnTo && !returnTo.includes('/tienda/cuenta') && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[var(--color-primario)]/10 border border-[var(--color-primario)]/25 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <RotateCcw className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
            <span className="truncate opacity-85">
              {isLoggedIn
                ? '¿Listo? Vuelve a donde estabas navegando en la tienda.'
                : 'Al iniciar sesión continuarás automáticamente donde estabas.'}
            </span>
          </div>
          <Link
            href={withTenant(returnTo)}
            className="font-bold text-[var(--color-primario)] hover:underline inline-flex items-center gap-1 shrink-0 text-xs sm:text-sm cursor-pointer"
          >
            <span>Volver</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {isLoggedIn ? (
        /* VISTA DE USUARIO AUTENTICADO */
        <div className="space-y-6">
          {/* Navegación por pestañas */}
          <div className="flex border-b border-black/10 dark:border-white/10 gap-1 sm:gap-2 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('resumen')}
              className={`min-h-[44px] pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'resumen'
                  ? 'border-[var(--color-primario)] text-[var(--color-primario)]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              Mi Espacio
            </button>
            {vendeProductos && (
            <button
              type="button"
              onClick={() => setActiveTab('pedidos')}
              className={`min-h-[44px] pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
            )}
            {daTurnos && (
              <button
                type="button"
                onClick={() => setActiveTab('turnos')}
                className={`min-h-[44px] pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'turnos'
                    ? 'border-[var(--color-primario)] text-[var(--color-primario)]'
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <span>Mis Turnos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 font-bold">
                  {turnos.filter((t) => ['pendiente', 'confirmado'].includes(t.estado) && new Date(t.starts_at) >= new Date()).length}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('datos')}
              className={`min-h-[44px] pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'datos'
                  ? 'border-[var(--color-primario)] text-[var(--color-primario)]'
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              Mis Datos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resenas')}
              className={`min-h-[44px] pb-3 px-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
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
              {/* Próximo turno (tiendas con turnos) */}
              {daTurnos && proximoTurno && (
                <Link
                  href={withTenant(`/tienda/turno/${proximoTurno.public_token}`)}
                  className="w-full min-h-[52px] px-4 py-3 rounded-xl border border-[var(--color-primario)]/40 bg-[var(--color-primario)]/10 flex items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primario)]">Tu próximo turno</span>
                    <span className="block font-semibold truncate">{proximoTurno.servicio_nombre}</span>
                    <span className="block text-xs opacity-75 capitalize">{formatFechaTurno(proximoTurno.starts_at, zonaHoraria)}</span>
                  </span>
                  <ArrowRight className="w-4 h-4 opacity-60 shrink-0" />
                </Link>
              )}

              {/* Acceso a Favoritos (solo tiendas con productos) */}
              {vendeProductos && (
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
              )}

              {/* Botón Seguir explorando */}
              <Link
                href={withTenant('/tienda')}
                className="w-full min-h-[52px] px-4 rounded-xl border border-black/15 dark:border-white/15 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-all text-xs sm:text-sm font-semibold cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-[var(--color-primario)]" />
                  <span>{vendeProductos ? 'Seguir explorando el catálogo' : 'Ver servicios y reservar un turno'}</span>
                </span>
                <ArrowRight className="w-4 h-4 opacity-50" />
              </Link>

              {/* Tarjeta informativa de la tienda */}
              <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs opacity-75 leading-relaxed flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[var(--color-primario)] shrink-0 mt-0.5" />
                <span>
                  {vendeProductos
                    ? <>Tus datos están protegidos y vinculados a tus compras en <strong>{store.nombre}</strong>. Todos los pedidos se coordinan y despachan directamente desde la tienda.</>
                    : <>Tus datos están protegidos y vinculados a tus turnos en <strong>{store.nombre}</strong>.</>}
                </span>
              </div>
            </div>
          )}

          {/* Pestaña: Mis Turnos */}
          {activeTab === 'turnos' && daTurnos && (
            <div className="space-y-6">
              {loadingData ? (
                <div className="p-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primario)]" />
                  <span>Cargando tus turnos...</span>
                </div>
              ) : turnos.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-black/10 dark:border-white/10 text-xs opacity-60 space-y-2">
                  <CalendarCheck className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-semibold text-sm">Todavía no tenés turnos</p>
                  <p>Cuando reserves un turno con este correo, lo vas a ver acá para consultarlo o cancelarlo.</p>
                </div>
              ) : (
                <>
                  {[
                    { titulo: 'Próximos', lista: turnosProximosLista },
                    { titulo: 'Anteriores', lista: turnosAnteriores },
                  ].map(({ titulo, lista }) =>
                    lista.length === 0 ? null : (
                      <section key={titulo} className="space-y-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60">{titulo}</h3>
                        <ul className="space-y-2">
                          {lista.map((t) => {
                            const esperandoSena = t.estado === 'pendiente' && Boolean(t.pendiente_expira_at)
                            return (
                              <li key={t.id}>
                                <Link
                                  href={withTenant(`/tienda/turno/${t.public_token}`)}
                                  className="min-h-14 flex items-center justify-between gap-3 p-3 rounded-xl border border-black/10 dark:border-white/10 hover:border-[var(--color-primario)] transition-colors"
                                >
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold truncate">{t.servicio_nombre}</span>
                                    <span className="block text-xs opacity-70 capitalize">{formatFechaTurno(t.starts_at, zonaHoraria)}</span>
                                  </span>
                                  <span className="flex items-center gap-1.5 shrink-0 text-xs opacity-80">
                                    {esperandoSena ? 'Falta pagar la seña' : (ESTADO_TURNO[t.estado] ?? t.estado)}
                                    <ChevronRight className="w-4 h-4" />
                                  </span>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </section>
                    )
                  )}
                </>
              )}
            </div>
          )}

          {/* Pestaña: Mis Pedidos con detalle de productos */}
          {activeTab === 'pedidos' && vendeProductos && (
            <div className="space-y-4">
              {loadingData ? (
                <div className="p-8 text-center text-xs opacity-60 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primario)]" />
                  <span>Cargando tus pedidos...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-black/10 dark:border-white/10 text-xs opacity-60 space-y-2">
                  <ShoppingBag className="w-8 h-8 mx-auto opacity-30" />
                  <p className="font-semibold text-sm">No tienes compras registradas aún</p>
                  <p>Cuando realices un pedido con este correo, el seguimiento y el detalle de productos aparecerán aquí.</p>
                </div>
              ) : (
                orders.map((o) => {
                  const orderItems = parseOrderItems(o.items)
                  return (
                    <div
                      key={o.id}
                      className="p-4 sm:p-5 rounded-2xl border border-black/10 dark:border-white/10 bg-[var(--color-superficie)] text-xs space-y-3.5 shadow-xs"
                    >
                      {/* Cabecera del pedido */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-black/5 dark:border-white/5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm sm:text-base text-[var(--color-texto)]">
                              Pedido #{o.id.slice(0, 8)}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-black/5 dark:bg-white/10 text-[var(--color-texto)] capitalize">
                              {o.estado_pedido || 'Nuevo'}
                            </span>
                          </div>
                          <span className="text-[11px] opacity-60 block mt-0.5">
                            Fecha: {new Date(o.created_at).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] opacity-60 uppercase block">Total</span>
                          <span className="font-bold text-base sm:text-lg text-[var(--color-primario)]">
                            {formatMoney(Number(o.total) || 0)}
                          </span>
                        </div>
                      </div>

                      {/* Modalidad de entrega y pago */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-0.5">
                          <span className="opacity-60 block font-medium">Entrega:</span>
                          <div className="flex items-center gap-1.5 font-semibold text-[var(--color-texto)]">
                            <Truck className="w-3.5 h-3.5 text-[var(--color-primario)] shrink-0" />
                            <span>
                              {o.tipo_entrega === 'retiro'
                                ? 'Retiro en el local'
                                : o.tipo_entrega === 'envio'
                                ? 'Envío a domicilio'
                                : 'A convenir por WhatsApp'}
                            </span>
                          </div>
                          {o.direccion_entrega && (
                            <p className="opacity-70 text-[10px] truncate" title={o.direccion_entrega}>
                              {o.direccion_entrega}
                            </p>
                          )}
                        </div>

                        <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 space-y-0.5">
                          <span className="opacity-60 block font-medium">Forma de pago:</span>
                          <div className="flex items-center gap-1.5 font-semibold text-[var(--color-texto)] capitalize">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>
                              {o.metodo_pago === 'transferencia'
                                ? 'Transferencia bancaria'
                                : o.metodo_pago === 'efectivo'
                                ? 'Efectivo contra entrega'
                                : o.metodo_pago === 'mercadopago'
                                ? 'Mercado Pago'
                                : o.metodo_pago || 'A convenir'}
                            </span>
                          </div>
                          <span className="text-[10px] opacity-60 block">
                            Estado pago: <b className="capitalize font-medium">{o.estado_pago || 'Pendiente'}</b>
                          </span>
                        </div>
                      </div>

                      {/* Desglose de productos comprados */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold opacity-70 block">
                          Productos en este pedido ({orderItems.length}):
                        </span>
                        <div className="space-y-1.5">
                          {orderItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-black/[0.015] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 opacity-50 shrink-0" />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[var(--color-texto)] truncate">
                                      {item.nombre || item.productName || 'Producto'}
                                    </span>
                                    {item.variante && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--color-primario)]/10 text-[var(--color-primario)] font-medium">
                                        {item.variante}
                                      </span>
                                    )}
                                    {item.is_reserva && (
                                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                        Bajo pedido
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] opacity-60 block">
                                    {item.cantidad || 1} x {formatMoney(Number(item.precio_unitario || item.unitPrice) || 0)}
                                  </span>
                                </div>
                              </div>

                              <span className="font-semibold text-xs text-[var(--color-texto)] shrink-0">
                                {formatMoney(Number(item.subtotal || (item.precio_unitario || item.unitPrice || 0) * (item.cantidad || 1)) || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notas adicionales del pedido si existen */}
                      {o.notas && (
                        <p className="text-[11px] opacity-60 italic pt-1 border-t border-black/5 dark:border-white/5">
                          Nota del comprador: &ldquo;{o.notas}&rdquo;
                        </p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* Pestaña: Mis Datos (Gestión de perfil y envío) */}
          {activeTab === 'datos' && (
            <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-black/10 dark:border-white/10 shadow-xs space-y-5">
              <div>
                <h2 className="text-base sm:text-lg font-medium text-[var(--color-texto)]">
                  Administrar mis datos
                </h2>
                <p className="text-xs opacity-70 mt-1">
                  {vendeProductos
                    ? <>Mantén tu información actualizada. Estos datos se precargarán automáticamente en el checkout para agilizar tus compras en {store.nombre}.</>
                    : <>Mantené tu información actualizada. {store.nombre} la usa para contactarte por tus turnos.</>}
                </p>
              </div>

              {profileSavedFeedback && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Tus datos fueron actualizados correctamente.</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 opacity-80">
                      Nombre y Apellido
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={profileNombre}
                        onChange={(e) => setProfileNombre(e.target.value)}
                        placeholder="Ej. Juan Pérez"
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-1.5 opacity-80">
                      Teléfono / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                      <input
                        type="tel"
                        value={profileTelefono}
                        onChange={(e) => setProfileTelefono(e.target.value)}
                        placeholder="Ej. +54 9 11 1234-5678"
                        className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-3.5">
                  <p className="text-xs font-semibold opacity-70 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-primario)]" />
                    <span>{vendeProductos ? 'Dirección habitual de entrega (opcional)' : 'Dirección (opcional)'}</span>
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1 opacity-80">
                        Calle y número
                      </label>
                      <input
                        type="text"
                        value={profileCalleNumero}
                        onChange={(e) => setProfileCalleNumero(e.target.value)}
                        placeholder="Ej. Av. San Martín 1234"
                        className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-80">
                        Piso / Depto
                      </label>
                      <input
                        type="text"
                        value={profilePisoDpto}
                        onChange={(e) => setProfilePisoDpto(e.target.value)}
                        placeholder="Ej. 4 B"
                        className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-80">
                        Ciudad / Localidad
                      </label>
                      <input
                        type="text"
                        value={profileCiudad}
                        onChange={(e) => setProfileCiudad(e.target.value)}
                        placeholder="Ej. Rosario"
                        className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-80">
                        Provincia
                      </label>
                      <input
                        type="text"
                        value={profileProvincia}
                        onChange={(e) => setProfileProvincia(e.target.value)}
                        placeholder="Ej. Santa Fe"
                        className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1 opacity-80">
                        Código Postal
                      </label>
                      <input
                        type="text"
                        value={profileCodigoPostal}
                        onChange={(e) => setProfileCodigoPostal(e.target.value)}
                        placeholder="Ej. 2000"
                        className="w-full h-11 px-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="w-full sm:w-auto min-h-[44px] h-11 px-6 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Guardar mis datos</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full sm:w-auto min-h-[44px] h-11 px-4 rounded-xl border border-black/10 dark:border-white/10 hover:border-rose-500/30 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </form>
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
                  <p>{vendeProductos ? 'Visita cualquier producto del catálogo para compartir tu opinión y calificación.' : 'Entrá a cualquier servicio para compartir tu opinión y calificación.'}</p>
                </div>
              ) : (
                reviews.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-[var(--color-superficie)] text-xs space-y-2 shadow-xs"
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
        /* VISTA DE LOGIN / REGISTRO / RECUPERACIÓN */
        <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-black/10 dark:border-white/10 shadow-xs space-y-5">
          {/* Botón de Google OAuth como primera opción (arriba de acceso sin contraseña) */}
          {(authMode === 'login' || authMode === 'register' || authMode === 'magic-link') && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loadingAuth}
                className="w-full min-h-[46px] h-11 flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/5 text-xs sm:text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer text-[var(--color-texto)]"
              >
                {loadingAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--color-primario)]" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continuar con Google</span>
              </button>

              <div className="relative text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/10 dark:border-white/10" />
                </div>
                <span className="relative bg-[var(--color-superficie)] px-3 text-[11px] uppercase tracking-wider opacity-60">
                  o con correo electrónico
                </span>
              </div>
            </div>
          )}

          {/* Selector de Pestaña principal para Acceso sin contraseña (Shopify style) vs Contraseña */}
          {(authMode === 'login' || authMode === 'register' || authMode === 'magic-link') && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('magic-link')
                  setAuthError(null)
                  setAuthSuccess(null)
                }}
                className={`min-h-[40px] rounded-lg transition-all cursor-pointer ${
                  authMode === 'magic-link'
                    ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                Acceso sin contraseña (Recomendado)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login')
                  setAuthError(null)
                  setAuthSuccess(null)
                }}
                className={`min-h-[40px] rounded-lg transition-all cursor-pointer ${
                  authMode === 'login' || authMode === 'register'
                    ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
              >
                Con contraseña
              </button>
            </div>
          )}

          {/* Mensajes de Alerta y Notificación */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* MODO 1 & 2: INICIO DE SESIÓN CON CONTRASEÑA O REGISTRO */}
          {(authMode === 'login' || authMode === 'register') && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-80">
                    Tu Nombre Completo
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                    <input
                      type="text"
                      required
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium opacity-80">
                    Contraseña
                  </label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('recover')
                        setAuthError(null)
                        setAuthSuccess(null)
                      }}
                      className="text-[11px] text-[var(--color-primario)] hover:underline cursor-pointer"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  )}
                </div>
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

              {authMode === 'register' && (
                <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 text-[11px] opacity-70 leading-relaxed">
                  Al registrarte, la solicitud se asocia a <strong>{store.nombre}</strong>. Si tu cuenta requiere confirmación, recibirás un correo de validación para asegurar la titularidad de tu casilla.
                </div>
              )}

              <button
                type="submit"
                disabled={loadingAuth}
                className="w-full min-h-[44px] h-11 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authMode === 'register' ? (
                  <>
                    <span>Crear mi cuenta en {store.nombre}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Ingresar a mi cuenta</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Opción de ingreso sin contraseña (Magic Link) */}
              {authMode === 'login' && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('magic-link')
                      setAuthError(null)
                      setAuthSuccess(null)
                    }}
                    className="text-xs font-semibold opacity-70 hover:opacity-100 hover:text-[var(--color-primario)] flex items-center justify-center gap-1.5 mx-auto transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>O ingresar con enlace a mi correo (sin contraseña)</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* MODO 3: INGRESO CON ENLACE MÁGICO AL CORREO */}
          {authMode === 'magic-link' && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-texto)] mb-1">
                  Ingreso directo con enlace por correo
                </h3>
                <p className="text-xs opacity-70 leading-relaxed">
                  Te enviaremos un enlace seguro a tu correo electrónico para que ingreses a <strong>{store.nombre}</strong> con un solo clic, sin contraseñas.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">
                  Tu correo electrónico
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

              <button
                type="submit"
                disabled={loadingAuth}
                className="w-full min-h-[44px] h-11 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar enlace de acceso</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    setAuthError(null)
                    setAuthSuccess(null)
                  }}
                  className="text-xs opacity-70 hover:opacity-100 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Volver al inicio con contraseña</span>
                </button>
              </div>
            </form>
          )}

          {/* MODO 4: RECUPERACIÓN DE CONTRASEÑA */}
          {authMode === 'recover' && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-texto)] mb-1">
                  Recuperar contraseña
                </h3>
                <p className="text-xs opacity-70 leading-relaxed">
                  Ingresa tu correo y te enviaremos un enlace oficial de <strong>{store.nombre}</strong> para restablecer tu contraseña y asegurar tu cuenta.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">
                  Correo electrónico de tu cuenta
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

              <button
                type="submit"
                disabled={loadingAuth}
                className="w-full min-h-[44px] h-11 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {loadingAuth ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Enviar instrucciones de recuperación</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login')
                    setAuthError(null)
                    setAuthSuccess(null)
                  }}
                  className="text-xs opacity-70 hover:opacity-100 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Volver a Iniciar Sesión</span>
                </button>
              </div>
            </form>
          )}

          {/* MODO 5: DEFINIR NUEVA CONTRASEÑA (DESPUÉS DE ENLACE DE RECUPERACIÓN) */}
          {authMode === 'reset' && (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-texto)] mb-1">
                  Establecer nueva contraseña
                </h3>
                <p className="text-xs opacity-70 leading-relaxed">
                  Ingresa tu nueva contraseña para acceder a <strong>{store.nombre}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">
                  Nueva contraseña (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5 opacity-80">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
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
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Guardar y acceder a mi cuenta</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
