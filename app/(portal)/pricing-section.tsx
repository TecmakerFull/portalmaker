// =============================================================================
// PORTALMAKER — Sección de Precios, Planes y Comparativa Dinámica
// Valores cargados dinámicamente desde la configuración de planes de la plataforma.
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Check,
  X as XIcon,
  Sparkles,
  ArrowRight,
  Zap,
  ShieldCheck,
  HelpCircle,
  Percent,
} from 'lucide-react'
import { buildSubscriptionMatrix, type MatrixCategory } from '@/lib/plans'

// Contacto oficial del portal
const PORTAL_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_PORTAL_WHATSAPP ?? '5493415866464'

interface PublicPlan {
  id: string
  nombre: string
  commission_pct: number
  max_active_products: number | null
  whatsapp_orders: boolean
  online_checkout: boolean
  mercadopago: boolean
  deposit_payments: boolean
  mp_surcharge: boolean
  bank_transfer: boolean
  precio_mensual_ars?: number
}

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Check className="w-3.5 h-3.5" />
      </div>
    ) : (
      <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/5 dark:bg-white/5 opacity-40">
        <XIcon className="w-3 h-3" />
      </div>
    )
  }

  return <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">{value}</span>
}

export default function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'mensual' | 'anual'>('mensual')
  const [plansData, setPlansData] = useState<Record<string, PublicPlan>>({
    free: {
      id: 'free',
      nombre: 'Free',
      commission_pct: 3.0,
      max_active_products: 15,
      whatsapp_orders: true,
      online_checkout: true,
      mercadopago: true,
      deposit_payments: true,
      mp_surcharge: true,
      bank_transfer: false,
      precio_mensual_ars: 0,
    },
    starter: {
      id: 'starter',
      nombre: 'Starter',
      commission_pct: 2.0,
      max_active_products: 50,
      whatsapp_orders: true,
      online_checkout: true,
      mercadopago: true,
      deposit_payments: true,
      mp_surcharge: true,
      bank_transfer: true,
      precio_mensual_ars: 12000,
    },
    maker_pro: {
      id: 'maker_pro',
      nombre: 'Maker Pro',
      commission_pct: 1.0,
      max_active_products: 150,
      whatsapp_orders: true,
      online_checkout: true,
      mercadopago: true,
      deposit_payments: true,
      mp_surcharge: true,
      bank_transfer: true,
      precio_mensual_ars: 25000,
    },
    enterprise: {
      id: 'enterprise',
      nombre: 'Enterprise',
      commission_pct: 0.0,
      max_active_products: null,
      whatsapp_orders: true,
      online_checkout: true,
      mercadopago: true,
      deposit_payments: true,
      mp_surcharge: true,
      bank_transfer: true,
      precio_mensual_ars: 50000,
    },
  })

  // Cargar valores de planes dinámicamente desde la API pública
  useEffect(() => {
    fetch('/api/public/plans')
      .then((res) => res.json())
      .then((data) => {
        if (data.plans && Array.isArray(data.plans)) {
          const map: Record<string, PublicPlan> = {}
          for (const p of data.plans) {
            map[p.id] = p
          }
          setPlansData((prev) => ({ ...prev, ...map }))
        }
      })
      .catch(() => {
        // En caso de fallo de red, se mantiene el fallback oficial
      })
  }, [])

  const matrix: MatrixCategory[] = buildSubscriptionMatrix(plansData)

  const freeComm = plansData.free?.commission_pct ?? 3
  const starterComm = plansData.starter?.commission_pct ?? 2
  const proComm = plansData.maker_pro?.commission_pct ?? 1
  const entComm = plansData.enterprise?.commission_pct ?? 0

  const cards = [
    {
      id: 'free',
      nombre: 'Inicial / Free',
      badge: '100% Gratis',
      popular: false,
      precioMensual: 0,
      precioAnualMensualizado: 0,
      descripcion: 'Para comenzar a vender online o por WhatsApp sin costos mensuales fijos.',
      destacados: [
        `Hasta ${plansData.free?.max_active_products ?? 15} productos activos en catálogo`,
        'Carrito de compras y Checkout online',
        'Mercado Pago (tarjetas y cuotas)',
        'Seña y pagos parciales integrados',
        'Recargo por MP trasladable al comprador',
        `Comisión por venta con MP: ${freeComm}%`,
        'Hasta 15 clientes registrados y CRM',
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
      descripcion: 'Para tiendas que quieren sumar transferencias bancarias y envíos con tarifas fijas.',
      destacados: [
        `Hasta ${plansData.starter?.max_active_products ?? 50} productos activos`,
        'Transferencia bancaria en checkout (CBU/Alias)',
        'Tarifas fijas de envío por zona o moto',
        '1 colaborador de equipo para atender',
        `Comisión reducida por venta con MP: ${starterComm}%`,
        'Hasta 50 clientes registrados',
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
      descripcion: 'La solución completa para marcas y talleres: couriers automáticos y dominio web propio.',
      destacados: [
        `Hasta ${plansData.maker_pro?.max_active_products ?? 150} productos con trazabilidad`,
        'Envíos con Zipnova (Andreani, Correo Argentino, OCA)',
        'Etiquetas de despacho listas para imprimir',
        'Tu propio dominio web (tutienda.com.ar)',
        'Hasta 3 colaboradores de equipo',
        `Comisión preferencial por venta con MP: ${proComm}%`,
        'Hasta 100 clientes registrados',
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
        `${entComm}% de comisión por venta de Portalmaker`,
        'Colaboradores y clientes registrados ilimitados',
        'Estadísticas avanzadas y analítica',
        'Soporte prioritario por WhatsApp y videollamada',
        'Migración asistida de productos',
      ],
      ctaText: 'Consultar Enterprise',
      ctaHref: `https://wa.me/${PORTAL_WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        '¡Hola! Me comunico desde portalmaker.com.ar. Me interesa conocer más sobre el Plan Enterprise para mi negocio.'
      )}`,
      buttonStyle: 'border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-texto)]',
    },
  ]

  const formatPrice = (amount: number) => {
    if (amount === 0) return 'Gratis'
    return `$${amount.toLocaleString('es-AR')}`
  }

  return (
    <section id="planes" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-[var(--color-borde)] space-y-16">
      {/* Título de Sección */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#FF5500]">
          <Zap className="w-4 h-4" />
          <span>Planes transparentes y sin sorpresas</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-normal tracking-wide font-brand">
          Una solución a medida de cada negocio
        </h2>
        <p className="text-xs sm:text-sm opacity-70">
          Elegí la modalidad que mejor se adapte a tu momento. Podés cambiar o cancelar cuando quieras.
        </p>

        {/* Toggle Mensual / Anual */}
        <div className="pt-4 flex items-center justify-center">
          <div className="inline-flex items-center p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)] text-xs">
            <button
              type="button"
              onClick={() => setBillingCycle('mensual')}
              className={`min-h-[38px] px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                billingCycle === 'mensual'
                  ? 'bg-white dark:bg-zinc-800 text-[var(--color-texto)] shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Pago Mensual
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('anual')}
              className={`min-h-[38px] px-4 py-2 rounded-xl font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'anual'
                  ? 'bg-white dark:bg-zinc-800 text-[var(--color-texto)] shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              <span>Pago Anual</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                -25%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Tarjetas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
        {cards.map((plan) => {
          const currentPrice =
            billingCycle === 'anual' ? plan.precioAnualMensualizado : plan.precioMensual

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                plan.popular
                  ? 'bg-[var(--color-superficie)] border-2 border-[#FF5500] shadow-lg ring-4 ring-[#FF5500]/10'
                  : 'bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#FF5500] text-white text-[10px] font-bold uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Más Elegido</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                    {plan.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold font-[var(--font-portal-heading)] mb-1">
                  {plan.nombre}
                </h3>
                <p className="text-xs opacity-70 min-h-[34px] mb-4 leading-relaxed">
                  {plan.descripcion}
                </p>

                <div className="py-3 border-y border-[var(--color-borde)]">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold tracking-tight">
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

      {/* =======================================================================
          TABLA COMPARATIVA DETALLADA DE CARACTERÍSTICAS (DINÁMICA)
          ======================================================================= */}
      <div id="comparativa" className="rounded-3xl border border-[var(--color-borde)] bg-[var(--color-superficie)] overflow-hidden shadow-xs">
        <div className="p-6 border-b border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01]">
          <h3 className="text-base sm:text-xl font-bold">
            Comparativa Detallada de Planes
          </h3>
          <p className="text-xs opacity-70 mt-1">
            Revisá en detalle cada funcionalidad, pasarela de pago y comisión para elegir con precisión.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <th className="py-4 px-6 w-2/5">Característica / Funcionalidad</th>
                <th className="py-4 px-4 text-center w-[15%]">Free</th>
                <th className="py-4 px-4 text-center w-[15%]">Starter</th>
                <th className="py-4 px-4 text-center w-[15%] bg-[#FF5500]/[0.05] font-bold text-[#FF5500]">
                  Maker Pro
                </th>
                <th className="py-4 px-4 text-center w-[15%]">Enterprise</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--color-borde)] text-xs">
              {matrix.map((category) => (
                <div key={category.nombre} style={{ display: 'contents' }}>
                  <tr className="bg-black/[0.03] dark:bg-white/[0.03]">
                    <td
                      colSpan={5}
                      className="py-3 px-6 font-bold uppercase tracking-wider text-[11px] text-[#FF5500]"
                    >
                      {category.nombre}
                    </td>
                  </tr>

                  {category.items.map((item) => (
                    <tr
                      key={item.nombre}
                      className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                          {item.nombre}
                        </span>
                        <span className="text-[11px] opacity-60 block mt-0.5">
                          {item.descripcion}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <CellValue value={item.free} />
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <CellValue value={item.starter} />
                      </td>

                      <td className="py-3.5 px-4 text-center bg-[#FF5500]/[0.03]">
                        <CellValue value={item.maker_pro} />
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <CellValue value={item.enterprise} />
                      </td>
                    </tr>
                  ))}
                </div>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aclaraciones y Flexibilidad */}
      <div className="p-6 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] max-w-4xl mx-auto space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FF5500]">
          <ShieldCheck className="w-4 h-4" />
          <span>Aclaraciones sobre comisiones y operatividad</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs opacity-75 leading-relaxed">
          <div>
            <strong className="block text-[var(--color-texto)] opacity-90 mb-0.5">
              ¿Cómo funciona la comisión de Portalmaker?
            </strong>
            Es una retención de plataforma por cada venta completada mediante Mercado Pago, adicional a la comisión propia de Mercado Pago. En el plan Enterprise es 0%.
          </div>
          <div>
            <strong className="block text-[var(--color-texto)] opacity-90 mb-0.5">
              ¿Qué es la seña o pago parcial?
            </strong>
            Permite cobrar un anticipo (porcentaje o monto fijo) en el checkout de Mercado Pago y coordinar el saldo pendiente por fuera o mediante un nuevo enlace.
          </div>
          <div>
            <strong className="block text-[var(--color-texto)] opacity-90 mb-0.5">
              ¿Puedo empezar gratis y cambiar después?
            </strong>
            Sí. Podés abrir tu tienda hoy sin tarjeta ni compromisos. En cuanto necesites transferencias bancarias en checkout o couriers automáticos, cambiás con un clic.
          </div>
          <div>
            <strong className="block text-[var(--color-texto)] opacity-90 mb-0.5">
              ¿Quién traslada el recargo por Mercado Pago?
            </strong>
            El recargo financiero de MP es configurable desde tu panel y podés optar por absorberlo o trasladarlo al comprador en el checkout.
          </div>
        </div>
      </div>
    </section>
  )
}
