// =============================================================================
// PORTALMAKER — Términos y Condiciones del Servicio
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { FileText, ArrowLeft, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones del Servicio — Portalmaker',
  description: 'Condiciones de uso y prestación de servicios de la plataforma Portalmaker.',
}

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-portal-body)] transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-[var(--color-borde)] sticky top-0 bg-[var(--color-fondo)]/90 backdrop-blur-md z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Portalmaker"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg object-contain"
            />
            <span className="text-xl font-bold tracking-tight font-[var(--font-portal-heading)]">
              Portalmaker
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold opacity-70 hover:opacity-100 flex items-center gap-1.5 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al inicio</span>
          </Link>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        <div className="space-y-3 border-b border-[var(--color-borde)] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FACC15]/20 text-xs font-semibold text-[#CA8A04] dark:text-[#FACC15]">
            <FileText className="w-3.5 h-3.5" />
            <span>Marco Legal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-[var(--font-portal-heading)]">
            Términos y Condiciones del Servicio
          </h1>
          <p className="text-xs sm:text-sm opacity-60">
            Última actualización: 16 de octubre de 2026 • Portalmaker (portalmaker.ar)
          </p>
        </div>

        <div className="space-y-8 text-sm sm:text-base leading-relaxed opacity-90">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)]">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar la plataforma <strong>Portalmaker</strong> (a través de <code>portalmaker.ar</code> y sus subdominios), aceptas cumplir y quedar legalmente vinculado por los presentes Términos y Condiciones. Si no estás de acuerdo con alguna de estas condiciones, te solicitamos no utilizar nuestros servicios.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)]">2. Descripción del Servicio</h2>
            <p>
              Portalmaker es una plataforma tecnológica que permite a creadores, emprendedores y fabricantes (makers) crear, personalizar y administrar su propia tienda online, publicar catálogos de productos y recibir pedidos de sus clientes a través de la web e integraciones con WhatsApp y pasarelas de pago.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)]">3. Registro y Cuentas de Usuario</h2>
            <p>
              Para crear una tienda o acceder a funciones exclusivas, debes registrarte proporcionando información veraz y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales de acceso y de toda actividad realizada bajo tu cuenta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)]">4. Uso Permitido y Contenido Prohibido</h2>
            <p>
              Los usuarios se comprometen a utilizar la plataforma conforme a la ley y las buenas costumbres. Queda terminantemente prohibido publicar o comercializar productos ilegales, que infrinjan derechos de propiedad intelectual de terceros, o que resulten difamatorios o engañosos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)]">5. Propiedad Intelectual</h2>
            <p>
              Todo el software, diseño, logotipos, código fuente y elementos visuales de la plataforma Portalmaker son propiedad exclusiva de Portalmaker o de sus licenciantes y están protegidos por leyes de propiedad intelectual. Los contenidos subidos por cada maker a su tienda continúan siendo de su propiedad.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)]">6. Limitación de Responsabilidad</h2>
            <p>
              Portalmaker actúa como proveedor de la plataforma de comercio electrónico. Las transacciones, calidad de productos, envíos y pagos acordados entre cada tienda y sus respectivos compradores son de exclusiva responsabilidad de las partes involucradas.
            </p>
          </section>

          <section className="space-y-3 border-t border-[var(--color-borde)] pt-6">
            <h2 className="text-xl font-bold text-[var(--color-texto)] flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
              Contacto
            </h2>
            <p className="text-xs sm:text-sm">
              Por dudas o reclamos relativos a los Términos del Servicio, puedes contactarnos a{' '}
              <a href="mailto:temperini@gmail.com" className="font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:underline">
                temperini@gmail.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--color-borde)] py-8 text-center text-xs opacity-60">
        <p>© {new Date().getFullYear()} Portalmaker — Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
