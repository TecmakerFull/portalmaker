// =============================================================================
// PORTALMAKER — Landing Page del Portal Principal (Paleta 06: Yellow & Gray)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'
import ThemeToggle from '@/app/tienda/theme-toggle'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'
import { Sparkles, Store, Palette, MessageSquare, CreditCard, ArrowRight, ShieldCheck, Zap, Mail, HelpCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import ShippingFeaturesSection from './shipping-features-section'
import HeroQuickRegister from './hero-quick-register'
import StickyBottomCta from './sticky-bottom-cta'
import PricingSection from './pricing-section'

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
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] transition-colors duration-200 pb-16 sm:pb-0">
      {/* Header Responsivo */}
      <header className="border-b border-[var(--color-borde)] sticky top-0 bg-[var(--color-fondo)]/90 backdrop-blur-md z-30 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Portalmaker"
              width={38}
              height={38}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain shadow-xs shrink-0"
            />
            <span className="text-xl sm:text-2xl font-bold tracking-tight font-[var(--font-portal-heading)]">
              Portalmaker
            </span>
          </Link>

          {/* Menú Desktop: Espacioso y completo */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3">
            <a
              href="#planes"
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <span>Planes</span>
            </a>

            <a
              href="#contacto"
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Contacto</span>
            </a>

            <Link
              href="/login"
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center"
            >
              <span>Acceso Maker</span>
            </Link>

            <ThemeToggle />

            <Link
              href="/login?mode=register"
              style={{ color: '#1F2937' }}
              className="min-h-[44px] px-5 py-2.5 rounded-full bg-[#FACC15] text-[#1F2937] text-xs sm:text-sm font-bold hover:bg-[#eab308] active:scale-95 transition-all shadow-xs flex items-center justify-center cursor-pointer"
            >
              <span>Comienza gratis</span>
            </Link>
          </div>

          {/* Menú Mobile: Limpio, sin amontonamientos y con excelente espacio táctil */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />

            <Link
              href="/login"
              className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-[var(--color-borde)] text-xs font-semibold opacity-90 hover:opacity-100 flex items-center justify-center"
            >
              <span>Acceso</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section con Banner de Fondo y Formulario Rápido estilo Tiendanube */}
      <section className="relative w-full overflow-hidden min-h-[540px] sm:min-h-[600px] lg:min-h-[660px] flex items-center border-b border-[var(--color-borde)]">
        {/* Imagen de Fondo Banner a todo el ancho detrás de título y formulario */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <Image
            src="/banner.png"
            alt="Portalmaker — Plataforma para crear tu tienda online"
            fill
            className="object-cover object-right sm:object-center opacity-85 dark:opacity-35"
            priority
          />
          {/* Degradado horizontal suave para legibilidad nítida */}
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-fondo)] via-[var(--color-fondo)]/85 sm:via-[var(--color-fondo)]/60 to-[var(--color-fondo)]/30 dark:from-[var(--color-fondo)] dark:via-[var(--color-fondo)]/80 dark:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-fondo)]/70 via-transparent to-transparent sm:hidden" />
        </div>

        {/* Contenido Hero */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Columna Izquierda: Título y Formulario */}
            <div className="lg:col-span-7 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FACC15]/20 border border-[#FACC15]/40 text-[var(--color-texto)] text-xs font-semibold uppercase tracking-wider mb-5 shadow-xs backdrop-blur-xs">
                <Zap className="w-3.5 h-3.5 text-[#EAB308]" />
                <span>Plataforma e-commerce para talleres y creadores</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] font-[var(--font-portal-heading)] text-[var(--color-texto)]">
                ¡Creá tu tienda online gratis y en minutos!
              </h1>

              <p className="mt-4 sm:mt-5 text-sm sm:text-lg opacity-85 leading-relaxed font-normal text-[var(--color-texto)] max-w-xl">
                Configuración simple y rápida. Vendé por WhatsApp, Mercado Pago o transferencias con envíos a todo el país. Diseñada para talleres, emprendedores y todo tipo de tiendas.
              </p>

              {/* Formulario rápido estilo Tiendanube con precarga de email */}
              <div className="mt-7">
                <HeroQuickRegister />
              </div>

              {/* Accesos secundarios */}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm font-semibold">
                <Link
                  href="/login"
                  className="opacity-80 hover:opacity-100 hover:underline flex items-center gap-1.5"
                >
                  <span>¿Ya tenés una tienda? Accedé a tu panel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="opacity-40 hidden sm:inline">•</span>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-80 hover:opacity-100 hover:underline flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>Solicitar asesoría</span>
                </a>
              </div>

              {/* Social Proof sutil */}
              <p className="mt-6 text-xs sm:text-sm opacity-70 font-medium text-[var(--color-texto)]">
                Impulsamos a tiendas independientes, talleres y creadores en toda la Argentina
              </p>
            </div>

            {/* Columna Derecha: Foto de la Creadora / Maker en su Taller */}
            <div className="lg:col-span-5 relative mt-4 lg:mt-0">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl overflow-hidden border border-black/10 dark:border-white/10 shadow-2xl bg-[var(--color-superficie)] aspect-[4/3] sm:aspect-[4/3] lg:aspect-[5/4]">
                <Image
                  src="/images/creadora-taller.jpg"
                  alt="Creadora y emprendedora mostrando su tienda online en Portalmaker"
                  fill
                  className="object-cover object-center"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Características Destacadas */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-6 shadow-xs space-y-3 transition-colors duration-200">
            <div className="w-11 h-11 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-[var(--font-portal-heading)]">Catálogo con Fotos</h3>
            <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
              Sube tus imágenes en alta resolución con especificaciones técnicas, tiempos de fabricación y variantes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-6 shadow-xs space-y-3 transition-colors duration-200">
            <div className="w-11 h-11 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-[var(--font-portal-heading)]">Cobros con Mercado Pago</h3>
            <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
              Enlaza tu cuenta en un clic para recibir pagos con tarjeta y cuotas. El dinero ingresa directo a tu billetera.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-6 shadow-xs space-y-3 transition-colors duration-200">
            <div className="w-11 h-11 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] flex items-center justify-center">
              <Palette className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-[var(--font-portal-heading)]">10 Paletas de Color</h3>
            <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
              Elige entre 10 paletas profesionales, tipografías modernas y modo oscuro automático para tus clientes.
            </p>
          </div>

          {/* Card 4 */}
          <div className="bg-[var(--color-superficie)] rounded-2xl border border-[var(--color-borde)] p-6 shadow-xs space-y-3 transition-colors duration-200">
            <div className="w-11 h-11 rounded-xl bg-[#FACC15]/20 text-[#CA8A04] flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold font-[var(--font-portal-heading)]">Ventas por WhatsApp</h3>
            <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
              Tus compradores consultan por WhatsApp con el producto y precio precargados, sin fricciones ni esperas.
            </p>
          </div>
        </div>
      </section>

      {/* Sección: Armá tu tienda en 4 pasos con Mockup 3D Real */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 border-t border-[var(--color-borde)]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15]">
            <Sparkles className="w-4 h-4" />
            <span>Rápido, simple y sin vueltas</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold font-[var(--font-portal-heading)]">
            Armá tu tienda en solo 4 pasos
          </h2>
          <p className="text-sm sm:text-base opacity-75">
            Vendé las 24 horas y despachá a cualquier rincón de la Argentina.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Columna Izquierda: Los 4 Pasos */}
          <div className="lg:col-span-7 space-y-4">
            {/* Paso 1 */}
            <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] shadow-xs flex items-start gap-4">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#FACC15] shrink-0 mt-0.5">01</span>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-[var(--font-portal-heading)]">Registrate y elegí tu link</h3>
                <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
                  Creá tu cuenta gratis en 30 segundos y obtené tu dirección web exclusiva (<code>tutienda.portalmaker.ar</code>).
                </p>
              </div>
            </div>

            {/* Paso 2 */}
            <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] shadow-xs flex items-start gap-4">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#FACC15] shrink-0 mt-0.5">02</span>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-[var(--font-portal-heading)]">Subí tus productos</h3>
                <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
                  Cargá fotos en alta calidad, variantes de colores o talles y tiempos de fabricación si producís bajo demanda.
                </p>
              </div>
            </div>

            {/* Paso 3 */}
            <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] shadow-xs flex items-start gap-4">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#FACC15] shrink-0 mt-0.5">03</span>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-[var(--font-portal-heading)]">Conectá cobros y envíos</h3>
                <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
                  Enlazá tu Mercado Pago o alias bancario y activá cotizaciones automáticas con Andreani y Correo Argentino vía Zipnova.
                </p>
              </div>
            </div>

            {/* Paso 4 */}
            <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] shadow-xs flex items-start gap-4">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#FACC15] shrink-0 mt-0.5">04</span>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-[var(--font-portal-heading)]">Compartí y vendé</h3>
                <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
                  Pegá tu link en tu biografía de Instagram, TikTok o WhatsApp y recibí pedidos organizados con aviso inmediato.
                </p>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Mockup 3D Flotante con Productos y Notificaciones */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-sm sm:max-w-md">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-square rounded-3xl overflow-hidden">
                <Image
                  src="/images/mockup-tienda-mobile.png"
                  alt="Mockup de tienda online mobile en Portalmaker con carrito y notificaciones de WhatsApp"
                  fill
                  className="object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Intermedio */}
        <div className="mt-10 text-center">
          <Link
            href="/login?mode=register"
            style={{ color: '#1F2937' }}
            className="inline-flex min-h-[48px] px-8 py-3.5 rounded-2xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] active:scale-98 transition-all shadow-md items-center justify-center gap-2 cursor-pointer"
          >
            <span>Crear tienda gratis</span>
            <ArrowRight className="w-4 h-4 text-[#1F2937]" />
          </Link>
        </div>
      </section>

      {/* Envíos Automáticos con Zipnova (Multicourier Argentina) */}
      <ShippingFeaturesSection />

      {/* Sección de Planes & Precios (Inspirada en Tiendanube con selector mensual/anual) */}
      <PricingSection />

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
            href="/login?mode=register"
            style={{ color: '#1F2937' }}
            className="shrink-0 min-h-[48px] px-7 py-3.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-extrabold hover:bg-[#eab308] transition-all flex items-center gap-2 shadow-sm cursor-pointer"
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
              className="p-6 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:border-[#25D366] hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <WhatsAppIcon className="w-5 h-5" />
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
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-medium">
          <a href="#contacto" className="hover:underline">
            Contacto & Soporte
          </a>
          <span>•</span>
          <Link href="/privacidad" className="hover:underline">
            Política de Privacidad
          </Link>
          <span>•</span>
          <Link href="/terminos" className="hover:underline">
            Términos del Servicio
          </Link>
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

      {/* Barra fija inferior móvil ("Sticky Bottom Bar") */}
      <StickyBottomCta />
    </div>
  )
}
