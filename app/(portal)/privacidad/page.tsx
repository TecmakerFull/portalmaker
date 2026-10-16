// =============================================================================
// PORTALMAKER — Política de Privacidad Oficial
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Shield, ArrowLeft, Lock, Eye, Database, Mail } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Portalmaker',
  description: 'Conoce cómo Portalmaker recopila, utiliza y protege tus datos personales y tu privacidad.',
}

export default function PrivacidadPage() {
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
        {/* Título */}
        <div className="space-y-3 border-b border-[var(--color-borde)] pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FACC15]/20 text-xs font-semibold text-[#CA8A04] dark:text-[#FACC15]">
            <Shield className="w-3.5 h-3.5" />
            <span>Transparencia y Seguridad</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-[var(--font-portal-heading)]">
            Política de Privacidad
          </h1>
          <p className="text-xs sm:text-sm opacity-60">
            Última actualización: 16 de octubre de 2026 • Portalmaker (portalmaker.ar)
          </p>
        </div>

        {/* Secciones */}
        <div className="space-y-8 text-sm sm:text-base leading-relaxed opacity-90">
          {/* 1. Introducción */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] text-xs flex items-center justify-center font-bold">1</span>
              Introducción
            </h2>
            <p>
              En <strong>Portalmaker</strong> (accesible desde <code>portalmaker.ar</code> y sus subdominios asociados), la privacidad y protección de los datos de nuestros usuarios, creadores y compradores es una prioridad fundamental.
            </p>
            <p>
              Esta Política de Privacidad describe de manera detallada y transparente qué información recopilamos, cuál es su finalidad, cómo se almacena y los derechos que tienes sobre tus datos personales conforme a las mejores prácticas de la industria y la normativa de protección de datos personales.
            </p>
          </section>

          {/* 2. Datos que recopilamos */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] text-xs flex items-center justify-center font-bold">2</span>
              Información que recopilamos
            </h2>
            <p>Recopilamos únicamente la información necesaria para brindarte nuestros servicios:</p>
            <ul className="list-disc pl-6 space-y-2 text-sm">
              <li>
                <strong>Datos de Registro e Identificación:</strong> Nombre, apellido y dirección de correo electrónico cuando creas una cuenta o solicitas un enlace de acceso directo (Magic Link).
              </li>
              <li>
                <strong>Autenticación con Google (Google OAuth):</strong> Si decides iniciar sesión a través del botón &quot;Continuar con Google&quot;, solicitamos acceso exclusivamente a tu dirección de correo electrónico (<code>email</code>), tu nombre público y tu foto de perfil básica (<code>profile</code>) suministrados por Google Identity Services. No solicitamos permisos para acceder a Google Drive, contactos ni ningún otro dato privado de tu cuenta de Google.
              </li>
              <li>
                <strong>Datos de Tiendas y Pedidos:</strong> Para los creadores (makers), almacenamos la información pública de su tienda (catálogo de productos, precios y datos de contacto). Para los compradores, guardamos el registro de pedidos realizados para seguimiento y facturación.
              </li>
            </ul>
          </section>

          {/* 3. Finalidad del uso de datos */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] text-xs flex items-center justify-center font-bold">3</span>
              Finalidad del uso de los datos
            </h2>
            <p>Los datos recopilados se utilizan con los siguientes propósitos exclusivos:</p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02]">
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                  Autenticación Segura
                </h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  Permitirte iniciar sesión, mantener tu sesión abierta en tus dispositivos y acceder a tu panel de administración o historial de compras.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02]">
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                  Gestión Transaccional
                </h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  Procesar compras, generar comprobantes y permitir la comunicación directa vía WhatsApp o correo entre compradores y tiendas.
                </p>
              </div>
            </div>
          </section>

          {/* 4. No divulgación y uso de datos de Google */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] text-xs flex items-center justify-center font-bold">4</span>
              Política de No Divulgación y Datos de Google API
            </h2>
            <p>
              <strong>Portalmaker no vende, no alquila y no comercializa información personal ni datos de usuarios con terceros bajo ninguna circunstancia.</strong>
            </p>
            <p className="p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.03] border border-[var(--color-borde)] text-xs sm:text-sm">
              El uso que hace Portalmaker de la información recibida a través de las APIs de Google se adhiere en su totalidad a la{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#CA8A04] dark:text-[#FACC15] underline font-semibold"
              >
                Política de Datos de Usuario de los Servicios de la API de Google
              </a>
              , incluidos los requisitos de Uso Limitado (Limited Use Requirements). No utilizamos los datos obtenidos de Google para entrenar modelos de lenguaje ni para publicidad segmentada.
            </p>
          </section>

          {/* 5. Almacenamiento y Seguridad */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] text-xs flex items-center justify-center font-bold">5</span>
              Seguridad y Almacenamiento
            </h2>
            <p>
              Toda la comunicación entre tu navegador y nuestros servidores se realiza mediante conexiones encriptadas con protocolos de seguridad <strong>SSL / TLS (HTTPS)</strong>. Los datos se almacenan en infraestructuras seguras provistas por Supabase y Cloudflare con estándares internacionales de protección de datos (SOC 2, ISO 27001).
            </p>
          </section>

          {/* 6. Derechos del Usuario y Eliminación de Datos */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-[var(--color-texto)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] text-xs flex items-center justify-center font-bold">6</span>
              Tus Derechos y Eliminación de Datos
            </h2>
            <p>
              Como titular de los datos, tienes derecho a acceder a tu información, actualizarla o solicitar su supresión definitiva de nuestras bases de datos en cualquier momento.
            </p>
            <p>
              Para solicitar la eliminación completa de tu cuenta o de tus datos personales, puedes escribirnos directamente a nuestro correo de privacidad:{' '}
              <a
                href="mailto:temperini@gmail.com?subject=Solicitud%20de%20eliminacion%20de%20datos%20-%20Portalmaker"
                className="font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:underline"
              >
                temperini@gmail.com
              </a>
              . Procesaremos tu solicitud dentro de los plazos legales establecidos.
            </p>
          </section>

          {/* 7. Contacto */}
          <section className="space-y-3 border-t border-[var(--color-borde)] pt-6">
            <h2 className="text-xl font-bold text-[var(--color-texto)] flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15]" />
              Contacto sobre Privacidad
            </h2>
            <p className="text-xs sm:text-sm">
              Si tienes dudas o consultas sobre esta política de privacidad, puedes contactar al responsable de tratamiento:
            </p>
            <div className="text-xs space-y-1 opacity-80">
              <p><strong>Responsable:</strong> Enrique Temperini (Portalmaker)</p>
              <p><strong>Email:</strong> temperini@gmail.com</p>
              <p><strong>Sitio Web Oficial:</strong> portalmaker.ar</p>
              <p><strong>Ubicación:</strong> Argentina</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-borde)] py-8 text-center text-xs opacity-60">
        <p>© {new Date().getFullYear()} Portalmaker — Todos los derechos reservados.</p>
      </footer>
    </div>
  )
}
