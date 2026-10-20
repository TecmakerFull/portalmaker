import { NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
import { verifyStoreAccess } from '@/lib/store-auth'
import type { OrderItem } from '@/types/database'

// =============================================================================
// PORTALMAKER — API para Registro de Ventas Manuales (Mostrador / Directas)
// Valida permisos de administrador de la tienda, descuenta stock de forma segura
// mediante service_role e inserta la orden con sus snapshots inmutables.
// =============================================================================

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await req.json()
    const {
      storeId,
      nombreComprador,
      telefonoComprador,
      emailComprador,
      tipoEntrega,
      metodoPago,
      notas,
      descontarStock,
      items,
    } = body

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es requerido' }, { status: 400 })
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Debes incluir al menos un producto' }, { status: 400 })
    }

    // 1. Validar permisos sobre la tienda
    const authResult = await verifyStoreAccess(user.email, storeId, {
      allowCollaborators: true,
      requiredCollaboratorRoles: ['admin'],
    })

    if (!authResult.authorized || !authResult.store) {
      return NextResponse.json(
        { error: authResult.error || 'No tienes permisos sobre esta tienda' },
        { status: 403 }
      )
    }

    const supabaseAdmin = createSupabaseAdminClient()

    // 2. Procesar ítems y descontar stock si está habilitado
    const snapshotItems: OrderItem[] = []
    let totalCalculado = 0

    for (const item of items) {
      const qty = Math.max(1, parseInt(item.cantidad) || 1)
      const unitPrice = Math.max(0, parseFloat(item.precio_unitario) || 0)
      const subtotal = unitPrice * qty
      totalCalculado += subtotal

      snapshotItems.push({
        product_id: item.productId,
        variant_id: item.variantId || null,
        nombre: String(item.nombre || 'Producto').slice(0, 200),
        variante: item.variante ? String(item.variante).slice(0, 100) : undefined,
        cantidad: qty,
        precio_unitario: unitPrice,
        subtotal: subtotal,
        gestiona_stock: Boolean(item.gestiona_stock),
      })

      if (descontarStock) {
        // Descontar variante si existe
        if (item.variantId) {
          const { data: vData } = await supabaseAdmin
            .from('product_variants')
            .select('stock')
            .eq('id', item.variantId)
            .single()

          if (vData && vData.stock !== null) {
            await supabaseAdmin
              .from('product_variants')
              .update({ stock: Math.max(0, vData.stock - qty) })
              .eq('id', item.variantId)
          }
        }

        // Descontar producto base
        if (item.productId) {
          const { data: pData } = await supabaseAdmin
            .from('products')
            .select('stock, gestiona_stock')
            .eq('id', item.productId)
            .single()

          if (pData && pData.gestiona_stock && pData.stock !== null) {
            await supabaseAdmin
              .from('products')
              .update({ stock: Math.max(0, pData.stock - qty) })
              .eq('id', item.productId)
          }
        }
      }
    }

    // 3. Crear el pedido en orders con el cliente admin de Supabase (bypassa RLS de forma segura)
    const orderPayload = {
      store_id: storeId,
      nombre_comprador: nombreComprador ? String(nombreComprador).trim().slice(0, 150) : 'Consumidor Final',
      telefono_comprador: telefonoComprador ? String(telefonoComprador).trim().slice(0, 50) : null,
      email_comprador: emailComprador ? String(emailComprador).trim().toLowerCase().slice(0, 150) : null,
      tipo_entrega: tipoEntrega || 'retiro',
      direccion_entrega: null,
      items: snapshotItems,
      total: totalCalculado,
      costo_envio: 0,
      estado_pedido: 'entregado',
      estado_pago: 'aprobado',
      metodo_pago: metodoPago || 'efectivo',
      stock_descontado: Boolean(descontarStock),
      notas: notas ? `[Venta Manual] ${String(notas).trim().slice(0, 500)}` : '[Venta Manual]',
      observaciones_admin: 'Venta ingresada manualmente por el dueño de la tienda.',
    }

    const { data: insertedOrder, error: insertErr } = await supabaseAdmin
      .from('orders')
      .insert(orderPayload)
      .select()
      .single()

    if (insertErr) {
      console.error('Error insertando venta manual en orders:', insertErr)
      return NextResponse.json({ error: 'Error al registrar la venta en la base de datos' }, { status: 500 })
    }

    // 4. Si el cliente tiene email, registrar/actualizar en store_customers
    if (orderPayload.email_comprador) {
      try {
        await supabaseAdmin.from('store_customers').upsert(
          {
            store_id: storeId,
            email: orderPayload.email_comprador,
            nombre: orderPayload.nombre_comprador,
            telefono: orderPayload.telefono_comprador,
            ultimo_login: new Date().toISOString(),
          },
          { onConflict: 'store_id,email' }
        )
      } catch (custErr) {
        console.error('Error no bloqueante guardando cliente en CRM:', custErr)
      }
    }

    return NextResponse.json({
      success: true,
      order: insertedOrder,
    })
  } catch (err: any) {
    console.error('Excepción en /api/store/manual-sale:', err)
    return NextResponse.json({ error: err?.message || 'Error interno del servidor' }, { status: 500 })
  }
}
