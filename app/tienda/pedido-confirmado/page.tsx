import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { getTenantStore } from '@/lib/tenant'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  MessageCircle,
  ArrowLeft,
  PackageCheck,
  CreditCard,
  ShieldAlert,
} from 'lucide-react'

// =============================================================================
// PORTALMAKER — Pantalla de Confirmación de Pedido (Checkout Pro & Directo)
// Valida el estado real del pedido desde la base de datos (nunca confía en query params).
// Exige public_token en servidor para acceder a datos personales (P1, P2).
// =============================================================================

interface PageProps {
  searchParams: Promise<{
    order_id?: string
    token?: string
    status?: string
  }>
}

/**
 * Enmascara direcciones de correo electrónico para resguardar privacidad del comprador (P1).
 * Ej: "juan.perez@dominio.com" -> "j***z@d***.com"
 */
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return ''
  const [local, domain] = email.split('@')
  const maskedLocal =
    local.length <= 2 ? `${local[0]}***` : `${local[0]}***${local[local.length - 1]}`
  const domainParts = domain.split('.')
  const maskedDomain = domainParts
    .map((part, i) => (i === 0 ? `${part[0]}***` : part))
    .join('.')
  return `${maskedLocal}@${maskedDomain}`
}

/**
 * Enmascara domicilios de entrega para resguardar la privacidad (P1).
 * Ej: "Av. Corrientes 1234, CABA" -> "Av. Corrientes 12***, CABA"
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

export default async function PedidoConfirmadoPage({ searchParams }: PageProps) {
  const { order_id, token } = await searchParams

  if (!order_id) {
    notFound()
  }

  const tenant = await getTenantStore()
  if (!tenant) {
    notFound()
  }

  const { store } = tenant
  const supabaseAdmin = createSupabaseAdminClient()

  // Consultar el pedido de forma segura en la base de datos (P1)
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(
      'id, store_id, nombre_comprador, email_comprador, tipo_entrega, direccion_entrega, items, total, estado_pago, estado_pedido, metodo_pago, public_token'
    )
    .eq('id', order_id)
    .eq('store_id', store.id)
    .maybeSingle()

  if (error || !order) {
    notFound()
  }

  // P1: Validar token. Si no coincide o falta, no se muestran datos personales del comprador
  const hasValidToken = Boolean(token && order.public_token && token === order.public_token)

  // Configuración visual según el estado real de pago registrado en la base de datos (P2)
  const estadoPago = order.estado_pago || 'pendiente'

  const estadoConfigMap: Record<
    string,
    {
      titulo: string
      descripcion: string
      badgeTexto: string
      badgeClass: string
      icono: any
      iconoClass: string
    }
  > = {
    aprobado: {
      titulo: '¡Pago y pedido confirmados!',
      descripcion:
        'Recibimos tu pago correctamente. El taller comenzará la preparación de tu compra.',
      badgeTexto: 'Pago Aprobado',
      badgeClass:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
      icono: CheckCircle2,
      iconoClass: 'text-emerald-600 dark:text-emerald-400',
    },
    pendiente: {
      titulo: 'Pago en proceso de acreditación',
      descripcion:
        order.metodo_pago === 'transferencia'
          ? 'Por favor realiza la transferencia a la cuenta bancaria informada abajo y envía el comprobante.'
          : 'Tu pago está siendo verificado. Te avisaremos una vez confirmado.',
      badgeTexto: 'Pago Pendiente',
      badgeClass:
        'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icono: Clock,
      iconoClass: 'text-amber-600 dark:text-amber-400',
    },
    revision: {
      titulo: 'Pago en revisión técnica',
      descripcion:
        'El pago requiere una breve verificación técnica. Nos pondremos en contacto contigo a la brevedad.',
      badgeTexto: 'En Revisión',
      badgeClass:
        'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
      icono: Clock,
      iconoClass: 'text-sky-600 dark:text-sky-400',
    },
    rechazado: {
      titulo: 'Pago no completado',
      descripcion:
        'El pago no pudo completarse o fue cancelado. Puedes volver a intentar con otro medio de pago.',
      badgeTexto: 'Pago Rechazado',
      badgeClass:
        'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icono: XCircle,
      iconoClass: 'text-rose-600 dark:text-rose-400',
    },
    reembolsado: {
      titulo: 'Pago reembolsado',
      descripcion: 'Este pago fue reembolsado a tu cuenta de origen.',
      badgeTexto: 'Reembolsado',
      badgeClass:
        'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      icono: AlertTriangle,
      iconoClass: 'text-slate-600 dark:text-slate-400',
    },
    contracargo: {
      titulo: 'Pago en disputa / contracargo',
      descripcion: 'Existe una retención o gestión de contracargo sobre esta operación.',
      badgeTexto: 'Contracargo',
      badgeClass:
        'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
      icono: AlertTriangle,
      iconoClass: 'text-rose-600 dark:text-rose-400',
    },
  }

  const estadoConfig = estadoConfigMap[String(estadoPago)] || {
    titulo: 'Estado de pedido',
    descripcion: 'Tu pedido está registrado en nuestro sistema.',
    badgeTexto: String(estadoPago),
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    icono: PackageCheck,
    iconoClass: 'text-slate-600',
  }

  const IconoComponent = estadoConfig.icono

  // Si el pedido es por transferencia y el token es válido, consultar datos bancarios (P3)
  let transferDetails: any = null
  if (order.metodo_pago === 'transferencia' && hasValidToken) {
    const { data: storeDetails } = await supabaseAdmin
      .from('stores')
      .select(
        'transferencia_activa, transferencia_alias, transferencia_cbu_cvu, transferencia_banco, transferencia_titular, transferencia_cuit, transferencia_instrucciones'
      )
      .eq('id', store.id)
      .maybeSingle()

    if (storeDetails?.transferencia_activa) {
      transferDetails = storeDetails
    }
  }

  // Construir enlace directo a WhatsApp para contacto con el vendedor
  const waNumero = store.whatsapp_numero?.replace(/[^0-9]/g, '')
  const waTexto = encodeURIComponent(
    `Hola ${store.nombre}, tengo una consulta sobre mi pedido #${order.id.slice(0, 8)}.`
  )
  const waUrl = waNumero ? `https://wa.me/${waNumero}?text=${waTexto}` : null

  const items = Array.isArray(order.items) ? order.items : []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
        {/* Cabecera de estado */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800/80 mx-auto">
            <IconoComponent className={`w-8 h-8 ${estadoConfig.iconoClass}`} />
          </div>

          <div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border ${estadoConfig.badgeClass}`}
            >
              {estadoConfig.badgeTexto}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-50 mt-3">
              {estadoConfig.titulo}
            </h1>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-2 max-w-lg mx-auto">
              {estadoConfig.descripcion}
            </p>
          </div>
        </div>

        {/* Alerta si el token de seguridad no está presente */}
        {!hasValidToken && (
          <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Vista de verificación básica. Los datos personales sensibles del comprador están ocultos
              porque no se suministró el token de seguridad del pedido.
            </span>
          </div>
        )}

        {/* Resumen del pedido */}
        <div className="mt-8 border-t border-zinc-100 dark:border-zinc-800 pt-6 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Identificador del pedido</span>
            <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
              #{order.id.slice(0, 8).toUpperCase()}
            </span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">Comprador</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {hasValidToken ? order.nombre_comprador || 'Cliente' : 'Cliente'}
            </span>
          </div>

          {hasValidToken && order.email_comprador && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Email de notificación</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                {maskEmail(order.email_comprador)}
              </span>
            </div>
          )}

          {order.tipo_entrega && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Modalidad de entrega</span>
              <span className="capitalize font-medium text-zinc-800 dark:text-zinc-200">
                {order.tipo_entrega === 'retiro'
                  ? 'Retiro en taller / local'
                  : order.tipo_entrega === 'envio'
                  ? 'Envío a domicilio'
                  : 'A coordinar'}
              </span>
            </div>
          )}

          {hasValidToken && order.direccion_entrega && (
            <div className="flex justify-between items-start text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">Dirección</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200 text-right max-w-xs">
                {maskAddress(order.direccion_entrega)}
              </span>
            </div>
          )}
        </div>

        {/* Datos Bancarios si corresponde a transferencia bancaria (P3) */}
        {transferDetails && (
          <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Datos Bancarios para Transferir</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {transferDetails.transferencia_alias && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] text-zinc-400 block uppercase font-medium">Alias</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 select-all text-sm">
                    {transferDetails.transferencia_alias}
                  </span>
                </div>
              )}

              {transferDetails.transferencia_cbu_cvu && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] text-zinc-400 block uppercase font-medium">CBU / CVU</span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 select-all text-xs">
                    {transferDetails.transferencia_cbu_cvu}
                  </span>
                </div>
              )}

              {transferDetails.transferencia_titular && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] text-zinc-400 block uppercase font-medium">Titular</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {transferDetails.transferencia_titular}
                  </span>
                </div>
              )}

              {transferDetails.transferencia_banco && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] text-zinc-400 block uppercase font-medium">Banco / Billetera</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {transferDetails.transferencia_banco}
                  </span>
                </div>
              )}

              {transferDetails.transferencia_cuit && (
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-[10px] text-zinc-400 block uppercase font-medium">CUIT / CUIL</span>
                  <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                    {transferDetails.transferencia_cuit}
                  </span>
                </div>
              )}
            </div>

            {transferDetails.transferencia_instrucciones && (
              <p className="text-xs text-zinc-500 italic pt-1">
                {transferDetails.transferencia_instrucciones}
              </p>
            )}
          </div>
        )}

        {/* Detalle de productos */}
        {items.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 dark:border-zinc-800 pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
              Productos
            </h3>
            <div className="space-y-2">
              {items.map((it: any, index: number) => (
                <div key={index} className="flex justify-between items-center text-sm py-1">
                  <span className="text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">{it.cantidad}x</span> {it.nombre}
                    {it.variante ? ` (${it.variante})` : ''}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    ${Number(it.subtotal || it.precio_unitario * it.cantidad || 0).toLocaleString('es-AR')}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">Total</span>
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                ${Number(order.total).toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        )}

        {/* Acciones de contacto y navegación */}
        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors min-h-[44px]"
            >
              <MessageCircle className="w-4 h-4" />
              Contactar a {store.nombre} por WhatsApp
            </a>
          )}

          {estadoPago === 'rechazado' && (
            <Link
              href={`/tienda/checkout?order_id=${order.id}&token=${order.public_token || ''}`}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium text-sm transition-colors min-h-[44px]"
            >
              Reintentar pago
            </Link>
          )}

          <Link
            href="/tienda"
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium text-sm transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la tienda
          </Link>
        </div>
      </div>
    </div>
  )
}
