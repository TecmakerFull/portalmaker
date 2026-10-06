// =============================================================================
// PORTALMAKER — Landing Page del Portal Principal (Paleta 06: Yellow & Gray)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'
import ThemeToggle from '@/app/tienda/theme-toggle'
import { Sparkles, Store, Palette, MessageSquare, ArrowRight, ShieldCheck, Zap, Mail, HelpCircle, ArrowUpRight } from 'lucide-react'

// Contacto oficial del portal
const PORTAL_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_PORTAL_WHATSAPP ?? '5493415866464'
const PORTAL_EMAIL = process.env.NEXT_PUBLIC_PORTAL_EMAIL ?? 'temperini@gmail.com'

const whatsappUrl = `https://wa.me/${PORTAL_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
  '¡Hola! Me comunico desde portalmaker.com.ar. Me gustaría recibir más información y asesoramiento para crear mi tienda online.'
)}`

const mailtoUrl = `mailto:${PORTAL_EMAIL}?subject=${encodeURIComponent(
  'Consulta sobre Portalmaker'
)}&body=${encodeURIComponent(
  '¡Hola! Me gustaría solicitar más información sobre cómo crear y gestionar mi tienda en Portalmaker.'
)}`

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

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Link a Contacto */}
            <a
              href="#contacto"
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span className="hidden sm:inline">Contacto</span>
            </a>

            {/* Link secundario de ingreso */}
            <Link
              href="/login"
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center"
            >
              <span>Acceso Maker</span>
            </Link>

            {/* Toggle Claro / Oscuro */}
            <ThemeToggle />

            {/* Botón Comienza gratis */}
            <Link
              href="/login"
              style={{ color: '#1F2937' }}
              className="min-h-[44px] px-3.5 sm:px-5 py-2.5 rounded-full bg-[#FACC15] text-[#1F2937] text-xs sm:text-sm font-bold hover:bg-[#eab308] active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
            >
              <span>Comienza gratis</span>
              <ArrowRight className="w-4 h-4 text-[#1F2937]" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FACC15]/20 border border-[#FACC15]/40 text-[var(--color-texto)] text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs">
          <Zap className="w-3.5 h-3.5 text-[#EAB308]" />
          <span>El portal de los makers</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] font-[var(--font-portal-heading)] max-w-4xl mx-auto">
          Comienza una tienda online para tu negocio gratis
        </h1>

        <p className="mt-5 text-sm sm:text-lg opacity-80 max-w-2xl mx-auto leading-relaxed font-normal">
          Portalmaker es la plataforma todo en uno para crear, administrar y hacer crecer tu tienda online. Diseñada para makers, talleres y creadores de todo tipo de productos.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Link
            href="/login"
            style={{ color: '#1F2937' }}
            className="w-full min-h-[48px] px-8 py-3.5 rounded-2xl bg-[#FACC15] text-[#1F2937] text-sm sm:text-base font-bold hover:bg-[#eab308] active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Crear mi Tienda</span>
            <ArrowRight className="w-4 h-4 text-[#1F2937]" />
          </Link>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full min-h-[48px] px-6 py-3.5 rounded-2xl border border-[var(--color-borde)] text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
            <span>Solicitar asesoría</span>
          </a>
        </div>

        {/* Social Proof sutil */}
        <p className="mt-6 text-xs sm:text-sm opacity-60 font-medium">
          Impulsamos a tiendas, talleres y creadores independientes
        </p>
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

      {/* Sección de Contacto & Asesoramiento */}
      <section id="contacto" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 scroll-mt-24">
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-8 sm:p-12 shadow-sm space-y-8 transition-colors duration-200">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#CA8A04]">
              <HelpCircle className="w-4 h-4" />
              <span>Atención Personalizada</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold font-[var(--font-portal-heading)]">
              ¿Tenés dudas o querés solicitar más información?
            </h2>
            <p className="text-sm sm:text-base opacity-75 leading-relaxed">
              Estamos para ayudarte a configurar tu tienda, resolver inquietudes o coordinar una demostración personalizada.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {/* Opción 1: WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-6 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:border-[#FACC15] hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">WhatsApp Directo</h3>
                <p className="text-xs opacity-70 leading-relaxed">
                  Chateá en tiempo real con nosotros para consultas rápidas sobre la plataforma.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] group-hover:underline">
                <span>Escribir por WhatsApp</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </a>

            {/* Opción 2: Correo Electrónico */}
            <a
              href={mailtoUrl}
              className="p-6 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:border-[#FACC15] hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Correo Electrónico</h3>
                <p className="text-xs opacity-70 leading-relaxed">
                  Envianos tus preguntas detalladas o propuestas institucionales.
                </p>
              </div>

              <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-[#CA8A04] dark:text-[#FACC15] group-hover:underline">
                <span>Enviar un email</span>
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-[var(--color-borde)] py-10 text-center text-xs opacity-70 space-y-3">
        <div className="flex items-center justify-center gap-4 font-medium">
          <a href="#contacto" className="hover:underline">
            Contacto & Soporte
          </a>
          <span>•</span>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
            WhatsApp
          </a>
          <span>•</span>
          <a href={mailtoUrl} className="hover:underline">
            Email
          </a>
        </div>
        <p className="opacity-60">© {new Date().getFullYear()} Portalmaker — El portal del Maker</p>
      </footer>
    </div>
  )
}
