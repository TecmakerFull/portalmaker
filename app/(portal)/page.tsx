// =============================================================================
// PORTALMAKER — Landing Page del Portal Principal (Paleta 06: Yellow & Gray)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'
import ThemeToggle from '@/app/tienda/theme-toggle'
import { Sparkles, Store, Palette, MessageSquare, ArrowRight, ShieldCheck, Zap } from 'lucide-react'

export default function PortalHomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-[var(--color-borde)] sticky top-0 bg-[var(--color-fondo)]/90 backdrop-blur-md z-30 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Portalmaker"
              width={38}
              height={38}
              className="w-9 h-9 rounded-xl object-contain shadow-xs"
            />
            <span className="text-2xl font-bold tracking-tight font-[var(--font-portal-heading)]">
              Portalmaker
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Toggle Claro / Oscuro */}
            <ThemeToggle />

            <Link
              href="/login"
              style={{ color: '#1F2937' }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-semibold hover:bg-[#eab308] active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Acceso Maker</span>
              <ArrowRight className="w-4 h-4 text-[#1F2937]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FACC15]/20 border border-[#FACC15]/40 text-[var(--color-texto)] text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs">
          <Zap className="w-3.5 h-3.5 text-[#EAB308]" />
          <span>La plataforma e-commerce para talleres y creadores</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.12] font-[var(--font-portal-heading)] max-w-4xl mx-auto">
          El portal de los{' '}
          <span className="text-[#EAB308] underline decoration-[#FACC15]/50 decoration-wavy decoration-2">
            makers
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-xl opacity-80 max-w-2xl mx-auto leading-relaxed font-normal">
          La plataforma para mostrar, vender y gestionar tus productos.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            style={{ color: '#1F2937' }}
            className="w-full sm:w-auto min-h-[52px] px-8 py-3.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-base font-extrabold hover:bg-[#eab308] active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Crear mi Tienda Gratis</span>
            <ArrowRight className="w-5 h-5 text-[#1F2937]" />
          </Link>
        </div>
      </section>

      {/* Características Destacadas */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-6 sm:p-8 shadow-sm space-y-3.5 transition-colors duration-200">
            <div className="w-12 h-12 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-[var(--font-portal-heading)]">Catálogo con Fotos</h3>
            <p className="text-sm opacity-75 leading-relaxed">
              Sube tus imágenes en alta resolución con especificaciones técnicas, tiempos de fabricación y variantes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-6 sm:p-8 shadow-sm space-y-3.5 transition-colors duration-200">
            <div className="w-12 h-12 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] flex items-center justify-center">
              <Palette className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-[var(--font-portal-heading)]">10 Paletas de Color</h3>
            <p className="text-sm opacity-75 leading-relaxed">
              Elige entre 10 paletas de diseño profesional, tipografías modernas y modo oscuro automático para tus clientes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-6 sm:p-8 shadow-sm space-y-3.5 transition-colors duration-200">
            <div className="w-12 h-12 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-[var(--font-portal-heading)]">Ventas por WhatsApp</h3>
            <p className="text-sm opacity-75 leading-relaxed">
              Tus compradores consultan por WhatsApp con el producto y precio precargados, sin comisiones ni intermediarios.
            </p>
          </div>
        </div>
      </section>

      {/* Dominio Propio */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-8 sm:p-12 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-8 transition-colors duration-200">
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#CA8A04]">
              <ShieldCheck className="w-4 h-4" />
              <span>Escalabilidad Total</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold font-[var(--font-portal-heading)]">
              Usa tu propio dominio en cualquier momento
            </h3>
            <p className="text-sm opacity-75 max-w-lg">
              Comienza hoy con tu subdominio gratuito y vincula tu dominio <code>.com.ar</code> cuando quieras sin perder tus productos ni configuraciones.
            </p>
          </div>

          <Link
            href="/login"
            style={{ color: '#1F2937' }}
            className="shrink-0 min-h-[48px] px-7 py-3.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-extrabold hover:bg-[#eab308] transition-all flex items-center gap-2 shadow-sm"
          >
            <span>Empezar Ahora</span>
            <ArrowRight className="w-4 h-4 text-[#1F2937]" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-[var(--color-borde)] py-10 text-center text-xs opacity-60">
        <p>© {new Date().getFullYear()} Portalmaker — El portal del Maker</p>
      </footer>
    </div>
  )
}
