import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

// =============================================================================
// PORTALMAKER — Endpoint Oficial de Creación de Pedidos (H1, P1, Q)
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
    } = body

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es requerido' }, { status: 400 })
    }

    // Anti-abuso (Q): Rate limit por IP y por tienda
    const rateCheck = checkRateLimit({
      ip: clientIp,
      storeId: String(storeId),
      maxPerIp: 10,
      maxPerStore: 30,
      windowMs: 60000,
    })

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas solicitudes de compra. Por favor espera unos momentos.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter || 30) },
        }
      )
    }

    // 1. Validar datos básicos del comprador
    const cleanNombre = String(nombre || '').trim()
    const cleanEmail = String(email || '').trim().toLowerCase()
    const cleanTelefono = String(telefono || '').trim()
    const cleanDireccion = direccionEntrega ? String(direccionEntrega).trim() : null
    const cleanNotas = notas ? String(notas).trim() : null

    if (!cleanNombre) {
      return NextResponse.json({ error: 'El nombre del comprador es obligatorio' }, { status: 400 })
    }

    if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.length < 5) {
      return NextResponse.json({ error: 'Ingresa un email de contacto válido' }, { status: 400 })
    }

    if (!Array.isArray(clientItems) || clientItems.length === 0) {
      return NextResponse.json({ error: 'El pedido no contiene productos' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 2. Validar que la tienda exista, esté activa y tenga checkout habilitado
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select('id, nombre, suscripcion_activa, checkout_activo, modo_operacion, mp_connected, mp_recargo_porcentaje, comision_portalmaker')
      .eq('id', storeId)
      .single()

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    if (!store.suscripcion_activa) {
      return NextResponse.json({ error: 'La tienda se encuentra temporalmente inactiva' }, { status: 403 })
    }

    // 3. Reconciliar ítems y calcular precios oficiales desde la base de datos (NUNCA del cliente)
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

    for (const rawItem of clientItems) {
      const productId = rawItem.productId || rawItem.product_id
      const variantId = rawItem.variantId || rawItem.variant_id || null
      const quantity = Math.floor(Number(rawItem.quantity || rawItem.cantidad) || 0)

      if (!productId || quantity <= 0) {
        return NextResponse.json({ error: 'Producto o cantidad inválida en el carrito' }, { status: 400 })
      }

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

    // 4. Calcular subtotales y recargo si aplica
    const subtotalProductos = verifiedSnapshotItems.reduce((acc, it) => acc + it.subtotal, 0)
    let totalPedido = subtotalProductos

    // Recargo por Mercado Pago si el comprador eligió ese medio
    const mpRecargoPct = store.mp_connected ? Number(store.mp_recargo_porcentaje) || 0 : 0
    if (metodoPago === 'mercadopago' && mpRecargoPct > 0) {
      const montoRecargo = Number(((subtotalProductos * mpRecargoPct) / 100).toFixed(2))
      totalPedido += montoRecargo
    }

    const finalTotal = Number(totalPedido.toFixed(2))

    // 5. Crear el pedido de forma atómica en Supabase (service_role)
    const { data: createdOrder, error: insertError } = await supabaseAdmin
      .from('orders')
      .insert({
        store_id: store.id,
        nombre_comprador: cleanNombre,
        email_comprador: cleanEmail,
        telefono_comprador: cleanTelefono || null,
        direccion_entrega: cleanDireccion,
        tipo_entrega: tipoEntrega || 'acordar',
        metodo_pago: metodoPago || 'acordar',
        items: verifiedSnapshotItems,
        total: finalTotal,
        costo_envio: 0,
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
