import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp, verifyTurnstileToken, isTurnstileConfigured } from '@/lib/rate-limit'

// =============================================================================
// PORTALMAKER — Endpoint Oficial de Creación de Pedidos (H1, P1, Q, X)
// Ejecuta en el servidor con service_role: valida catálogo, stock, email y precios oficiales.
// =============================================================================

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req)
    const body = await req.json()
    const {
      storeId,
      items: clientItems,
      nombre,
      email,
      telefono,
      tipoEntrega,
      direccionEntrega,
      metodoPago,
      notas,
      turnstileToken,
      quoteId,
      optionId,
      sucursal,
      direccionEstructurada,
      documentoComprador,
    } = body

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es requerido' }, { status: 400 })
    }

    // Anti-abuso (Q, X): Rate limit distribuido por IP con alerta de volumen por tienda
    const rateCheck = await checkRateLimit({
      ip: clientIp,
      storeId: String(storeId),
      maxPerIp: 10,
      alertPerStore: 40,
      windowMs: 60000,
    })

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes de compra desde tu conexión. Por favor espera unos momentos.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter || 30) },
        }
      )
    }

    if (rateCheck.storeAlert) {
      console.warn(`Alerta de volumen en checkout para tienda ${storeId}: frecuencia elevada de compras.`)
    }

    // Ronda 7: Turnstile obligatorio si está configurado en el servidor (isTurnstileConfigured())
    if (isTurnstileConfigured()) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: 'Verificación de seguridad requerida (token faltante). Por favor recarga e intenta nuevamente.' },
          { status: 400 }
        )
      }
      const isValidCaptcha = await verifyTurnstileToken(turnstileToken, clientIp)
      if (!isValidCaptcha) {
        return NextResponse.json(
          { error: 'Validación de seguridad captcha fallida. Por favor recarga e intenta nuevamente.' },
          { status: 400 }
        )
      }
    }

    // Ronda 7: Whitelist estricta de metodoPago y tipoEntrega
    const ALLOWED_METODOS_PAGO = ['mercadopago', 'transferencia', 'efectivo', 'acordar']
    const ALLOWED_TIPOS_ENTREGA = ['retiro', 'envio', 'acordar']

    if (!metodoPago || !ALLOWED_METODOS_PAGO.includes(metodoPago)) {
      return NextResponse.json({ error: `Método de pago no válido: ${metodoPago}` }, { status: 400 })
    }

    if (tipoEntrega && !ALLOWED_TIPOS_ENTREGA.includes(tipoEntrega)) {
      return NextResponse.json({ error: `Tipo de entrega no válido: ${tipoEntrega}` }, { status: 400 })
    }

    // 1. Validar datos básicos y límites de longitud del comprador
    const cleanNombre = String(nombre || '').trim()
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanTelefono = String(telefono || '').trim()
    const cleanDireccion = direccionEntrega ? String(direccionEntrega).trim() : null
    const cleanNotas = notas ? String(notas).trim() : null

    if (!cleanNombre) {
      return NextResponse.json({ error: 'El nombre del comprador es obligatorio' }, { status: 400 })
    }
    if (cleanNombre.length > 100) {
      return NextResponse.json({ error: 'El nombre del comprador no puede superar los 100 caracteres' }, { status: 400 })
    }

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!cleanEmail || cleanEmail.length > 150 || !EMAIL_REGEX.test(cleanEmail)) {
      return NextResponse.json({ error: 'Ingresa un email de contacto válido (máximo 150 caracteres)' }, { status: 400 })
    }

    if (cleanTelefono && cleanTelefono.length > 30) {
      return NextResponse.json({ error: 'El teléfono no puede superar los 30 caracteres' }, { status: 400 })
    }

    if (cleanDireccion && cleanDireccion.length > 200) {
      return NextResponse.json({ error: 'La dirección no puede superar los 200 caracteres' }, { status: 400 })
    }

    if (cleanNotas && cleanNotas.length > 500) {
      return NextResponse.json({ error: 'Las notas no pueden superar los 500 caracteres' }, { status: 400 })
    }

    if (!Array.isArray(clientItems) || clientItems.length === 0) {
      return NextResponse.json({ error: 'El pedido no contiene productos' }, { status: 400 })
    }

    // Límite máximo de 50 líneas
    if (clientItems.length > 50) {
      return NextResponse.json({ error: 'El pedido supera el límite máximo permitido de 50 líneas de productos' }, { status: 400 })
    }

    // Ronda 7: Validar cantidades (entero entre 1 y 999) y agrupar líneas repetidas de un mismo producto o variante
    const groupedItemsMap = new Map<string, { productId: string; variantId: string | null; quantity: number }>()

    for (const rawItem of clientItems) {
      const productId = rawItem.productId || rawItem.product_id
      const variantId = rawItem.variantId || rawItem.variant_id || null
      const rawQty = rawItem.quantity != null ? rawItem.quantity : rawItem.cantidad
      const quantity = Number(rawQty)

      if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
        return NextResponse.json(
          { error: 'Cada producto debe contener un identificador válido y una cantidad entera entre 1 y 999' },
          { status: 400 }
        )
      }

      const groupKey = `${productId}__${variantId || 'novar'}`
      const existing = groupedItemsMap.get(groupKey)
      if (existing) {
        const combinedQty = existing.quantity + quantity
        if (combinedQty > 999) {
          return NextResponse.json(
            { error: 'La cantidad combinada de un mismo producto o variante no puede superar 999 unidades' },
            { status: 400 }
          )
        }
        existing.quantity = combinedQty
      } else {
        groupedItemsMap.set(groupKey, { productId, variantId, quantity })
      }
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 2. Validar que la tienda exista, esté activa, con checkout activo y métodos habilitados
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, nombre, suscripcion_activa, checkout_activo, modo_operacion, mp_connected, mp_recargo_porcentaje, comision_portalmaker, transferencia_activa, envios_activo, envio_tarifa_fallback')
      .eq('id', storeId)
      .single()

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    if (!store.suscripcion_activa) {
      return NextResponse.json({ error: 'La tienda se encuentra temporalmente inactiva' }, { status: 403 })
    }

    if (!store.checkout_activo) {
      return NextResponse.json({ error: 'El checkout se encuentra deshabilitado para esta tienda' }, { status: 403 })
    }

    if (metodoPago === 'mercadopago' && !store.mp_connected) {
      return NextResponse.json({ error: 'Mercado Pago no está habilitado en esta tienda' }, { status: 400 })
    }

    if (metodoPago === 'transferencia' && !store.transferencia_activa) {
      return NextResponse.json({ error: 'El pago por transferencia no está habilitado en esta tienda' }, { status: 400 })
    }

    // 3. Reconciliar ítems agrupados y calcular precios oficiales desde la base de datos (NUNCA del cliente)
    const verifiedSnapshotItems: Array<{
      product_id: string
      variant_id: string | null
      nombre: string
      variante: string | null
      cantidad: number
      precio_unitario: number
      subtotal: number
      gestiona_stock: boolean
      is_reserva: boolean
    }> = []

    for (const group of groupedItemsMap.values()) {
      const { productId, variantId, quantity } = group

      // Consultar producto oficial en la tienda
      const { data: product, error: prodErr } = await supabaseAdmin
        .from('products')
        .select('id, nombre, precio_base, precio_oferta, oferta_activa, gestiona_stock, stock, visible')
        .eq('id', productId)
        .eq('store_id', store.id)
        .eq('visible', true)
        .maybeSingle()

      if (prodErr || !product) {
        return NextResponse.json({ error: 'Uno de los productos seleccionados ya no está disponible' }, { status: 400 })
      }

      let effectiveUnitPrice = product.oferta_activa && product.precio_oferta != null
        ? Number(product.precio_oferta)
        : Number(product.precio_base)

      let variantNombre: string | null = null
      let isVariant = false

      if (variantId) {
        const { data: variant, error: varErr } = await supabaseAdmin
          .from('product_variants')
          .select('id, nombre, precio_adicional, stock, activo')
          .eq('id', variantId)
          .eq('product_id', product.id)
          .eq('activo', true)
          .maybeSingle()

        if (varErr || !variant) {
          return NextResponse.json({ error: `La variante seleccionada para "${product.nombre}" no está disponible` }, { status: 400 })
        }

        effectiveUnitPrice += Number(variant.precio_adicional || 0)
        variantNombre = variant.nombre
        isVariant = true

        // Validar stock de variante si aplica
        if (variant.stock !== null && variant.stock !== undefined) {
          if (variant.stock < quantity) {
            return NextResponse.json(
              { error: `Stock insuficiente para "${product.nombre} (${variant.nombre})". Disponibles: ${variant.stock}` },
              { status: 400 }
            )
          }
        }
      } else {
        // Validar stock de producto simple si aplica
        if (product.gestiona_stock && product.stock !== null && product.stock !== undefined) {
          if (product.stock < quantity) {
            return NextResponse.json(
              { error: `Stock insuficiente para "${product.nombre}". Disponibles: ${product.stock}` },
              { status: 400 }
            )
          }
        }
      }

      effectiveUnitPrice = Number(effectiveUnitPrice.toFixed(2))
      const itemSubtotal = Number((effectiveUnitPrice * quantity).toFixed(2))

      verifiedSnapshotItems.push({
        product_id: product.id,
        variant_id: variantId,
        nombre: product.nombre,
        variante: variantNombre,
        cantidad: quantity,
        precio_unitario: effectiveUnitPrice,
        subtotal: itemSubtotal,
        gestiona_stock: isVariant ? true : Boolean(product.gestiona_stock),
        is_reserva: false,
      })
    }

    // 4. Calcular costo de envío y validar cotización oficial si corresponde
    let costoEnvio = 0
    let envioProveedor: string | null = null
    let envioServicio: string | null = null
    let envioModalidad: string | null = null
    let envioSucursal: any = null
    let envioQuoteId: string | null = null

    if (tipoEntrega === 'envio') {
      if (quoteId && optionId) {
        const { data: quoteRecord } = await supabaseAdmin
          .from('shipping_quotes')
          .select('*')
          .eq('id', quoteId)
          .eq('store_id', store.id)
          .maybeSingle()

        if (!quoteRecord) {
          return NextResponse.json(
            { error: 'La cotización de envío no fue encontrada. Por favor cotiza nuevamente.' },
            { status: 400 }
          )
        }

        // Verificar integridad del carrito (cart_hash)
        const normalizedItemsForHash = Array.from(groupedItemsMap.values())
          .map((it) => ({
            productId: it.productId,
            variantId: it.variantId,
            quantity: it.quantity,
          }))
          .sort((a, b) => `${a.productId}_${a.variantId || ''}`.localeCompare(`${b.productId}_${b.variantId || ''}`))

        const expectedHashSource =
          JSON.stringify(normalizedItemsForHash) + '|' + String(quoteRecord.codigo_postal).toUpperCase()
        const expectedCartHash = crypto.createHash('sha256').update(expectedHashSource).digest('hex')

        if (quoteRecord.cart_hash !== expectedCartHash) {
          return NextResponse.json(
            { error: 'El carrito cambió desde la última cotización de envío. Por favor vuelve a cotizar.' },
            { status: 400 }
          )
        }

        const isExpired = new Date(quoteRecord.expires_at).getTime() < Date.now()
        if (isExpired) {
          return NextResponse.json(
            { error: 'La cotización de envío expiró. Por favor vuelve a cotizar para obtener la tarifa vigente.' },
            { status: 400 }
          )
        }

        const optionsList = Array.isArray(quoteRecord.options) ? quoteRecord.options : []
        const chosenOption = optionsList.find((opt: any) => opt.optionId === optionId)

        if (!chosenOption) {
          return NextResponse.json(
            { error: 'La opción de envío seleccionada ya no es válida para este pedido.' },
            { status: 400 }
          )
        }

        costoEnvio = Number(chosenOption.precioFinal) || 0
        envioProveedor = chosenOption.provider
        envioServicio = chosenOption.serviceName
        envioModalidad = chosenOption.serviceType || 'domicilio'
        envioSucursal = sucursal || null
        envioQuoteId = quoteRecord.id
      } else if (Number(store.envio_tarifa_fallback) > 0) {
        costoEnvio = Number(store.envio_tarifa_fallback)
        envioProveedor = 'manual'
        envioServicio = 'Envío estándar (tarifa fija)'
        envioModalidad = 'domicilio'
      }
    } else if (tipoEntrega === 'retiro') {
      costoEnvio = 0
      envioProveedor = 'manual'
      envioServicio = 'Retiro en el taller / local'
      envioModalidad = 'retiro_local'
    }

    // 5. Calcular subtotales y recargo si aplica
    const subtotalProductos = verifiedSnapshotItems.reduce((acc, it) => acc + it.subtotal, 0)
    let totalPedido = subtotalProductos + costoEnvio

    // Recargo por Mercado Pago si el comprador eligió ese medio (sobre subtotal productos)
    const mpRecargoPct = store.mp_connected ? Number(store.mp_recargo_porcentaje) || 0 : 0
    let montoRecargo = 0
    if (metodoPago === 'mercadopago' && mpRecargoPct > 0) {
      montoRecargo = Number(((subtotalProductos * mpRecargoPct) / 100).toFixed(2))
      totalPedido += montoRecargo
    }

    const finalTotal = Number(totalPedido.toFixed(2))

    // Formatear dirección legible combinada si no vino explícita
    let resolvedDireccion = cleanDireccion
    if (!resolvedDireccion && direccionEstructurada) {
      const d = direccionEstructurada
      const calleYAlt = `${d.calle || ''} ${d.altura || ''}`.trim()
      const pDpto = d.pisoDepto ? ` (${d.pisoDepto})` : ''
      resolvedDireccion = `${calleYAlt}${pDpto}, ${d.localidad || ''}, ${d.provincia || ''} (CP: ${d.codigoPostal || ''})`
      if (d.referencias) resolvedDireccion += ` [Ref: ${d.referencias}]`
    }

    // 6. Crear el pedido de forma atómica en Supabase (service_role)
    const { data: createdOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        store_id: store.id,
        nombre_comprador: cleanNombre,
        email_comprador: cleanEmail,
        telefono_comprador: cleanTelefono || null,
        direccion_entrega: resolvedDireccion,
        tipo_entrega: tipoEntrega || 'acordar',
        metodo_pago: metodoPago || 'acordar',
        items: verifiedSnapshotItems,
        total: finalTotal,
        costo_envio: Number(costoEnvio.toFixed(2)),
        estado_pedido: 'nuevo',
        estado_pago: 'pendiente', // Forzado estrictamente a pendiente
        stock_descontado: false, // Forzado estrictamente a false
        notas: cleanNotas,
        mp_preference_id: null,
        mp_init_point: null,
        mp_payment_id: null,
        mp_merchant_order_id: null,
        mp_fee_portalmaker: 0.00,
        mp_net_received: 0.00,
        comision_portalmaker_pct: Number(store.comision_portalmaker) || 0.00,
        mp_recargo_pct: mpRecargoPct,
        // Metadatos estructurados de envío (Fase 4)
        envio_calle: direccionEstructurada?.calle?.trim() || null,
        envio_altura: direccionEstructurada?.altura?.trim() || null,
        envio_piso_depto: direccionEstructurada?.pisoDepto?.trim() || null,
        envio_localidad: direccionEstructurada?.localidad?.trim() || null,
        envio_provincia: direccionEstructurada?.provincia?.trim() || null,
        envio_codigo_postal: direccionEstructurada?.codigoPostal?.trim() || null,
        envio_referencias: direccionEstructurada?.referencias?.trim() || null,
        documento_comprador: documentoComprador ? String(documentoComprador).trim() : null,
        envio_proveedor: envioProveedor,
        envio_servicio: envioServicio,
        envio_modalidad: envioModalidad,
        envio_sucursal: envioSucursal,
        envio_quote_id: envioQuoteId,
      })
      .select('id, public_token')
      .single()

    if (insertError || !createdOrder) {
      console.error('Error al insertar pedido en base de datos:', insertError)
      return NextResponse.json({ error: 'No se pudo crear el pedido. Intenta nuevamente.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      orderId: createdOrder.id,
      publicToken: createdOrder.public_token,
    })
  } catch (err: any) {
    console.error('Excepción en /api/checkout/orders:', err)
    return NextResponse.json({ error: 'Ocurrió un error inesperado al procesar el pedido' }, { status: 500 })
  }
}
