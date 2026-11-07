// =============================================================================
// PORTALMAKER — Página de Ayuda y Preguntas Frecuentes (Estilo TiendaDemo)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import StorefrontHeaderFlow from '../sections/storefront-header-flow'
import StoreFooter from '../sections/store-footer'
import { getBookingConfig } from '@/lib/booking/setup'
import { getStoreSections } from '@/lib/store-sections'
import { ChevronDown, ArrowRight, HelpCircle } from 'lucide-react'

export default async function TiendaAyudaPage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  const resolvedSections = await getStoreSections(
    supabase,
    store.id,
    store,
    true
  )

  const withTenant = (path: string) => {
    if (!tenantQuery) return path
    const sep = path.includes('?') ? '&' : '?'
    return `${path}${sep}${tenantQuery.replace('?', '')}`
  }

  // Preguntas sobre turnos (tiendas de servicios o "ambos")
  const tipoNegocio = store.tipo_negocio ?? 'productos'
  const vendeProductos = tipoNegocio !== 'servicios'
  const daTurnos = tipoNegocio !== 'productos'
  const { settings: reservas } = daTurnos ? await getBookingConfig(store) : { settings: null }

  const faqsServicios: string[][] = reservas
    ? [
        [
          '¿Cómo reservo un turno?',
          `Elegí el servicio, el día y el horario que más te convenga. Para reservar necesitás tu cuenta en ${store.nombre} (es gratis y se crea en un minuto). Al confirmar te llega un email con el detalle de tu turno.`,
        ],
        [
          '¿Puedo cancelar o cambiar mi turno?',
          reservas.cancelacion_hasta_horas > 0
            ? `Sí. Desde el enlace del email o desde Mi cuenta podés cancelar hasta ${reservas.cancelacion_hasta_horas} horas antes del turno. Después de ese plazo, escribinos para coordinar.`
            : 'Sí. Desde el enlace del email o desde Mi cuenta podés cancelar tu turno cuando quieras. Si necesitás cambiarlo, cancelalo y reservá otro horario.',
        ],
        [
          '¿Qué pasa si el día que quiero está lleno?',
          'Tocá "Avisarme si se libera un turno" en ese día. Si alguien cancela, te mandamos un email para que puedas reservar ese lugar.',
        ],
        ...(reservas.sena_modo !== 'ninguna' && store.mp_connected
          ? [
              [
                '¿Tengo que pagar una seña?',
                'Algunos servicios piden una seña con Mercado Pago para confirmar el turno. Tenés unos minutos para completar el pago; si no, el horario se libera para otra persona.',
              ],
            ]
          : []),
      ]
    : []

  const faqsProductos = [
    [
      '¿Cómo puedo hacer un pedido o encargo?',
      `Elegí un producto de nuestro catálogo, seleccioná la variante que prefieras y agregalo al carrito. Al finalizar la compra podrás elegir entre envío a domicilio, retiro en el local o acordar directamente con ${store.nombre}.`,
    ],
    [
      'Envíos y plazos de fabricación',
      store.direccion
        ? `Coordinamos envíos a todo el país o retiros en nuestro local ubicado en ${store.direccion}. Si un producto es a pedido, te avisamos el plazo de entrega antes de confirmar la compra.`
        : 'Coordinamos envíos a todo el país y entregas personalizadas. Si un producto es a pedido, acordamos los tiempos de entrega antes de confirmar la compra.',
    ],
    [
      'Métodos de pago disponibles',
      store.transferencia_activa
        ? `Aceptamos transferencia bancaria directa (con alias/CBU verificado), efectivo al retirar y métodos de pago digitales acordados.`
        : 'Aceptamos transferencias bancarias, efectivo y modalidades a convenir con la tienda.',
    ],
    [
      'Garantía y devoluciones',
      'Si tu producto sufre un inconveniente durante el traslado o presenta alguna falla, contactanos de inmediato para coordinar el cambio o la solución.',
    ],
    [
      '¿Cómo me contacto con la tienda?',
      store.whatsapp_numero
        ? `Puedes comunicarte por WhatsApp directamente mediante el botón flotante en la pantalla, o completar el formulario en la sección de contacto.`
        : 'Puedes comunicarte mediante el formulario de la sección de contacto y responderemos a la brevedad.',
    ],
    [
      '¿Puedo guardar mis productos favoritos?',
      'Sí, pulsa el ícono de corazón en cualquier producto para guardarlo en tu lista de Favoritos y tenerlo a mano siempre.',
    ],
  ]

  // Una tienda solo de servicios no tiene carrito, envíos ni favoritos: solo
  // se mantienen las preguntas generales (medios de pago y contacto).
  const preguntasGenerales = ['Métodos de pago disponibles', '¿Cómo me contacto con la tienda?']
  const faqs = [
    ...(daTurnos ? faqsServicios : []),
    ...(vendeProductos ? faqsProductos : faqsProductos.filter(([pregunta]) => preguntasGenerales.includes(pregunta))),
  ]

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        <StorefrontHeaderFlow
          store={store}
          resolvedSections={resolvedSections}
          tenantQuery={tenantQuery}
        />

        <main className="wrap py-10 sm:py-16">
          <div className="mx-auto max-w-3xl space-y-8">
            <div>
              <p className="eyebrow text-[var(--color-primario)]">COMPRA CON TRANQUILIDAD</p>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium font-[var(--font-heading)] mt-3 text-[var(--color-texto)]">
                ¿Cómo podemos ayudarte?
              </h1>
              <p className="mt-3 text-xs sm:text-sm opacity-70 text-[var(--color-texto)] leading-relaxed">
                {vendeProductos
                  ? `Condiciones de envío, medios de pago y pedidos en ${store.nombre}.`
                  : `Cómo reservar, cancelar y pagar tus turnos en ${store.nombre}.`}
              </p>
            </div>

            <div className="divide-y divide-black/10 dark:divide-white/10 border-y border-black/10 dark:border-white/10">
              {faqs.map(([q, a]) => (
                <details key={q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm sm:text-base font-medium text-[var(--color-texto)]">
                    <span>{q}</span>
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180 opacity-60" />
                  </summary>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed opacity-75 text-[var(--color-texto)]">
                    {a}
                  </p>
                </details>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href={withTenant('/tienda/contacto')}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 shadow-xs hover:opacity-95 cursor-pointer"
              >
                <span>Contactar con nosotros</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>

      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
