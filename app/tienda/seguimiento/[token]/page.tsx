// =============================================================================
// PORTALMAKER — Seguimiento Público de Envíos en Tiempo Real
// URL: /tienda/seguimiento/[token]
// Acceso seguro validado por public_token (inviolable por adivinación).
// Soporta refresco bajo demanda (cache 15 min) contra el transportista.
// REGLAS CRÍTICAS: Cero emojis, solo lucide-react, touch targets >= 44x44px, mobile-first.
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getStoreShippingProvider } from '@/lib/shipping/registry'
import {
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  MessageCircle,
  Building2,
  Calendar,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{
    token: string
  }>
}

/**
 * Enmascara domicilios para resguardar la privacidad del comprador
 */
function maskAddress(addr: string): string {
  if (!addr) return ''
  const parts = addr.split(',')
  if (parts.length > 1) {
    const street = parts[0].trim()
    const streetWords = street.split(' ')
    const maskedStreet =
      streetWords.length > 1 ? `${streetWords[0]} ***` : `${street.slice(0, 3)}***`
    return `${maskedStreet}, ${parts.slice(1).join(',').trim()}`
  }
  return `${addr.slice(0, Math.min(6, addr.length))}***`
}

export default async function SeguimientoEnvioPage({ params }: PageProps) {
  const { token } = await params

  if (!token) {
    notFound()
  }

  const supabaseAdmin = createSupabaseAdminClient()

  // 1. Obtener orden por public_token
  const { data: order, error: orderErr } = await supabaseAdmin
    .from('orders')
    .select('*, stores(*)')
    .eq('public_token', token)
    .maybeSingle()

  if (orderErr || !order || !order.stores) {
    notFound()
  }

  const store = order.stores
  const shortOrderId = order.id.slice(0, 8).toUpperCase()

  // 2. Obtener shipment activo y eventos
  const { data: shipment } = await supabaseAdmin
    .from('shipments')
    .select('*, shipment_events(*)')
    .eq('order_id', order.id)
    .neq('estado', 'cancelado')
    .maybeSingle()

  // 3. Refresco de tracking bajo demanda si transcurrieron más de 15 min
  if (
    shipment &&
    shipment.provider_shipment_id &&
    shipment.provider !== 'manual' &&
    shipment.estado !== 'entregado'
  ) {
    const lastUpdate = new Date(shipment.updated_at).getTime()
    const fifteenMinAgo = Date.now() - 15 * 60 * 1000

    if (isNaN(lastUpdate) || lastUpdate < fifteenMinAgo) {
      const carrier = await getStoreShippingProvider(store.id, shipment.provider)
      if (carrier && carrier.getTracking) {
        try {
          const freshEvents = await carrier.getTracking(shipment.provider_shipment_id)
          if (Array.isArray(freshEvents) && freshEvents.length > 0) {
            for (const ev of freshEvents) {
              const eventId = `${shipment.provider_shipment_id}:${ev.status}:${ev.fecha}`
              const exists = (shipment.shipment_events || []).some(
                (se: any) => se.provider_event_id === eventId
              )
              if (!exists) {
                await supabaseAdmin.from('shipment_events').insert({
                  shipment_id: shipment.id,
                  store_id: store.id,
                  provider_event_id: eventId,
                  estado: ev.status,
                  descripcion: ev.descripcion || ev.status,
                  ocurrido_at: ev.fecha ? new Date(ev.fecha).toISOString() : new Date().toISOString(),
                  source: 'poll',
                  raw: ev,
                })
              }
            }

            // Actualizar timestamp
            await supabaseAdmin
              .from('shipments')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', shipment.id)
          }
        } catch (fetchErr) {
          console.warn('Seguimiento: Error en refresco bajo demanda:', fetchErr)
        }
      }
    }
  }

  // Recargar eventos ordenados
  const { data: sortedEvents } = shipment?.id
    ? await supabaseAdmin
        .from('shipment_events')
        .select('*')
        .eq('shipment_id', shipment.id)
        .order('ocurrido_at', { ascending: false })
    : { data: [] }

  const events = sortedEvents || []

  // Determinar etapa para la barra de progreso
  // Etapas: 1 (Confirmado) -> 2 (Preparando) -> 3 (Despachado / En camino) -> 4 (Entregado)
  const isLocalPickup = order.envio_tipo === 'retiro_local'
  const shipmentState = shipment?.estado || 'pendiente'

  let activeStep = 1
  if (order.estado_pago === 'aprobado') activeStep = 2
  if (['etiquetado', 'despachado', 'en_camino'].includes(shipmentState)) activeStep = 3
  if (shipmentState === 'entregado' || order.estado_pedido === 'entregado') activeStep = 4

  const isCompleted = activeStep === 4
  const hasIssues = ['error', 'incidencia'].includes(shipmentState)

  const dir = (order.envio_direccion as any) || {}
  const items = Array.isArray(order.items) ? order.items : []

  // Link WhatsApp de ayuda
  const cleanPhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : ''
  const waText = encodeURIComponent(
    `Hola, tengo una consulta sobre el estado del pedido #${shortOrderId} de ${store.nombre}.`
  )
  const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${waText}` : null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-16">
      {/* Header superior */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href={`/tienda?tenant=${store.slug}`}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la tienda</span>
          </Link>

          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Pedido</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white">#{shortOrderId}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        {/* Banner de Estado Principal */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                {isLocalPickup ? 'Retiro en Local' : 'Seguimiento de Envío'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {isCompleted
                  ? 'Pedido Entregado'
                  : hasIssues
                    ? 'Atención requerida'
                    : activeStep === 3
                      ? 'Tu pedido está en camino'
                      : activeStep === 2
                        ? 'En preparación'
                        : 'Pedido recibido'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {isLocalPickup
                  ? 'El vendedor está alistando tu paquete para el retiro en su local.'
                  : shipment?.provider
                    ? `Gestionado a través de ${shipment.provider.toUpperCase()}`
                    : 'Alistando paquete para despacho.'}
              </p>
            </div>

            {shipment?.tracking_number && (
              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-left sm:text-right">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 block">Número de Guía</span>
                <span className="font-mono font-bold text-base text-slate-900 dark:text-white block mt-0.5">
                  {shipment.tracking_number}
                </span>
                {shipment.tracking_url && (
                  <a
                    href={shipment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1.5 font-medium"
                  >
                    <span>Abrir en transportista</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Stepper de Progreso */}
          <div className="pt-8">
            <div className="grid grid-cols-4 gap-2 relative">
              <div
                className={`flex flex-col items-center text-center ${
                  activeStep >= 1 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    activeStep >= 1
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs">Confirmado</span>
              </div>

              <div
                className={`flex flex-col items-center text-center ${
                  activeStep >= 2 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    activeStep >= 2
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <Package className="w-5 h-5" />
                </div>
                <span className="text-xs">Preparación</span>
              </div>

              <div
                className={`flex flex-col items-center text-center ${
                  activeStep >= 3 ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    activeStep >= 3
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <Truck className="w-5 h-5" />
                </div>
                <span className="text-xs">En Camino</span>
              </div>

              <div
                className={`flex flex-col items-center text-center ${
                  activeStep >= 4 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                    activeStep >= 4
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <span className="text-xs">Entregado</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Columna Izquierda: Historial de Eventos (Timeline) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>Historial del Envío</span>
              </h2>

              {events.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  <p>Aún no hay eventos registrados por el transportista.</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Las actualizaciones aparecerán en tiempo real cuando el paquete sea despachado.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {events.map((ev: any, index: number) => {
                    const isFirst = index === 0
                    return (
                      <div key={ev.id || index} className="relative">
                        <div
                          className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-slate-900 ${
                            isFirst ? 'border-blue-600 bg-blue-600' : 'border-slate-400'
                          }`}
                        />
                        <div>
                          <p
                            className={`text-sm ${
                              isFirst
                                ? 'font-bold text-slate-900 dark:text-white'
                                : 'font-medium text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {ev.descripcion || ev.estado}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(ev.ocurrido_at).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {ev.raw?.ubicacion && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {ev.raw.ubicacion}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Datos de Entrega / Destino */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>Destino de Entrega</span>
              </h2>

              {isLocalPickup ? (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                        Dirección del Local
                      </span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                        {store.retiro_local_direccion || 'Dirección a coordinar con el vendedor'}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Comunícate por WhatsApp con la tienda para coordinar el día y horario de retiro.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  {order.envio_sucursal ? (
                    <div>
                      <span className="text-xs text-slate-400 block">Sucursal de Retiro</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {order.envio_sucursal.nombre || 'Sucursal oficial'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.envio_sucursal.direccion}, {order.envio_sucursal.localidad}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs text-slate-400 block">Domicilio Registrado</span>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        {maskAddress(dir.calle || order.direccion_envio || '')}
                      </p>
                      <p className="text-xs text-slate-500">
                        {dir.ciudad || ''} {dir.provincia ? `(${dir.provincia})` : ''} — CP {order.codigo_postal || dir.codigoPostal}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400 block">Destinatario</span>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {order.nombre_comprador || 'Cliente'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Columna Derecha: Resumen de Pedido y Contacto */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                Resumen de Productos
              </h2>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((it: any, i: number) => (
                  <div key={i} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {it.cantidad}x {it.nombre}
                      </span>
                      {it.variante && (
                        <span className="block text-slate-400 text-[11px]">{it.variante}</span>
                      )}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ${((Number(it.cantidad) || 1) * (Number(it.precio_unitario) || 0)).toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}

                {Number(order.costo_envio) > 0 && (
                  <div className="py-2 flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                    <span>Costo de envío</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      ${Number(order.costo_envio).toLocaleString('es-AR')}
                    </span>
                  </div>
                )}

                <div className="pt-3 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                  <span>Total abonado</span>
                  <span className="text-base text-blue-600 dark:text-blue-400">
                    ${Number(order.total).toLocaleString('es-AR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Card de Contacto WhatsApp */}
            {waUrl && (
              <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center">
                <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 block mb-1">
                  ¿Tienes dudas sobre tu entrega?
                </span>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-4">
                  Escríbele directamente a {store.nombre} indicando el número #{shortOrderId}.
                </p>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-3 px-4 rounded-xl transition-colors min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Consultar por WhatsApp</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
