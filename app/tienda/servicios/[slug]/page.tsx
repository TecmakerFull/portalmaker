// =============================================================================
// PORTALMAKER — Página pública de un servicio con reserva de turno
// =============================================================================

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getStoreSections } from '@/lib/store-sections'
import { getStoreExtraSections } from '@/lib/store-extra-sections'
import { getBookingConfig } from '@/lib/booking/setup'
import { formatDuracion } from '@/lib/booking/format'
import { calcularSena } from '@/lib/booking/sena'
import StorefrontHeaderFlow from '../../sections/storefront-header-flow'
import StoreFooter from '../../sections/store-footer'
import BookingWidget from './booking-widget'
import { getTrustIcon } from '@/lib/trust-icons'
import { renderMarkdown, textoPlano } from '@/lib/markdown'
import ServiceReviews from './service-reviews'
import ServiceGallery from './service-gallery'
import { Clock } from 'lucide-react'
import type { Service, ProductReview } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getService(slug: string): Promise<{ service: Service | null }> {
  const tenant = await getTenantStore()
  if (!tenant) return { service: null }
  const supabase = await createSupabaseServerClient()
  // Lectura pública: la política solo devuelve servicios visibles.
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('store_id', tenant.store.id)
    .eq('slug', slug)
    .eq('visible', true)
    .maybeSingle()
  return { service: (data as Service) ?? null }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const tenant = await getTenantStore()
  if (!tenant) return {}
  const { service } = await getService(slug)
  if (!service) return {}

  // El texto puede tener formato: para el resumen de Google y WhatsApp se quitan los símbolos
  const plano = textoPlano(service.descripcion)
  const description = plano.slice(0, 160) || `Reservá ${service.nombre} online en ${tenant.store.nombre}.`
  const path = `/tienda/servicios/${slug}`
  const images = service.imagenes?.[0] ? [{ url: service.imagenes[0], alt: service.nombre }] : []
  return {
    title: { absolute: `${service.nombre} | ${tenant.store.nombre}` },
    description,
    alternates: { canonical: path },
    openGraph: { title: service.nombre, description, url: path, siteName: tenant.store.nombre, locale: 'es_AR', type: 'website', images },
  }
}

export default async function ServicioPage({ params }: PageProps) {
  const { slug } = await params
  const tenant = await getTenantStore()
  if (!tenant) notFound()

  const { store, context } = tenant
  if ((store.tipo_negocio ?? 'productos') === 'productos') notFound()

  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''
  const { service } = await getService(slug)
  if (!service) notFound()

  const supabase = await createSupabaseServerClient()
  // Reseñas visibles del servicio (sin el email de quien las escribió)
  const { data: reseñasRaw } = await supabase
    .from('product_reviews')
    .select('id, store_id, product_id, service_id, user_name, rating, comentario, visible, created_at')
    .eq('service_id', service.id)
    .eq('visible', true)
    .order('created_at', { ascending: false })
  const reseñas = (reseñasRaw ?? []).map((r) => ({ ...r, user_email: '' })) as ProductReview[]

  const [resolvedSections, extraSections, { settings }] = await Promise.all([
    getStoreSections(supabase, store.id, store, false),
    getStoreExtraSections(store),
    getBookingConfig(store),
  ])

  const trustItems =
    extraSections.trust_bar.enabled && extraSections.trust_bar.settings.mostrar_en_producto
      ? extraSections.trust_bar.content.filter((t) => t.activo && t.titulo?.trim()).slice(0, 4)
      : []

  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)] font-[var(--font-body)] transition-colors duration-200 flex flex-col justify-between">
      <div>
        <StorefrontHeaderFlow store={store} resolvedSections={resolvedSections} tenantQuery={tenantQuery} />

        <main className="wrap py-8 sm:py-12 grid gap-8 lg:grid-cols-[1fr_1.1fr] items-start">
          {/* Detalle del servicio */}
          <div className="space-y-4">
            <ServiceGallery imagenes={service.imagenes ?? []} nombre={service.nombre} />
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold font-[var(--font-heading)] leading-tight">{service.nombre}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 opacity-75">
                  <Clock className="w-4 h-4" /> {formatDuracion(service.duracion_minutos)}
                </span>
                {Number(service.precio) > 0 && (
                  <span className="text-lg font-semibold">
                    {service.precio_desde ? 'Desde ' : ''}${Number(service.precio).toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            </div>
            {service.descripcion && <div className="max-w-none">{renderMarkdown(service.descripcion)}</div>}

            {trustItems.length > 0 && (
              <div className="grid gap-3 border-t border-black/10 dark:border-white/10 pt-4 text-xs opacity-75">
                {trustItems.map((t) => {
                  const Icon = getTrustIcon(t.icono)
                  return (
                    <span key={t.id} className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-[var(--color-primario)] shrink-0" />
                      <span>{t.texto?.trim() ? `${t.titulo} — ${t.texto}` : t.titulo}</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Reserva: día, horario y confirmación */}
          <BookingWidget
            storeId={store.id}
            storeNombre={store.nombre}
            service={{ id: service.id, nombre: service.nombre, duracion: service.duracion_minutos }}
            zona={settings.zona_horaria}
            maxDias={settings.anticipacion_max_dias}
            requiereAprobacion={settings.requiere_aprobacion}
            cancelacionHoras={settings.cancelacion_hasta_horas}
            // La seña solo se cobra si la tienda tiene Mercado Pago conectado
            sena={store.mp_connected ? calcularSena(Number(service.precio) || 0, settings.sena_modo, Number(settings.sena_valor) || 0) : 0}
            tenantQuery={tenantQuery}
          />
        </main>

        <ServiceReviews
          storeId={store.id}
          serviceId={service.id}
          serviceSlug={service.slug}
          initialReviews={reseñas}
          tenantQuery={tenantQuery}
        />
      </div>

      <StoreFooter store={store} tenantQuery={tenantQuery} />
    </div>
  )
}
