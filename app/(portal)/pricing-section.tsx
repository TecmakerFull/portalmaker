// =============================================================================
// PORTALMAKER — Sección de Precios y Planes (Inspirada en Tiendanube)
// Selector Mensual / Anual (-25%) y tarjetas responsivas con funciones destacadas.
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Sparkles, ArrowRight, Zap, ShieldCheck, HelpCircle } from 'lucide-react'

// Contacto oficial del portal
const PORTAL_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_PORTAL_WHATSAPP ?? '5493415866464'

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'mensual' | 'anual'>('mensual')

  const plans = [
    {
      id: 'free',
      nombre: 'Inicial / Vitrina',
      badge: '100% Gratis',
      popular: false,
      precioMensual: 0,
      precioAnualMensualizado: 0,
      descripcion: 'Para comenzar a mostrar tus productos y recibir pedidos por WhatsApp sin costos fijos.',
      destacados: [
        'Hasta 15 productos con fotos y variantes',
        'Venta directa acordada por WhatsApp',
        'Dirección propia: tutienda.portalmaker.ar',
        'Ficha técnica con tiempo de fabricación',
        'Sin comisiones por venta (0%)',
      ],
      ctaText: 'Crear tienda gratis',
      ctaHref: '/login?mode=register&plan=free',
      buttonStyle: 'border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)]',
    },
    {
      id: 'starter',
      nombre: 'Starter',
      badge: 'Venta Online',
      popular: false,
      precioMensual: 12000,
      precioAnualMensualizado: 9000,
      descripcion: 'Para tiendas que quieren cobrar online con tarjetas y coordinar envíos con tarifas fijas.',
      destacados: [
        'Hasta 50 productos con control de stock',
        'Carrito de compras y Checkout online',
        'Cobros integrados: Mercado Pago y Alias/CBU',
        'Tarifas fijas de envío por zona o moto',
        '1 colaborador de equipo para atender',
        'CRM de clientes y registro de valoraciones',
      ],
      ctaText: 'Elegir Starter',
      ctaHref: '/login?mode=register&plan=starter',
      buttonStyle: 'border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)]',
    },
    {
      id: 'maker_pro',
      nombre: 'Maker Pro',
      badge: 'Más Elegido',
      popular: true,
      precioMensual: 25000,
      precioAnualMensualizado: 18750,
      descripcion: 'La solución completa para talleres consolidados: couriers automáticos y dominio propio.',
      destacados: [
        'Hasta 150 productos con trazabilidad de stock',
        'Envíos con Zipnova (Andreani, Correo Argentino, OCA)',
        'Etiquetas de despacho listas para imprimir',
        'Tu propio dominio web (tutienda.com.ar)',
        'Hasta 3 colaboradores de equipo',
        'Comisión reducida de plataforma (2.5%)',
      ],
      ctaText: 'Elegir Maker Pro',
      ctaHref: '/login?mode=register&plan=maker_pro',
      buttonStyle: 'bg-[#FF5500] text-white hover:bg-[#E04B00] font-bold shadow-sm',
    },
    {
      id: 'enterprise',
      nombre: 'Enterprise',
      badge: 'Gran Escala',
      popular: false,
      precioMensual: 50000,
      precioAnualMensualizado: 37500,
      descripcion: 'Para talleres y fabricantes con alto volumen: catálogo ilimitado y 0% de comisión.',
      destacados: [
        'Catálogo ilimitado de productos',
        '0% de comisión por venta de Portalmaker',
        'Colaboradores y usuarios ilimitados',
        'Estadísticas avanzadas y analítica',
        'Soporte prioritario por WhatsApp y videollamada',
        'Migración asistida de productos',
      ],
      ctaText: 'Consultar Enterprise',
      ctaHref: `https://wa.me/${PORTAL_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        '¡Hola! Me comunico desde portalmaker.com.ar. Me interesa conocer más sobre el Plan Enterprise para mi taller/tienda.'
      )}`,
      buttonStyle: 'border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)]',
    },
  ]

  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Gratis'
    return `$${amount.toLocaleString('es-AR')}`
  }

  return (
    <section id="planes" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-[var(--color-borde)]">
      {/* Título de Sección */}
      <div className="text-center max-w-3xl mx-auto space-y-3 mb-10">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#FF5500]">
          <Zap className="w-4 h-4" />
          <span>Planes transparentes y sin sorpresas</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight font-[var(--font-portal-heading)]">
          Una solución a medida de cada negocio
        </h2>
        <p className="text-sm sm:text-base opacity-75 max-w-2xl mx-auto leading-relaxed">
          Podés empezar gratis sin pagar costo mensual y subir de plan únicamente cuando tu volumen de ventas lo requiera.
        </p>

        {/* Selector Mensual / Anual */}
        <div className="pt-4 flex items-center justify-center">
          <div className="inline-flex items-center p-1 rounded-full bg-black/5 dark:bg-white/5 border border-[var(--color-borde)]">
            <button
              type="button"
              onClick={() => setBillingCycle('mensual')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                billingCycle === 'mensual'
                  ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Mensual
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('anual')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'anual'
                  ? 'bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span>Anual</span>
              <span className="px-2 py-0.5 rounded-full bg-[#FF5500]/15 text-[#FF5500] text-[10px] font-bold">
                -25%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grilla de Planes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => {
          const currentPrice =
            billingCycle === 'anual' ? plan.precioAnualMensualizado : plan.precioMensual

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                plan.popular
                  ? 'bg-[var(--color-superficie)] border-2 border-[#FF5500] shadow-md ring-4 ring-[#FF5500]/15'
                  : 'bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs'
              }`}
            >
              {/* Badge Más Popular */}
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#FF5500] text-white text-[11px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-white" />
                  <span>{plan.badge}</span>
                </div>
              )}

              <div>
                {/* Nombre y Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-xl font-bold font-[var(--font-portal-heading)]">{plan.nombre}</h3>
                  {!plan.popular && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-black/5 dark:bg-white/5 opacity-80">
                      {plan.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs opacity-70 min-h-[36px] mb-4 leading-relaxed">
                  {plan.descripcion}
                </p>

                {/* Precio */}
                <div className="pb-5 border-b border-[var(--color-borde)]">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-bold tracking-tight">
                      {formatPrice(currentPrice)}
                    </span>
                    {plan.precioMensual > 0 && (
                      <span className="text-xs opacity-60 font-medium">ARS /mes</span>
                    )}
                  </div>
                  {plan.precioMensual > 0 && billingCycle === 'anual' && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                      Facturado anualmente (Ahorrás 25%)
                    </p>
                  )}
                </div>

                {/* Destacados */}
                <div className="py-5 space-y-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                    Incluye:
                  </span>
                  <ul className="space-y-2.5 text-xs sm:text-sm">
                    {plan.destacados.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-snug">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span className="opacity-85">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Botón CTA */}
              <div className="pt-4 border-t border-[var(--color-borde)]">
                {plan.ctaHref.startsWith('http') ? (
                  <a
                    href={plan.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full min-h-[46px] px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${plan.buttonStyle}`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <Link
                    href={plan.ctaHref}
                    className={`w-full min-h-[46px] px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${plan.buttonStyle}`}
                  >
                    <span>{plan.ctaText}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Aclaraciones y Letra Chica Transparente */}
      <div className="mt-12 p-6 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] max-w-4xl mx-auto space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FF5500]">
          <ShieldCheck className="w-4 h-4" />
          <span>Aclaraciones importantes y flexibilidad</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs opacity-75 leading-relaxed">
          <div>
            <strong className="block text-[var(--color-texto)] opacity-90 mb-0.5">
              ¿Puedo empezar gratis y cambiar después?
            </strong>
            Sí. Podés abrir tu tienda hoy sin tarjeta ni compromisos. Cuando necesites cobrar online, emitir etiquetas de envío o sumar colaboradores, cambiás de plan con un clic.
          </div>
          <div>
            <strong className="block text-[var(--color-texto)] opacity-90 mb-0.5">
              ¿Aplica a cualquier tipo de producto?
            </strong>
            Portalmaker fue concebido con el foco en talleres y fabricación a pedido, pero su catálogo y checkout son 100% compatibles con indumentaria, calzado, deco, bazar y artesanías.
          </div>
        </div>
      </div>
    </section>
  )
}
