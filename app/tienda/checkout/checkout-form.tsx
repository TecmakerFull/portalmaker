// =============================================================================
// PORTALMAKER — Formulario Interactivo de Checkout y Confirmación de Pedido
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/cart-context'
import type { Store } from '@/types/database'
import {
  ShoppingBag,
  Check,
  Clock,
  MessageSquare,
  ArrowLeft,
  Truck,
  Building2,
  CreditCard,
  Banknote,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Info,
  Mail,
  Phone,
  User,
} from 'lucide-react'

interface CheckoutFormProps {
  store: Store
  tenantQuery: string
}

export default function CheckoutForm({ store, tenantQuery }: CheckoutFormProps) {
  const { items, totalAmount, totalItems, hasReservas, clearCart } = useCart()
  const supabase = createSupabaseBrowserClient()

  // Datos del comprador
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')

  // Opciones de entrega: 'acordar' | 'retiro' | 'envio'
  const [tipoEntrega, setTipoEntrega] = useState<'acordar' | 'retiro' | 'envio'>('acordar')

  // Campos separados para envío a domicilio (correo tradicional)
  const [calleNumero, setCalleNumero] = useState('')
  const [pisoDpto, setPisoDpto] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [provincia, setProvincia] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [aclaracionesEntrega, setAclaracionesEntrega] = useState('')

  // Opciones de pago: 'transferencia' | 'efectivo' | 'acordar'
  const [metodoPago, setMetodoPago] = useState<'transferencia' | 'efectivo' | 'acordar'>('transferencia')

  // Notas
  const [notas, setNotas] = useState('')

  // Estados de proceso
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [completedOrder, setCompletedOrder] = useState<{
    orderCode: string
    waUrl: string
    orderTotal: number
    orderItems: any[]
  } | null>(null)

  // Estado para copiar datos de transferencia
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text)
      setCopiedField(fieldName)
      setTimeout(() => setCopiedField(null), 2500)
    } catch (e) {
      console.error(e)
    }
  }

  // Teléfono del vendedor para WhatsApp
  const cleanStorePhone = store.whatsapp_numero ? store.whatsapp_numero.replace(/[^0-9]/g, '') : null

  // Validación de email
  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(val.trim())
  }

  // Manejar envío del pedido
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (items.length === 0) {
      setErrorMsg('El carrito está vacío. Agregá productos antes de continuar.')
      return
    }

    if (!nombre.trim()) {
      setErrorMsg('Por favor completá tu nombre y apellido.')
      return
    }

    if (!telefono.trim()) {
      setErrorMsg('Por favor completá tu número de WhatsApp / teléfono de contacto.')
      return
    }

    if (!email.trim() || !validateEmail(email)) {
      setErrorMsg('Por favor ingresá un correo electrónico válido (ej: nombre@dominio.com).')
      return
    }

    if (tipoEntrega === 'envio') {
      if (!calleNumero.trim() || !ciudad.trim() || !provincia.trim() || !codigoPostal.trim()) {
        setErrorMsg('Por favor completá todos los datos obligatorios de envío: Calle y número, Ciudad, Provincia y Código Postal.')
        return
      }
    }

    setLoading(true)
    setErrorMsg(null)

    const orderCode = `PM-${Math.floor(1000 + Math.random() * 9000)}`

    // Dirección formateada para correo tradicional
    const fullShippingAddress = tipoEntrega === 'envio'
      ? `${calleNumero.trim()}${pisoDpto.trim() ? ` (${pisoDpto.trim()})` : ''}, ${ciudad.trim()}, ${provincia.trim()} (CP: ${codigoPostal.trim()})${aclaracionesEntrega.trim() ? ` [Ref: ${aclaracionesEntrega.trim()}]` : ''}`
      : null

    // Snapshot inmutable de items
    const snapshotItems = items.map((it) => ({
      product_id: it.productId,
      variant_id: it.variantId || null,
      nombre: it.productName,
      variante: it.variantName || null,
      cantidad: it.quantity,
      precio_unitario: it.unitPrice,
      subtotal: it.unitPrice * it.quantity,
      gestiona_stock: it.gestionaStock,
      is_reserva: it.isReserva,
    }))

    const orderPayload = {
      store_id: store.id,
      nombre_comprador: nombre.trim(),
      email_comprador: email.trim(),
      telefono_comprador: telefono.trim(),
      direccion_entrega: fullShippingAddress,
      tipo_entrega: tipoEntrega,
      metodo_pago: metodoPago,
      items: snapshotItems,
      total: totalAmount,
      costo_envio: 0,
      estado_pedido: 'nuevo',
      estado_pago: 'pendiente',
      stock_descontado: false,
      notas: notas.trim() || null,
      observaciones_admin: `Pedido web (${orderCode})`,
    }

    try {
      // 1. Guardar pedido en Supabase
      const { error: insertError } = await supabase.from('orders').insert(orderPayload)

      if (insertError) throw insertError

      // 2. Construir mensaje de WhatsApp
      let entregaLabel = 'A convenir / coordinar por WhatsApp'
      if (tipoEntrega === 'retiro') {
        entregaLabel = `Retiro en local / taller${store.direccion ? ` (${store.direccion})` : ''}`
      } else if (tipoEntrega === 'envio') {
        entregaLabel = `Envío a domicilio (${fullShippingAddress}) — [Costo de envío a cargo del cliente]`
      }

      let pagoLabel = 'A convenir por WhatsApp'
      if (metodoPago === 'transferencia') {
        pagoLabel = 'Transferencia bancaria (Comprobante adjunto)'
      } else if (metodoPago === 'efectivo') {
        pagoLabel = 'Efectivo al retirar / contra entrega'
      }

      const itemsText = items
        .map(
          (it) =>
            `• ${it.quantity}x ${it.productName}${it.variantName ? ` (${it.variantName})` : ''} — $${(
              it.unitPrice * it.quantity
            ).toLocaleString('es-AR')}${it.isReserva ? ' _[Bajo pedido]_' : ''}`
        )
        .join('\n')

      const waMsgLines = [
        `*¡Hola ${store.nombre}! Realicé un nuevo pedido en tu tienda:*`,
        ``,
        `*Pedido:* #${orderCode}`,
        `*Comprador:* ${nombre.trim()}`,
        `*Email:* ${email.trim()}`,
        `*WhatsApp:* ${telefono.trim()}`,
        `*Entrega:* ${entregaLabel}`,
        `*Forma de pago:* ${pagoLabel}`,
        ``,
        `*Detalle de Productos:*`,
        itemsText,
        ``,
        `*TOTAL:* $${totalAmount.toLocaleString('es-AR')}`,
      ]

      if (metodoPago === 'transferencia') {
        waMsgLines.push(``, `*(Te adjunto a continuación el comprobante de la transferencia)*`)
      }

      if (notas.trim()) {
        waMsgLines.push(``, `*Notas adicionales:* ${notas.trim()}`)
      }

      waMsgLines.push(``, `Quedo a la espera de tu confirmación para coordinar. ¡Muchas gracias!`)

      const fullWaMessage = waMsgLines.join('\n')

      const waUrl = cleanStorePhone
        ? `https://wa.me/${cleanStorePhone}?text=${encodeURIComponent(fullWaMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(fullWaMessage)}`

      // 3. Guardar estado completado
      setCompletedOrder({
        orderCode,
        waUrl,
        orderTotal: totalAmount,
        orderItems: [...items],
      })

      // 4. Limpiar carrito
      clearCart()

      // 5. Redireccionar / Abrir WhatsApp automáticamente
      if (typeof window !== 'undefined') {
        window.open(waUrl, '_blank')
      }
    } catch (err: any) {
      console.error('Error al guardar pedido:', err)
      setErrorMsg(err?.message || 'Hubo un error al procesar tu pedido. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // Si el pedido ya fue confirmado exitosamente
  if (completedOrder) {
    return (
      <div className="max-w-xl mx-auto p-6 sm:p-10 bg-[var(--color-fondo)] rounded-3xl border border-black/10 dark:border-white/10 shadow-lg text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-block">
            ¡Pedido Registrado con Éxito!
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-[var(--font-heading)]">
            Pedido #{completedOrder.orderCode}
          </h2>
          <p className="text-xs sm:text-sm opacity-70 max-w-md mx-auto leading-relaxed">
            Tu pedido ha sido guardado en el sistema de <strong>{store.nombre}</strong>.
            Enviamos el detalle por WhatsApp para coordinar el pago y la entrega.
          </p>
        </div>

        {/* Resumen del pedido */}
        <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-left space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider opacity-60">Resumen:</div>
          <div className="space-y-1.5 divide-y divide-black/5 dark:divide-white/5 text-xs sm:text-sm">
            {completedOrder.orderItems.map((it, idx) => (
              <div key={idx} className="pt-1.5 first:pt-0 flex justify-between">
                <span>
                  {it.quantity}x {it.productName} {it.variantName ? `(${it.variantName})` : ''}
                </span>
                <span className="font-bold">
                  ${(it.unitPrice * it.quantity).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-black/10 dark:border-white/10 flex justify-between font-bold text-sm sm:text-base">
            <span>Total:</span>
            <span className="text-[var(--color-primario)]">
              ${completedOrder.orderTotal.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Botón para abrir WhatsApp si no abrió */}
        <div className="space-y-3 pt-2">
          <a
            href={completedOrder.waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[50px] w-full px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-md active:scale-98 transition-all cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Enviar / Abrir en WhatsApp</span>
          </a>

          <Link
            href={`/tienda${tenantQuery}`}
            className="min-h-[44px] w-full px-4 py-2.5 rounded-xl border border-black/15 dark:border-white/15 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    )
  }

  // Carrito Vacío
  if (items.length === 0) {
    return (
      <div className="text-center py-16 sm:py-24 border border-dashed border-black/15 dark:border-white/15 rounded-3xl p-6 max-w-md mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto opacity-60">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Tu carrito está vacío</h2>
          <p className="text-xs sm:text-sm opacity-60 mt-1">
            No tienes productos seleccionados para finalizar la compra.
          </p>
        </div>
        <Link
          href={`/tienda${tenantQuery}`}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs font-bold hover:opacity-90 transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ir al Catálogo</span>
        </Link>
      </div>
    )
  }

  const hasBankData = Boolean(
    store.transferencia_alias ||
    store.transferencia_cbu_cvu ||
    store.transferencia_titular ||
    store.transferencia_banco ||
    store.transferencia_cuit
  )

  return (
    <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Columna Izquierda: Formulario de Datos del Comprador (7 Cols) */}
      <div className="lg:col-span-7 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Datos de Contacto */}
        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-3xl border border-black/10 dark:border-white/10 p-5 sm:p-7 space-y-4 shadow-xs">
          <h2 className="text-base font-bold font-[var(--font-heading)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primario)] text-white text-xs flex items-center justify-center">
              1
            </span>
            <span>Tus Datos de Contacto</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Nombre y Apellido *</span>
              </label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan Pérez"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp / Teléfono *</span>
              </label>
              <input
                type="tel"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 11 2345-6789"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-70 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>Email *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
              />
              <span className="text-[10px] opacity-60 block">
                Para recibir la confirmación y avisos de estado de tu compra.
              </span>
            </div>
          </div>
        </div>

        {/* 2. Forma de Entrega */}
        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-3xl border border-black/10 dark:border-white/10 p-5 sm:p-7 space-y-4 shadow-xs">
          <h2 className="text-base font-bold font-[var(--font-heading)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primario)] text-white text-xs flex items-center justify-center">
              2
            </span>
            <span>Forma de Entrega</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Opción Acordar */}
            <button
              type="button"
              onClick={() => setTipoEntrega('acordar')}
              className={`min-h-[50px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoEntrega === 'acordar'
                  ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/10 ring-2 ring-[var(--color-primario)]/30'
                  : 'border-black/10 dark:border-white/10 bg-[var(--color-fondo)] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-[var(--color-primario)]" />
                <span className="font-bold text-xs">A convenir</span>
              </div>
              <span className="text-[11px] opacity-60">Coordinar por WhatsApp</span>
            </button>

            {/* Opción Retiro en Local / Taller */}
            <button
              type="button"
              onClick={() => setTipoEntrega('retiro')}
              className={`min-h-[50px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoEntrega === 'retiro'
                  ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/10 ring-2 ring-[var(--color-primario)]/30'
                  : 'border-black/10 dark:border-white/10 bg-[var(--color-fondo)] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-[var(--color-primario)]" />
                <span className="font-bold text-xs">Retiro en local</span>
              </div>
              <span className="text-[11px] opacity-60 truncate">
                {store.direccion ? 'Retirar en taller' : 'Retirar en taller'}
              </span>
            </button>

            {/* Opción Envío a Domicilio */}
            <button
              type="button"
              onClick={() => setTipoEntrega('envio')}
              className={`min-h-[50px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                tipoEntrega === 'envio'
                  ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/10 ring-2 ring-[var(--color-primario)]/30'
                  : 'border-black/10 dark:border-white/10 bg-[var(--color-fondo)] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-[var(--color-primario)]" />
                <span className="font-bold text-xs">Envío a domicilio</span>
              </div>
              <span className="text-[11px] opacity-60">Indicar dirección</span>
            </button>
          </div>

          {/* Caja con Dirección de la Tienda si seleccionó Retiro */}
          {tipoEntrega === 'retiro' && (
            <div className="p-4 rounded-2xl bg-[var(--color-fondo)] border border-black/10 dark:border-white/10 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[var(--color-primario)] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold">Dirección de retiro del taller / local:</div>
                  {store.direccion ? (
                    <div className="text-xs sm:text-sm font-semibold opacity-90">
                      {store.direccion}
                    </div>
                  ) : (
                    <div className="opacity-70 italic">
                      La dirección exacta para el retiro será coordinada por WhatsApp una vez confirmado el pedido.
                    </div>
                  )}

                  {store.horario_atencion && (
                    <div className="text-[11px] opacity-70 pt-1">
                      <strong>Horarios de atención:</strong> {store.horario_atencion}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formulario Detallado si seleccionó Envío a Domicilio */}
          {tipoEntrega === 'envio' && (
            <div className="space-y-4 pt-2 animate-in fade-in duration-200">
              {/* Aviso de Condiciones de Envío (Usa la paleta de la tienda) */}
              <div className="p-4 rounded-2xl bg-[var(--color-primario)]/10 border border-[var(--color-primario)]/25 text-[var(--color-texto)] text-xs leading-relaxed flex items-start gap-3">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-primario)]" />
                <div>
                  <strong className="block font-bold mb-0.5 text-[var(--color-primario)]">
                    Condiciones de envío:
                  </strong>
                  <span className="opacity-90">
                    El costo de envío es a cargo del cliente, una vez efectuada la compra nos contactaremos para coordinar el método de envío más conveniente.
                  </span>
                </div>
              </div>

              {/* Campos Separados para Correo Tradicional */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                    Calle y Número *
                  </label>
                  <input
                    type="text"
                    required
                    value={calleNumero}
                    onChange={(e) => setCalleNumero(e.target.value)}
                    placeholder="Ej: Av. Lamadrid 650"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                    Piso / Depto / Unidad (Opcional)
                  </label>
                  <input
                    type="text"
                    value={pisoDpto}
                    onChange={(e) => setPisoDpto(e.target.value)}
                    placeholder="Ej: Piso 3, Dpto B"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                    Código Postal (CP) *
                  </label>
                  <input
                    type="text"
                    required
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                    placeholder="Ej: 2000 o C1425"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                    Ciudad / Localidad *
                  </label>
                  <input
                    type="text"
                    required
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    placeholder="Ej: Rosario"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                    Provincia *
                  </label>
                  <input
                    type="text"
                    required
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    placeholder="Ej: Santa Fe"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                    Aclaraciones para la Entrega (Opcional)
                  </label>
                  <input
                    type="text"
                    value={aclaracionesEntrega}
                    onChange={(e) => setAclaracionesEntrega(e.target.value)}
                    placeholder="Ej: Entre calles Mitre y San Martín / Timbre azul"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Forma de Pago */}
        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-3xl border border-black/10 dark:border-white/10 p-5 sm:p-7 space-y-4 shadow-xs">
          <h2 className="text-base font-bold font-[var(--font-heading)] flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-[var(--color-primario)] text-white text-xs flex items-center justify-center">
              3
            </span>
            <span>Forma de Pago</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Transferencia */}
            <button
              type="button"
              onClick={() => setMetodoPago('transferencia')}
              className={`min-h-[50px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                metodoPago === 'transferencia'
                  ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/10 ring-2 ring-[var(--color-primario)]/30'
                  : 'border-black/10 dark:border-white/10 bg-[var(--color-fondo)] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-[var(--color-primario)]" />
                <span className="font-bold text-xs">Transferencia</span>
              </div>
              <span className="text-[11px] opacity-60">Alias / CBU directo</span>
            </button>

            {/* Efectivo */}
            <button
              type="button"
              onClick={() => setMetodoPago('efectivo')}
              className={`min-h-[50px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                metodoPago === 'efectivo'
                  ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/10 ring-2 ring-[var(--color-primario)]/30'
                  : 'border-black/10 dark:border-white/10 bg-[var(--color-fondo)] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Banknote className="w-4 h-4 text-[var(--color-primario)]" />
                <span className="font-bold text-xs">Efectivo</span>
              </div>
              <span className="text-[11px] opacity-60">Al retirar / entrega</span>
            </button>

            {/* A convenir */}
            <button
              type="button"
              onClick={() => setMetodoPago('acordar')}
              className={`min-h-[50px] p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                metodoPago === 'acordar'
                  ? 'border-[var(--color-primario)] bg-[var(--color-primario)]/10 ring-2 ring-[var(--color-primario)]/30'
                  : 'border-black/10 dark:border-white/10 bg-[var(--color-fondo)] opacity-80 hover:opacity-100'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-[var(--color-primario)]" />
                <span className="font-bold text-xs">A convenir</span>
              </div>
              <span className="text-[11px] opacity-60">Por WhatsApp</span>
            </button>
          </div>

          {/* Caja con Datos Bancarios para Transferencia */}
          {metodoPago === 'transferencia' && (
            <div className="p-4 sm:p-5 rounded-2xl border border-[var(--color-primario)]/30 bg-[var(--color-primario)]/5 space-y-3.5 pt-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--color-primario)] flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Datos de la Cuenta Bancaria para Transferir:</span>
                </span>
              </div>

              {hasBankData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {store.transferencia_alias && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-fondo)] border border-black/10 dark:border-white/10 flex items-center justify-between">
                      <div>
                        <span className="opacity-60 text-[10px] block">Alias</span>
                        <span className="font-mono font-bold select-all">
                          {store.transferencia_alias}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(store.transferencia_alias!, 'alias')}
                        className="min-h-[32px] px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'alias' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'alias' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  )}

                  {store.transferencia_cbu_cvu && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-fondo)] border border-black/10 dark:border-white/10 flex items-center justify-between">
                      <div>
                        <span className="opacity-60 text-[10px] block">CBU / CVU</span>
                        <span className="font-mono font-bold select-all text-[11px]">
                          {store.transferencia_cbu_cvu}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(store.transferencia_cbu_cvu!, 'cbu')}
                        className="min-h-[32px] px-2 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedField === 'cbu' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedField === 'cbu' ? 'Copiado' : 'Copiar'}</span>
                      </button>
                    </div>
                  )}

                  {store.transferencia_titular && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-fondo)] border border-black/10 dark:border-white/10">
                      <span className="opacity-60 text-[10px] block">Titular</span>
                      <span className="font-semibold">{store.transferencia_titular}</span>
                    </div>
                  )}

                  {store.transferencia_banco && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-fondo)] border border-black/10 dark:border-white/10">
                      <span className="opacity-60 text-[10px] block">Banco / Billetera</span>
                      <span className="font-semibold">{store.transferencia_banco}</span>
                    </div>
                  )}

                  {store.transferencia_cuit && (
                    <div className="p-2.5 rounded-xl bg-[var(--color-fondo)] border border-black/10 dark:border-white/10">
                      <span className="opacity-60 text-[10px] block">CUIT / CUIL</span>
                      <span className="font-semibold font-mono">{store.transferencia_cuit}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[var(--color-fondo)] border border-black/10 dark:border-white/10 text-xs opacity-75">
                  Los datos bancarios (Alias / CBU) de la cuenta te serán facilitados al confirmar por WhatsApp.
                </div>
              )}

              {store.transferencia_instrucciones && (
                <p className="text-[11px] opacity-75 italic pt-1">
                  {store.transferencia_instrucciones}
                </p>
              )}

              {/* Aviso Obligatorio de Comprobante por WhatsApp */}
              <div className="p-3 rounded-xl bg-[var(--color-primario)]/10 border border-[var(--color-primario)]/25 text-[var(--color-texto)] text-xs flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--color-primario)]" />
                <span>
                  <strong className="text-[var(--color-primario)]">Importante:</strong> Una vez efectuada la transferencia, enviá el comprobante de pago por WhatsApp para validar tu compra y comenzar la preparación del pedido.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* 4. Notas Adicionales */}
        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-3xl border border-black/10 dark:border-white/10 p-5 sm:p-7 space-y-2 shadow-xs">
          <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
            Notas adicionales para el taller / vendedor (Opcional)
          </label>
          <textarea
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Detalles sobre personalización, colores, horarios preferidos de entrega o consulta adicional..."
            className="w-full p-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)] leading-relaxed"
          />
        </div>
      </div>

      {/* Columna Derecha: Resumen del Pedido y Botón Final (5 Cols) */}
      <div className="lg:col-span-5 sticky top-24 space-y-4">
        <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-3xl border border-black/10 dark:border-white/10 p-5 sm:p-7 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
            <h2 className="text-base font-bold font-[var(--font-heading)]">
              Resumen del Pedido
            </h2>
            <span className="text-xs opacity-60">
              {totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>

          {/* Lista de Items */}
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1 divide-y divide-black/5 dark:divide-white/5">
            {items.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0 flex gap-3 items-center">
                <div className="w-12 h-12 rounded-xl bg-black/5 dark:bg-white/5 overflow-hidden border border-black/10 dark:border-white/10 shrink-0">
                  {item.imagenUrl ? (
                    <img
                      src={item.imagenUrl}
                      alt={item.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-30 text-[10px]">
                      Sin foto
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 text-xs">
                  <div className="font-bold truncate">{item.productName}</div>
                  {item.variantName && (
                    <div className="text-[11px] opacity-70 text-[var(--color-primario)]">
                      {item.variantName}
                    </div>
                  )}
                  <div className="opacity-60 text-[11px]">
                    {item.quantity} x ${item.unitPrice.toLocaleString('es-AR')}
                  </div>
                </div>

                <div className="font-bold text-xs sm:text-sm text-right shrink-0">
                  ${(item.unitPrice * item.quantity).toLocaleString('es-AR')}
                </div>
              </div>
            ))}
          </div>

          {/* Alerta de Reservas */}
          {hasReservas && (
            <div className="p-3 rounded-2xl bg-[var(--color-primario)]/10 border border-[var(--color-primario)]/25 text-[var(--color-texto)] text-[11px] leading-snug flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-[var(--color-primario)]" />
              <span>
                Incluye piezas <strong>a fabricar bajo pedido</strong>. El maker te indicará el plazo estimado.
              </span>
            </div>
          )}

          {/* Total */}
          <div className="pt-3 border-t border-black/10 dark:border-white/10 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold opacity-70">Total a pagar:</span>
              <span className="text-2xl sm:text-3xl font-bold text-[var(--color-primario)] font-[var(--font-heading)]">
                ${totalAmount.toLocaleString('es-AR')}
              </span>
            </div>
            <p className="text-[10px] opacity-50 text-right">
              {tipoEntrega === 'envio'
                ? 'El costo de envío es a cargo del comprador y se coordina con el vendedor.'
                : 'No incluye costos de envío adicionales.'}
            </p>
          </div>

          {/* Botón Principal Confirmar Pedido */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="min-h-[52px] w-full px-6 py-3.5 rounded-2xl bg-[var(--color-primario)] text-white text-sm font-bold hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando pedido...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Confirmar y Enviar por WhatsApp</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] opacity-60 text-center leading-relaxed">
            Al hacer click, tu pedido se registra y se abrirá WhatsApp con el mensaje completo para coordinar directamente con el vendedor.
          </p>
        </div>
      </div>
    </form>
  )
}

