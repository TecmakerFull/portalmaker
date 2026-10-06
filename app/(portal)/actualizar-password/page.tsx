// =============================================================================
// PORTALMAKER — Pantalla de Actualización de Contraseña
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import ThemeToggle from '@/app/tienda/theme-toggle'
import { KeyRound, ArrowRight, AlertCircle, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react'

export default function ActualizarPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createSupabaseBrowserClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      })

      if (error) throw error

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/maker')
        router.refresh()
      }, 2000)
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'No se pudo actualizar la contraseña. El enlace puede haber expirado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] transition-colors duration-200">
      {/* Header */}
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

      {/* Tarjeta Central */}
      <div className="w-full max-w-md mx-auto my-auto bg-[var(--color-superficie)] rounded-3xl shadow-xl border border-[var(--color-borde)] p-6 sm:p-8 transition-colors duration-200">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight font-[var(--font-portal-heading)]">
            Nueva Contraseña
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1">
            Ingresa y confirma tu nueva contraseña de acceso.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold">¡Contraseña actualizada!</h3>
            <p className="text-xs opacity-75">
              Tu clave fue modificada con éxito. Redirigiendo a tu panel...
            </p>
            <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#CA8A04] dark:text-[#FACC15] pt-2" />
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full min-h-[44px] pl-3.5 pr-12 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  className="absolute right-0 top-0 bottom-0 w-11 h-11 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1.5">
                Confirmar Contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu nueva contraseña"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ color: '#1F2937' }}
              className="w-full min-h-[48px] mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-extrabold hover:bg-[#eab308] active:scale-[0.99] transition-all disabled:opacity-50 shadow-md"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#1F2937]" />
              ) : (
                <>
                  <span>Guardar nueva contraseña</span>
                  <ArrowRight className="w-4 h-4 text-[#1F2937]" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <div className="text-center text-xs opacity-50 pb-2">
        Portalmaker — El portal del Maker
      </div>
    </div>
  )
}
