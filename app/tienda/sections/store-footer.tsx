// =============================================================================
// PORTALMAKER — Footer 4 Columnas Minimalista (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import type { Store } from '@/types/database'
import { ShieldCheck } from 'lucide-react'

// Iconos vectoriales de Redes Sociales con diseño alineado al sistema Lucide (24x24, 2px stroke)
function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function TikTokIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  )
}

// Formateador robusto de URLs para redes sociales
function formatSocialUrl(
  url: string | null | undefined,
  platform: 'instagram' | 'facebook' | 'tiktok'
): string | null {
  if (!url) return null
  const clean = url.trim()
  if (!clean) return null

  if (/^https?:\/\//i.test(clean)) {
    return clean
  }

  if (clean.startsWith('@')) {
    const handle = clean.slice(1)
    if (platform === 'instagram') return `https://instagram.com/${handle}`
    if (platform === 'facebook') return `https://facebook.com/${handle}`
    if (platform === 'tiktok') return `https://tiktok.com/@${handle}`
  }

  if (clean.includes('.')) {
    return `https://${clean}`
  }

  if (platform === 'instagram') return `https://instagram.com/${clean}`
  if (platform === 'facebook') return `https://facebook.com/${clean}`
  if (platform === 'tiktok') return `https://tiktok.com/@${clean}`

  return `https://${clean}`
}

interface StoreFooterProps {
  store: Store
  tenantQuery: string
}

export default function StoreFooter({ store, tenantQuery }: StoreFooterProps) {
  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  const currentYear = new Date().getFullYear()

  const instagramHref = formatSocialUrl(store.instagram_url, 'instagram')
  const facebookHref = formatSocialUrl(store.facebook_url, 'facebook')
  const tiktokHref = formatSocialUrl(store.tiktok_url, 'tiktok')
  const hasSocial = Boolean(instagramHref || facebookHref || tiktokHref)

  return (
    <footer className="border-t border-black/10 dark:border-white/10 mt-16 sm:mt-24 pt-12 pb-8 bg-[var(--color-fondo)] text-[var(--color-texto)] transition-colors">
      <div className="wrap">
        <div className="grid gap-8 pb-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.3fr]">
          {/* Columna 1: Marca, Filosofía y Redes Sociales */}
          <div className="space-y-4">
            <Link href={withTenant('/tienda')} className="inline-block focus:outline-none">
              <span className="brand text-[var(--color-primario)]">
                {store.nombre}
              </span>
            </Link>
            <p className="max-w-xs text-xs leading-relaxed opacity-70">
              {store.slogan || 'Productos pensados para ti. Calidad y confianza.'}
            </p>

            {/* Redes Sociales de la Marca (Instagram, Facebook, TikTok) */}
            {hasSocial && (
              <div className="pt-2 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider opacity-60 block">
                  Seguinos en redes
                </span>
                <div className="flex items-center gap-2">
                  {instagramHref && (
                    <a
                      href={instagramHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Instagram de ${store.nombre}`}
                      aria-label="Instagram"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--color-primario)] hover:border-[var(--color-primario)]/40 transition-all text-[var(--color-texto)] opacity-80 hover:opacity-100 cursor-pointer"
                    >
                      <InstagramIcon className="w-5 h-5" />
                    </a>
                  )}
                  {facebookHref && (
                    <a
                      href={facebookHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Facebook de ${store.nombre}`}
                      aria-label="Facebook"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--color-primario)] hover:border-[var(--color-primario)]/40 transition-all text-[var(--color-texto)] opacity-80 hover:opacity-100 cursor-pointer"
                    >
                      <FacebookIcon className="w-5 h-5" />
                    </a>
                  )}
                  {tiktokHref && (
                    <a
                      href={tiktokHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`TikTok de ${store.nombre}`}
                      aria-label="TikTok"
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/5 dark:hover:bg-white/10 hover:text-[var(--color-primario)] hover:border-[var(--color-primario)]/40 transition-all text-[var(--color-texto)] opacity-80 hover:opacity-100 cursor-pointer"
                    >
                      <TikTokIcon className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Columna 2: Explora */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider opacity-90">
              Explora
            </h3>
            <div className="grid gap-2.5 text-xs opacity-75">
              <Link href={withTenant('/tienda')} className="hover:opacity-100 hover:text-[var(--color-primario)] transition-colors">
                Todos los productos
              </Link>
              <Link href={withTenant('/tienda')} className="hover:opacity-100 hover:text-[var(--color-primario)] transition-colors">
                Ofertas especiales
              </Link>
              <Link href={withTenant('/tienda/sobre-nosotros')} className="hover:opacity-100 hover:text-[var(--color-primario)] transition-colors">
                Sobre nosotros
              </Link>
              <Link href={withTenant('/tienda/favoritos')} className="hover:opacity-100 hover:text-[var(--color-primario)] transition-colors">
                Favoritos
              </Link>
            </div>
          </div>

          {/* Columna 3: Te ayudamos */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider opacity-90">
              Te ayudamos
            </h3>
            <div className="grid gap-2.5 text-xs opacity-75">
              <Link href={withTenant('/tienda/contacto')} className="hover:opacity-100 hover:text-[var(--color-primario)] transition-colors">
                Contacto & Taller
              </Link>
              <Link href={withTenant('/tienda/ayuda')} className="hover:opacity-100 hover:text-[var(--color-primario)] transition-colors">
                Envíos y devoluciones
              </Link>
              <Link href={withTenant('/tienda/ayuda')} className="hover:opacity-100 hover:text-[var(--color-primario)] transition-colors">
                Preguntas frecuentes
              </Link>
              <Link href={withTenant('/tienda/cuenta')} className="hover:opacity-100 hover:text-[var(--color-primario)] transition-colors">
                Mi cuenta
              </Link>
            </div>
          </div>

          {/* Columna 4: Compra con tranquilidad */}
          <div>
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider opacity-90">
              Compra con tranquilidad
            </h3>
            <p className="flex items-center gap-2 text-xs opacity-75">
              <ShieldCheck className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
              <span>Tu compra, siempre protegida</span>
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
              <span className="rounded border border-black/15 dark:border-white/15 px-2 py-1 bg-black/[0.02] dark:bg-white/[0.03]">
                Transferencia
              </span>
              <span className="rounded border border-black/15 dark:border-white/15 px-2 py-1 bg-black/[0.02] dark:bg-white/[0.03]">
                VISA
              </span>
              <span className="rounded border border-black/15 dark:border-white/15 px-2 py-1 bg-black/[0.02] dark:bg-white/[0.03]">
                Mastercard
              </span>
              <span className="rounded border border-black/15 dark:border-white/15 px-2 py-1 bg-black/[0.02] dark:bg-white/[0.03]">
                Efectivo
              </span>
            </div>
          </div>
        </div>

        {/* Subfooter inferior */}
        <div className="flex flex-col justify-between gap-4 border-t border-black/10 dark:border-white/10 pt-6 text-[10px] opacity-60 sm:flex-row items-center">
          <span>
            © {currentYear} {store.nombre}. Todos los derechos reservados. Desarrollado sobre Portalmaker.
          </span>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 font-medium">
            <Link href={withTenant('/tienda/legal?tab=privacy')} className="hover:underline">
              Privacidad
            </Link>
            <Link href={withTenant('/tienda/legal?tab=terms')} className="hover:underline">
              Términos y condiciones
            </Link>
            <Link href={withTenant('/tienda/legal?tab=cookies')} className="hover:underline">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
