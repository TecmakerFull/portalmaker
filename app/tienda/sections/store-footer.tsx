// =============================================================================
// PORTALMAKER — Footer 4 Columnas Minimalista (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import Link from 'next/link'
import type { Store } from '@/types/database'
import { ShieldCheck } from 'lucide-react'

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

  return (
    <footer className="border-t border-black/10 dark:border-white/10 mt-16 sm:mt-24 pt-12 pb-8 bg-[var(--color-fondo)] text-[var(--color-texto)] transition-colors">
      <div className="wrap">
        <div className="grid gap-8 pb-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.3fr]">
          {/* Columna 1: Marca y Filosofía */}
          <div className="space-y-4">
            <Link href={withTenant('/tienda')} className="inline-block focus:outline-none">
              <span className="brand text-[var(--color-primario)]">
                {store.nombre}
              </span>
            </Link>
            <p className="max-w-xs text-xs leading-relaxed opacity-70">
              {store.slogan || 'Piezas bien pensadas. Diseño atemporal.'}
              <br />
              Pequeños detalles para vivir mejor.
            </p>
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
