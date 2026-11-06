// =============================================================================
// PORTALMAKER — Gestor de Dominio Propio & Delegación Directa NIC.ar
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Store } from '@/types/database'
import {
  saveCustomDomainAction,
  removeCustomDomainAction,
  checkCustomDomainAction,
} from './actions'
import {
  Globe,
  Check,
  Loader2,
  AlertCircle,
  Copy,
  ExternalLink,
  CheckCircle2,
  Trash2,
  BookOpen,
  Server,
  RefreshCw,
  Plus,
  Save,
} from 'lucide-react'
import { AdminPageHeader } from '../components/admin-page-header'

export default function DominioManager({
  store,
  tenantQuery,
}: {
  store: Store
  tenantQuery: string
}) {
  const router = useRouter()

  const [customDomain, setCustomDomain] = useState(store.custom_domain ?? '')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    configured: boolean
    verified: boolean
    misconfigured: boolean
    error?: string
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Comprobar estado si ya tiene un dominio vinculado
  useEffect(() => {
    // La comprobación también marca el dominio como verificado en la base si
    // Vercel lo confirma; se refresca para que el resto del panel lo refleje.
    if (store.custom_domain) {
      checkCustomDomainAction(store.id)
        .then((res) => {
          setVerificationResult(res)
          if (res.verified && !store.custom_domain_verified) router.refresh()
        })
        .catch(() => {
          // Sin permisos de administración o Vercel no disponible: se deja el estado pendiente.
        })
    }
  }, [store.custom_domain, store.custom_domain_verified, store.id, router])

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleCheckStatus = async () => {
    if (!store.custom_domain) return
    setVerifying(true)
    try {
      const res = await checkCustomDomainAction(store.id)
      setVerificationResult(res)
      if (res.verified && !store.custom_domain_verified) router.refresh()
    } catch (e: any) {
      console.error(e)
    } finally {
      setVerifying(false)
    }
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

    if (!cleanDomain) {
      setErrorMsg('Ingresa un nombre de dominio válido.')
      setLoading(false)
      return
    }

    try {
      // Guarda en Supabase y da de alta automáticamente en Vercel
      const res = await saveCustomDomainAction(store.id, cleanDomain)

      setSuccessMsg(
        '¡Dominio vinculado y registrado automáticamente en la infraestructura! Ahora solo delégalo en NIC Argentina con los servidores de abajo.'
      )
      setCustomDomain(cleanDomain)
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 6000)
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
      // Elimina de Supabase y borra de Vercel automáticamente
      await removeCustomDomainAction(store.id)

      setCustomDomain('')
      setVerificationResult(null)
      setSuccessMsg('Dominio propio desvinculado correctamente de la plataforma.')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al desvincular el dominio.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Encabezado */}
      <AdminPageHeader
        title="Dominio Propio"
        description="Vincula tu propio dominio .com.ar directamente desde NIC Argentina en 2 pasos sin configuraciones complejas."
        icon={Globe}
      />

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
          <div className="pt-4 border-t border-[var(--color-borde)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--color-fondo)] border border-[var(--color-borde)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      verificationResult?.verified
                        ? 'bg-emerald-500'
                        : 'bg-amber-500 animate-pulse'
                    }`}
                  />
                  <span className="text-sm font-bold text-[var(--color-texto)] font-mono">
                    {store.custom_domain}
                  </span>
                  {verificationResult?.verified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Activo y Verificado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      <RefreshCw className="w-3 h-3" />
                      Esperando DNS / Propagación
                    </span>
                  )}
                </div>
                <p className="text-xs opacity-70">
                  {verificationResult?.verified
                    ? 'Tu dominio está activo con certificado SSL automático y conectado al portal.'
                    : 'Si recién realizaste la delegación en NIC.ar o DNS, la propagación suele tardar entre 1 y 24 horas.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  disabled={verifying}
                  className="px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                  <span>{verifying ? 'Comprobando...' : 'Comprobar estado'}</span>
                </button>

                {verificationResult?.verified && (
                  <a
                    href={`https://${store.custom_domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <span>Visitar</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleRemoveDomain}
                  className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desvincular</span>
                </button>
              </div>
            </div>
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
            En NIC.ar, entrá a <strong>Delegaciones</strong> de tu dominio y cargá estos dos servidores. Más abajo tenés el paso a paso con imagen.
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

      {/* 3. Tutorial paso a paso en NIC.ar.
          Los pasos reflejan la pantalla real de "Delegaciones" de NIC.ar: cada
          servidor es una fila que se guarda con su propio botón (disquete) y
          recién después se confirma todo con "Ejecutar cambios". Saltear el
          disquete es el error más común: NIC.ar descarta la fila sin avisar. */}
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-1">
            <BookOpen className="w-4 h-4" />
            <span>Instructivo paso a paso</span>
          </div>
          <h2 className="text-lg font-semibold font-[var(--font-heading)]">
            Cómo delegar tu dominio en NIC Argentina (nic.ar)
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Para dominios .com.ar o .ar registrados en NIC.ar. Te lleva unos 5 minutos.
          </p>
        </div>

        <ol className="space-y-4">
          {/* Paso 1 */}
          <li className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-2">
            <div className="flex items-center gap-2.5">
              <StepNumber n={1} />
              <h3 className="font-semibold text-sm">Guardá tu dominio en este panel</h3>
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Escribí tu dominio en el recuadro <strong>1</strong> de esta página (por ejemplo <code>mitienda.com.ar</code>) y tocá <strong>Guardar Dominio</strong>. Así la plataforma ya lo reconoce como tuyo.
            </p>
          </li>

          {/* Paso 2 */}
          <li className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <StepNumber n={2} />
                <h3 className="font-semibold text-sm">Entrá a NIC.ar y abrí &quot;Delegaciones&quot;</h3>
              </div>
              <a
                href="https://nic.ar"
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center gap-1.5"
              >
                <span>Abrir NIC.ar</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Ingresá con tu CUIT/CUIL y <strong>Clave Fiscal</strong> (ARCA, ex AFIP). En la lista de tus dominios, elegí el que querés conectar y entrá a la opción <strong>Delegaciones</strong>.
            </p>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Si ya aparecen servidores cargados que no son los de abajo (por ejemplo, de un hosting anterior), borralos con el ícono del <Trash2 className="inline w-3.5 h-3.5 -mt-0.5" aria-label="tacho de basura" /> tacho. Tienen que quedar <strong>solo</strong> los dos servidores de Portalmaker.
            </p>
          </li>

          {/* Paso 3 */}
          <li className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-3">
            <div className="flex items-center gap-2.5">
              <StepNumber n={3} />
              <h3 className="font-semibold text-sm">Agregá el primer servidor y guardalo</h3>
            </div>
            <div className="text-xs opacity-75 pl-8 leading-relaxed space-y-1.5">
              <p>
                Tocá <strong><Plus className="inline w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> Agregar una nueva delegación</strong>. Aparece una fila vacía: en <strong>Host</strong> pegá este servidor. Los campos IPv4 e IPv6 dejalos vacíos.
              </p>
            </div>
            <div className="pl-8">
              <CopyRow value="ns1.vercel-dns.com" id="ns1-step" copiedField={copiedField} onCopy={handleCopy} />
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Después tocá el <strong><Save className="inline w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> disquete</strong> (Guardar) de esa misma fila.
            </p>
          </li>

          {/* Paso 4 */}
          <li className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-3">
            <div className="flex items-center gap-2.5">
              <StepNumber n={4} />
              <h3 className="font-semibold text-sm">Repetí con el segundo servidor</h3>
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Tocá otra vez <strong><Plus className="inline w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> Agregar una nueva delegación</strong>, pegá este servidor en <strong>Host</strong> y tocá el <strong><Save className="inline w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> disquete</strong> de esa fila:
            </p>
            <div className="pl-8">
              <CopyRow value="ns2.vercel-dns.com" id="ns2-step" copiedField={copiedField} onCopy={handleCopy} />
            </div>
          </li>

          {/* Paso 5 */}
          <li className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-3">
            <div className="flex items-center gap-2.5">
              <StepNumber n={5} />
              <h3 className="font-semibold text-sm">Revisá y tocá &quot;Ejecutar cambios&quot;</h3>
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              Tienen que quedar las dos filas como en esta imagen. Recién ahí tocá <strong>Ejecutar cambios</strong> al pie de la página de NIC.ar.
            </p>
            <figure className="pl-8 space-y-1.5">
              {/* Se abre en una pestaña nueva para verla en tamaño completo (tap en mobile). */}
              <a href="/images/guias/nic-delegaciones.png" target="_blank" rel="noopener noreferrer" className="block">
                <img
                  src="/images/guias/nic-delegaciones.png"
                  alt="Pantalla de Delegaciones de NIC.ar con las filas ns1.vercel-dns.com y ns2.vercel-dns.com cargadas, y el botón Ejecutar cambios"
                  loading="lazy"
                  width={1381}
                  height={731}
                  className="w-full h-auto rounded-xl border border-[var(--color-borde)] bg-white"
                />
              </a>
              <figcaption className="text-[11px] opacity-60">
                Ejemplo de cómo deben quedar las delegaciones. Tocá la imagen para verla más grande.
              </figcaption>
            </figure>
            <div className="ml-8 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Importante:</strong> si tocás &quot;Ejecutar cambios&quot; sin haber guardado cada fila con su disquete, NIC.ar no registra ese servidor y tu dominio no va a funcionar.
              </span>
            </div>
          </li>

          {/* Paso 6 */}
          <li className="p-4 sm:p-5 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-2">
            <div className="flex items-center gap-2.5">
              <StepNumber n={6} />
              <h3 className="font-semibold text-sm">Esperá la propagación y comprobá</h3>
            </div>
            <p className="text-xs opacity-75 pl-8 leading-relaxed">
              El cambio tarda normalmente entre <strong>1 y 24 horas</strong> en propagarse. Volvé a esta página y tocá <strong>Comprobar estado</strong>: cuando aparezca <strong>Activo y Verificado</strong>, tu tienda ya funciona con tu dominio y el candado de seguridad (HTTPS) se activa solo, sin costo.
            </p>
            <div className="pl-8 pt-1 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>No tenés que hacer nada más: el certificado HTTPS se renueva automáticamente.</span>
            </div>
          </li>
        </ol>
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

/** Círculo numerado de cada paso del instructivo. */
function StepNumber({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full bg-[#FACC15] text-[#1F2937] font-semibold text-xs flex items-center justify-center shrink-0">
      {n}
    </span>
  )
}

/**
 * Valor para pegar en NIC.ar con botón de copiar. El botón mide al menos
 * 44x44 px porque muchos dueños hacen la delegación desde el celular.
 */
function CopyRow({
  value,
  id,
  copiedField,
  onCopy,
}: {
  value: string
  id: string
  copiedField: string | null
  onCopy: (text: string, fieldId: string) => void
}) {
  const copied = copiedField === id
  return (
    <div className="flex items-center justify-between gap-2 pl-3 pr-1 py-1 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)]">
      <span className="font-mono text-xs font-semibold text-[#CA8A04] dark:text-[#FACC15] break-all">{value}</span>
      <button
        type="button"
        onClick={() => onCopy(value, id)}
        className="min-h-11 min-w-11 px-3 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold cursor-pointer shrink-0"
        aria-label={`Copiar ${value}`}
      >
        {copied ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Copiado</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5 opacity-70" />
            <span>Copiar</span>
          </>
        )}
      </button>
    </div>
  )
}
