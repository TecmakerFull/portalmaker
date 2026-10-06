// =============================================================================
// PORTALMAKER — Página de Login y Registro del Portal (Paleta 06: Yellow & Gray)
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/tienda/theme-toggle'
import { LogIn, UserPlus, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Manejador de Email/Password
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (isRegister) {
        // Registro
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (data.session) {
          router.push('/dashboard/maker')
          router.refresh()
        } else {
          setSuccessMsg('Registro exitoso. Si tu email requiere confirmación, revisa tu casilla de correo.')
        }
      } else {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        router.push('/dashboard/maker')
        router.refresh()
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Ocurrió un error al procesar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  // Manejador de Google OAuth
  const handleGoogleLogin = async () => {
    setErrorMsg(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Error al conectar con Google.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] transition-colors duration-200">
      {/* Barra superior con logo y ThemeToggle */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
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
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto my-auto bg-[var(--color-superficie)] rounded-3xl shadow-xl border border-[var(--color-borde)] p-6 sm:p-8 transition-colors duration-200">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight font-[var(--font-portal-heading)]">
            {isRegister ? 'Crear cuenta de Maker' : 'Iniciar Sesión'}
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            {isRegister
              ? 'Accede a tu panel para crear y personalizar tu tienda'
              : 'Ingresa con tus credenciales de administrador'}
          </p>
        </div>

        {/* Mensajes de Alerta */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs">
            {successMsg}
          </div>
        )}

        {/* Botón de Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full min-h-[48px] flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-sm font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 shadow-2xs"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
          <span>Continuar con Google</span>
        </button>

        <div className="relative my-5 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-borde)]" />
          </div>
          <span className="relative bg-[var(--color-superficie)] px-3 text-[11px] uppercase tracking-wider opacity-60">
            o con email
          </span>
        </div>

        {/* Formulario Email / Password */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] pl-3.5 pr-12 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                className="absolute right-0 top-0 bottom-0 w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ color: '#1F2937' }}
            className="w-full min-h-[48px] mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-extrabold hover:bg-[#eab308] active:scale-[0.99] transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#1F2937]" />
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4 text-[#1F2937]" />
                <span>Crear Cuenta</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-[#1F2937]" />
                <span>Ingresar</span>
                <ArrowRight className="w-4 h-4 text-[#1F2937] ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Alternador Login / Registro */}
        <div className="mt-6 pt-5 border-t border-[var(--color-borde)] text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister)
              setErrorMsg(null)
              setSuccessMsg(null)
            }}
            className="text-xs sm:text-sm font-bold text-[#CA8A04] dark:text-[#FACC15] hover:underline"
          >
            {isRegister
              ? '¿Ya tienes cuenta? Inicia sesión aquí'
              : '¿No tienes cuenta? Regístrate gratis'}
          </button>
        </div>
      </div>

      <div className="text-center text-xs opacity-50 pb-2">
        Portalmaker — El portal del Maker
      </div>
    </div>
  )
}
