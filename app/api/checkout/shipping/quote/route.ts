// =============================================================================
// PORTALMAKER — Endpoint Oficial de Cotización de Envíos en Checkout (Fase 4)
// "El portal del Maker" | portalmaker.com.ar
//
// Recalcula productos, pesos y medidas desde la base de datos (seguridad estricta),
// consulta los proveedores activos en paralelo con timeout de 8s, aplica markup
// y reglas de envío gratis, y persiste la cotización en shipping_quotes con TTL de 30 min.
// =============================================================================

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp, verifyTurnstileToken, isTurnstileConfigured } from '@/lib/rate-limit'
import { getActiveStoreShippingProviders } from '@/lib/shipping/registry'
import { isValidCodigoPostal, normalizeCodigoPostal, inferirProvinciaYCiudadDesdeCP } from '@/lib/shipping-validators'
import type { QuoteOption, ShippingPackageItem } from '@/lib/shipping/types'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const clientIp = getClientIp(req)
    const body = await req.json()
    const {
      storeId,
      items: clientItems,
      codigoPostal,
      provincia,
      localidad,
      calle,
      altura,
      turnstileToken,
    } = body

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es obligatorio' }, { status: 400 })
    }

    if (!codigoPostal || typeof codigoPostal !== 'string') {
      return NextResponse.json({ error: 'Código postal obligatorio' }, { status: 400 })
    }

    const cleanCp = normalizeCodigoPostal(codigoPostal)
    if (!isValidCodigoPostal(cleanCp)) {
      return NextResponse.json(
        { error: 'Código postal inválido. Debe contener 4 dígitos o formato CPA (ej: 1414 o C1414AAA)' },
        { status: 400 }
      )
    }

    // Rate Limit anti-abuso (20 cotizaciones por IP por minuto)
    const rateCheck = await checkRateLimit({
      ip: clientIp,
      storeId: String(storeId),
      maxPerIp: 20,
      alertPerStore: 80,
      windowMs: 60000,
    })

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Demasiadas cotizaciones desde tu conexión. Por favor aguarda unos segundos.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter || 30) } }
      )
    }

    // Turnstile si está configurado en el servidor
    if (isTurnstileConfigured()) {
      if (!turnstileToken) {
        return NextResponse.json(
          { error: 'Verificación de seguridad requerida (token Turnstile faltante).' },
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

    if (!Array.isArray(clientItems) || clientItems.length === 0) {
      return NextResponse.json({ error: 'El carrito no contiene productos para cotizar' }, { status: 400 })
    }

    if (clientItems.length > 50) {
      return NextResponse.json({ error: 'El pedido supera el límite máximo de 50 líneas' }, { status: 400 })
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Obtener la tienda y sus configuraciones de envío
    const { data: store, error: storeErr } = await supabaseAdmin
      .from('stores')
      .select(`
        id,
        nombre,
        suscripcion_activa,
        checkout_activo,
        modo_operacion,
        envios_activo,
        origen_calle,
        origen_altura,
        origen_localidad,
        origen_provincia,
        origen_codigo_postal,
        envio_gratis_desde,
        envio_markup_porcentaje,
        envio_tarifa_fallback,
        envio_retiro_local_activo
      `)
      .eq('id', storeId)
      .single()

    if (storeErr || !store) {
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    const isCheckoutActive = Boolean(store.checkout_activo || store.modo_operacion === 'tienda')
    if (!store.suscripcion_activa || !isCheckoutActive) {
      return NextResponse.json({ error: 'El checkout no está habilitado para esta tienda' }, { status: 403 })
    }

    // Si la tienda no tiene envíos activos, devolver opciones vacías
    if (!store.envios_activo) {
      return NextResponse.json({
        success: true,
        options: [],
        enviosActivo: false,
        message: 'La tienda no tiene habilitado el módulo de envíos',
      })
    }

    // 2. Reconciliar productos, variantes y medidas desde la base de datos
    const normalizedItemsForHash: Array<{ productId: string; variantId: string | null; quantity: number }> = []
    const packageItems: ShippingPackageItem[] = []
    let subtotalProductos = 0
    let pesoTotalKg = 0
    let volumenTotalCm3 = 0
    let valorDeclaradoTotal = 0

    for (const rawItem of clientItems) {
      const productId = rawItem.productId || rawItem.product_id
      const variantId = rawItem.variantId || rawItem.variant_id || null
      const quantity = Math.max(1, Math.min(999, Math.floor(Number(rawItem.quantity || rawItem.cantidad || 1))))

      if (!productId) continue

      normalizedItemsForHash.push({ productId, variantId, quantity })

      // Consultar producto
      const { data: product } = await supabaseAdmin
        .from('products')
        .select('id, nombre, precio_base, precio_oferta, oferta_activa, visible')
        .eq('id', productId)
        .eq('store_id', store.id)
        .eq('visible', true)
        .maybeSingle()

      if (!product) continue

      let effectivePrice = product.oferta_activa && product.precio_oferta != null
        ? Number(product.precio_oferta)
        : Number(product.precio_base)

      // Consultar medidas de la variante si aplica
      let pesoKg = 0
      let altoCm = 0
      let anchoCm = 0
      let profCm = 0
      let valorDeclaradoUnitario = 0

      if (variantId) {
        const { data: variant } = await supabaseAdmin
          .from('product_variants')
          .select('id, precio_adicional, peso_kg, alto_cm, ancho_cm, profundidad_cm')
          .eq('id', variantId)
          .eq('product_id', product.id)
          .eq('activo', true)
          .maybeSingle()

        if (variant) {
          effectivePrice += Number(variant.precio_adicional || 0)
          pesoKg = Number(variant.peso_kg || 0)
          altoCm = Number(variant.alto_cm || 0)
          anchoCm = Number(variant.ancho_cm || 0)
          profCm = Number(variant.profundidad_cm || 0)
        }
      }

      // Si no están en la variante o es producto simple, heredar de product_details
      const { data: details } = await supabaseAdmin
        .from('product_details')
        .select('peso_kg, alto_cm, ancho_cm, profundidad_cm, valor_declarado')
        .eq('product_id', product.id)
        .maybeSingle()

      if (details) {
        if (!pesoKg) pesoKg = Number(details.peso_kg || 0)
        if (!altoCm) altoCm = Number(details.alto_cm || 0)
        if (!anchoCm) anchoCm = Number(details.ancho_cm || 0)
        if (!profCm) profCm = Number(details.profundidad_cm || 0)
        valorDeclaradoUnitario = Number(details.valor_declarado || 0)
      }

      // Valores por defecto seguros para evitar que una cotización falle por dimensiones cero
      if (!pesoKg || pesoKg <= 0) pesoKg = 0.3
      if (!altoCm || altoCm <= 0) altoCm = 10
      if (!anchoCm || anchoCm <= 0) anchoCm = 10
      if (!profCm || profCm <= 0) profCm = 10
      if (!valorDeclaradoUnitario || valorDeclaradoUnitario <= 0) {
        valorDeclaradoUnitario = effectivePrice
      }

      const itemVolumen = altoCm * anchoCm * profCm
      subtotalProductos += effectivePrice * quantity
      pesoTotalKg += pesoKg * quantity
      volumenTotalCm3 += itemVolumen * quantity
      valorDeclaradoTotal += valorDeclaradoUnitario * quantity

      packageItems.push({
        nombre: product.nombre,
        cantidad: quantity,
        precio_unitario: effectivePrice,
        peso_kg: pesoKg,
        alto_cm: altoCm,
        ancho_cm: anchoCm,
        profundidad_cm: profCm,
        valor_declarado: valorDeclaradoUnitario,
      })
    }

    if (packageItems.length === 0) {
      return NextResponse.json({ error: 'Ninguno de los productos solicitados está disponible' }, { status: 400 })
    }

    // 3. Consultar proveedores activos en paralelo
    const providers = await getActiveStoreShippingProviders(store.id)
    const quoteOptions: QuoteOption[] = []

    // Inferencia de provincia y localidad de destino si el comprador solo ingresó el código postal
    const destInferred = inferirProvinciaYCiudadDesdeCP(cleanCp)
    const effectiveDestProvincia = provincia && String(provincia).trim() ? String(provincia).trim() : destInferred.provincia
    const effectiveDestLocalidad = localidad && String(localidad).trim() ? String(localidad).trim() : destInferred.localidad

    const quoteInput = {
      storeId: store.id,
      origen: {
        codigoPostal: normalizeCodigoPostal(store.origen_codigo_postal || '1414'),
        provincia: store.origen_provincia || '',
        localidad: store.origen_localidad || '',
        calle: store.origen_calle || '',
        altura: store.origen_altura || '',
      },
      destino: {
        codigoPostal: cleanCp,
        provincia: effectiveDestProvincia,
        localidad: effectiveDestLocalidad,
        calle: calle && String(calle).trim() ? String(calle).trim() : '',
        altura: altura && String(altura).trim() ? String(altura).trim() : '',
      },
      items: packageItems,
      pesoTotalKg: Number(pesoTotalKg.toFixed(3)),
      volumenTotalCm3: Math.ceil(volumenTotalCm3),
      valorDeclaradoTotal: Number(valorDeclaradoTotal.toFixed(2)),
    }

    const quotePromises = providers.map((provider) =>
      Promise.race([
        provider.quote(quoteInput),
        new Promise<QuoteOption[]>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout de cotización')), 8000)
        ),
      ])
    )

    const results = await Promise.allSettled(quotePromises)
    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        quoteOptions.push(...res.value)
      } else if (res.status === 'rejected') {
        console.warn('Aviso al cotizar proveedor de envío:', res.reason?.message || res.reason)
      }
    }

    // 4. Aplicar Markup y Envío Gratis
    const markupPct = Number(store.envio_markup_porcentaje) || 0
    const envioGratisDesde = Number(store.envio_gratis_desde) || 0
    const esEnvioGratis = envioGratisDesde > 0 && subtotalProductos >= envioGratisDesde

    const processedOptions: QuoteOption[] = quoteOptions.map((opt) => {
      let finalPrice = opt.costoCarrier
      if (markupPct > 0) {
        finalPrice = Number((finalPrice * (1 + markupPct / 100)).toFixed(2))
      }
      if (esEnvioGratis) {
        finalPrice = 0
      }
      return {
        ...opt,
        precioFinal: finalPrice,
        carrierMetadata: {
          ...opt.carrierMetadata,
          envioGratis: esEnvioGratis,
        },
      }
    })

    // 5. Retiro en el taller / local (solo si no se especificó entrega a domicilio explícita)
    const soloEnvio = body.tipoEntrega === 'envio'
    if (store.envio_retiro_local_activo && !soloEnvio) {
      processedOptions.push({
        optionId: 'retiro_local',
        provider: 'manual',
        serviceName: 'Retiro en el taller / local',
        serviceType: 'retiro_local',
        costoCarrier: 0,
        precioFinal: 0,
        plazoMinDias: 0,
        plazoMaxDias: 1,
        plazoTexto: 'A coordinar con el taller',
        carrierMetadata: {
          retiroLocal: true,
        },
      })
    }

    // 6. Tarifa Fallback de la tienda si no hubo opciones de carriers externos o si fallaron
    const tieneOpcionDomicilio = processedOptions.some((o) => o.serviceType === 'domicilio' || o.serviceType === 'sucursal')
    const fallbackTarifa = Number(store.envio_tarifa_fallback) || 0

    if (!tieneOpcionDomicilio && fallbackTarifa > 0) {
      processedOptions.push({
        optionId: 'fallback',
        provider: 'manual',
        serviceName: 'Envío a domicilio (Tarifa fija de la tienda)',
        serviceType: 'domicilio',
        costoCarrier: fallbackTarifa,
        precioFinal: esEnvioGratis ? 0 : fallbackTarifa,
        plazoMinDias: 2,
        plazoMaxDias: 5,
        plazoTexto: '2 a 5 días hábiles',
        carrierMetadata: {
          isFallback: true,
          envioGratis: esEnvioGratis,
        },
      })
    }

    if (processedOptions.length === 0) {
      return NextResponse.json(
        { error: 'Esta tienda no tiene tarifas de envío a domicilio configuradas para este código postal.' },
        { status: 400 }
      )
    }

    // 7. Generar cart_hash inmutable y persistir cotización en shipping_quotes
    normalizedItemsForHash.sort((a, b) =>
      `${a.productId}_${a.variantId || ''}`.localeCompare(`${b.productId}_${b.variantId || ''}`)
    )
    const hashSource = JSON.stringify(normalizedItemsForHash) + '|' + cleanCp.toUpperCase()
    const cartHash = crypto.createHash('sha256').update(hashSource).digest('hex')

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos

    const { data: quoteRecord, error: quoteInsertErr } = await supabaseAdmin
      .from('shipping_quotes')
      .insert({
        store_id: store.id,
        codigo_postal: cleanCp,
        cart_hash: cartHash,
        options: processedOptions,
        expires_at: expiresAt,
      })
      .select('id')
      .single()

    if (quoteInsertErr || !quoteRecord) {
      console.error('Error al persistir shipping_quote:', quoteInsertErr)
      return NextResponse.json({ error: 'No se pudo guardar la cotización de envío' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      quoteId: quoteRecord.id,
      cartHash,
      codigoPostal: cleanCp,
      expiresAt,
      subtotalProductos: Number(subtotalProductos.toFixed(2)),
      esEnvioGratis,
      options: processedOptions,
    })
  } catch (err: any) {
    console.error('Excepción en /api/checkout/shipping/quote:', err)
    return NextResponse.json(
      { error: err?.message || 'Ocurrió un error inesperado al cotizar el envío' },
      { status: 500 }
    )
  }
}
