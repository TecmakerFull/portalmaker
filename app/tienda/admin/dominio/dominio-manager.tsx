// =============================================================================
// PORTALMAKER — Gestor de Dominio Propio & Delegación Directa NIC.ar
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store } from '@/types/database'
import {
  Globe,
  Check,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  BookOpen,
  Sparkles,
  Server,
} from 'lucide-react'

export default function DominioManager({
  store,
  tenantQuery,
}: {
  store: Store
  tenantQuery: string
}) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [customDomain, setCustomDomain] = useState(store.custom_domain ?? '')
  const [loading, setLoading] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanDomain = customDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    try {
      const { error } = await supabase
        .from('stores')
        .update({
          custom_domain: cleanDomain || null,
        })
        .eq('id', store.id)

      if (error) throw error

      setSuccessMsg(
        cleanDomain
          ? '¡Dominio guardado con éxito! Ahora delégalo en NIC.ar con los servidores abajo.'
          : 'Dominio propio desvinculado con éxito.'
      )
      setCustomDomain(cleanDomain)
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el dominio.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (!confirm('¿Estás seguro de desvincular tu dominio propio?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('stores')
        .update({ custom_domain: null })
        .eq('id', store.id)

      if (error) throw error

      setCustomDomain('')
      setSuccessMsg('Dominio propio desvinculado correctamente.')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al desvincular el dominio.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)]">
          Dominio Propio
        </h1>
        <p className="text-xs sm:text-sm opacity-70 mt-1">
          Vincula tu propio dominio <code>.com.ar</code> directamente desde NIC Argentina en 2 pasos sin configuraciones complejas.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Formulario de Configuración del Dominio */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Globe className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
          <h2 className="text-base font-bold">1. Ingresa tu Dominio Registrado</h2>
        </div>

        <form onSubmit={handleSaveDomain} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
              Nombre de tu dominio
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="ej: mitaller3d.com.ar o www.mitaller3d.com.ar"
                className="flex-1 min-h-[46px] px-3.5 py-2.5 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
              <button
                type="submit"
                disabled={loading}
                style={{ color: '#1F2937' }}
                className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#1F2937]" />
                    <span>Guardar Dominio</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] opacity-60 mt-1.5">
              Ingresa el dominio sin <code>http://</code> ni <code>https://</code>.
            </p>
          </div>
        </form>

        {store.custom_domain && (
          <div className="pt-3 border-t border-[var(--color-borde)] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="opacity-80">
                Dominio guardado: <strong>{store.custom_domain}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveDomain}
              className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Desvincular</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Configuración de DNS para NIC Argentina (nic.ar) */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-1">
            <Server className="w-4 h-4" />
            <span>Configuración de DNS</span>
          </div>
          <h2 className="text-base font-bold">2. Servidores para delegar en NIC Argentina</h2>
          <p className="text-xs opacity-70 mt-0.5">
            Ingresa al portal de <strong>NIC.ar</strong> con tu CUIT y Clave Fiscal, busca tu dominio, presiona <strong>&quot;Delegar&quot;</strong> e ingresa estos servidores de nombres:
          </p>
        </div>

        {/* Tabla de Servidores de Nombre */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-[var(--color-borde)] rounded-2xl overflow-hidden">
            <thead className="bg-[var(--color-fondo)]/80 text-[var(--color-texto)] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5">Servidor</th>
                <th className="p-3.5">Host / Nombre de Servidor</th>
                <th className="p-3.5 text-right">Copiar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                <td className="p-3.5 font-bold">Servidor DNS 1 (Primario)</td>
                <td className="p-3.5 font-mono font-bold text-[#CA8A04] dark:text-[#FACC15]">
                  ns1.vercel-dns.com
                </td>
                <td className="p-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleCopy('ns1.vercel-dns.com', 'ns1')}
                    className="p-1.5 rounded-lg border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold"
                  >
                    {copiedField === 'ns1' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 opacity-60" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>

              <tr className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                <td className="p-3.5 font-bold">Servidor DNS 2 (Secundario)</td>
                <td className="p-3.5 font-mono font-bold text-[#CA8A04] dark:text-[#FACC15]">
                  ns2.vercel-dns.com
                </td>
                <td className="p-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleCopy('ns2.vercel-dns.com', 'ns2')}
                    className="p-1.5 rounded-lg border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer inline-flex items-center gap-1 text-[11px] font-semibold"
                  >
                    {copiedField === 'ns2' ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 opacity-60" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Alternativa con Registros A y CNAME */}
        <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] space-y-2 text-xs">
          <span className="font-bold block opacity-90">
            ¿Gestionas tu zona DNS en Cloudflare, DonWeb u otro panel?
          </span>
          <p className="opacity-75 leading-relaxed">
            Si no delegas los servidores completos en NIC.ar y usas tu propia zona DNS, puedes apuntar directamente con estos registros:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] pt-1">
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
              <span>Registro <b>A</b> (@): <b>76.76.21.21</b></span>
              <button
                type="button"
                onClick={() => handleCopy('76.76.21.21', 'ip')}
                className="opacity-60 hover:opacity-100 p-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-between">
              <span>Registro <b>CNAME</b> (www): <b>cname.vercel-dns.com</b></span>
              <button
                type="button"
                onClick={() => handleCopy('cname.vercel-dns.com', 'cname')}
                className="opacity-60 hover:opacity-100 p-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tutorial Ilustrado Paso a Paso */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Instructivo Simple</span>
          </div>
          <h2 className="text-lg font-bold font-[var(--font-heading)]">
            Paso a paso en NIC Argentina (nic.ar)
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Sigue estos pasos para conectar tu dominio propio a la infraestructura de Portalmaker:
          </p>
        </div>

        <div className="space-y-4">
          {/* Paso 1 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#FACC15] text-[#1F2937] font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <h3 className="font-bold text-sm">Ingresar a NIC Argentina</h3>
              </div>
              <a
                href="https://nic.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] hover:underline inline-flex items-center gap-1"
              >
                <span>Abrir NIC.ar</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Ingresa en <a href="https://nic.ar" target="_blank" rel="noopener noreferrer" className="underline font-semibold">nic.ar</a> con tu CUIT y Clave Fiscal AFIP y ve a tu lista de dominios registrados.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#FACC15] text-[#1F2937] font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <h3 className="font-bold text-sm">Hacer clic en &quot;Delegar&quot;</h3>
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Al lado de tu dominio, pulsa el botón <strong>&quot;Delegar&quot;</strong>, haz clic en <strong>&quot;Agregar Servidor&quot;</strong> y pega los dos servidores de arriba:
            </p>
            <div className="pl-8 pt-1 space-y-1 font-mono text-xs text-[#CA8A04] dark:text-[#FACC15]">
              <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 font-bold">
                Host 1: ns1.vercel-dns.com
              </div>
              <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 font-bold">
                Host 2: ns2.vercel-dns.com
              </div>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-[#FACC15] text-[#1F2937] font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <h3 className="font-bold text-sm">Propagación y Certificado de Seguridad</h3>
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Guarda los cambios en NIC.ar y en este panel. La propagación en los DNS de Argentina suele demorar entre <strong>2 y 12 horas</strong>. Una vez propagado, el certificado SSL (candado HTTPS) se activa de forma automática y gratuita.
            </p>
            <div className="pl-8 pt-1 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Portalmaker mantiene tu tienda siempre segura bajo HTTPS sin costo adicional.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notificación Toast Flotante */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1F2937] text-white text-sm font-medium shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  )
}
