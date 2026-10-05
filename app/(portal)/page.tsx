// =============================================================================
// PORTALMAKER — Landing Page del Portal Principal
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import Link from 'next/link'
import { Sparkles, Store, Palette, MessageSquare, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function PortalHomePage() {
  return (
    <div className="min-h-screen bg-[#F5F4F1] text-[#202224] font-sans">
      {/* Header */}
      <header className="border-b border-black/10 sticky top-0 bg-[#F5F4F1]/90 backdrop-blur-md z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight text-[#6B8F71]">
              Portalmaker
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#6B8F71] text-white text-sm font-semibold hover:bg-[#58775d] active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Acceso Maker</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6B8F71]/10 text-[#6B8F71] text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>La plataforma e-commerce para creadores y talleres</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15] text-black/90 max-w-4xl mx-auto">
          Tu tienda virtual de fabricación,{' '}
          <span className="text-[#6B8F71]">lista en minutos.</span>
        </h1>

        <p className="mt-6 text-base sm:text-xl text-black/70 max-w-2xl mx-auto leading-relaxed">
          Pensada especialmente para talleres de <strong>Impresión 3D</strong>, <strong>Grabado Láser</strong> y <strong>Corte CNC</strong>. Muestra tus productos, personaliza tu marca y recibe pedidos directo por WhatsApp.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-xl bg-[#6B8F71] text-white text-base font-bold hover:bg-[#58775d] active:scale-98 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>Crear mi Tienda Gratis</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Características Destacadas */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl border border-black/10 p-6 sm:p-8 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#6B8F71]/10 text-[#6B8F71] flex items-center justify-center">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-black/90">Catálogo con Fotos</h3>
            <p className="text-sm text-black/60 leading-relaxed">
              Sube tus imágenes en alta resolución con especificaciones técnicas, tiempos de fabricación y variantes.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl border border-black/10 p-6 sm:p-8 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#6B8F71]/10 text-[#6B8F71] flex items-center justify-center">
              <Palette className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-black/90">Colores y Marca Propios</h3>
            <p className="text-sm text-black/60 leading-relaxed">
              Elige paletas diseñadas para talleres, tipografías modernas y modo oscuro automático para tus clientes.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl border border-black/10 p-6 sm:p-8 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-xl bg-[#6B8F71]/10 text-[#6B8F71] flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-black/90">Ventas por WhatsApp</h3>
            <p className="text-sm text-black/60 leading-relaxed">
              Tus compradores consultan por WhatsApp con el producto y precio precargados, sin comisiones ni intermediarios.
            </p>
          </div>
        </div>
      </section>

      {/* Dominio Propio */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl border border-black/10 p-8 sm:p-12 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6B8F71]">
              <ShieldCheck className="w-4 h-4" />
              <span>Escalabilidad Garantizada</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-black/90">
              Usa tu propio dominio en cualquier momento
            </h3>
            <p className="text-sm text-black/60 max-w-lg">
              Comienza hoy con tu subdominio gratuito y vincula tu dominio <code>.com.ar</code> cuando quieras sin perder tus productos ni configuraciones.
            </p>
          </div>

          <Link
            href="/login"
            className="shrink-0 min-h-[48px] px-6 py-3 rounded-xl bg-[#6B8F71] text-white text-sm font-bold hover:bg-[#58775d] transition-all flex items-center gap-2"
          >
            <span>Empezar Ahora</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-black/10 py-10 text-center text-xs text-black/50">
        <p>© {new Date().getFullYear()} Portalmaker — El portal del Maker</p>
      </footer>
    </div>
  )
}
