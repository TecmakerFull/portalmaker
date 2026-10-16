import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/server'

// =============================================================================
// PORTALMAKER — Recuperación de Contraseña con Contexto de Tienda
// Permite inyectar el nombre de la tienda en los metadatos del usuario antes de
// disparar el correo de recuperación para que la plantilla de Supabase renderice
// {{ .Data.store_name }} con el nombre de la tienda específica.
// =============================================================================

export async function POST(req: Request) {
  try {
    const { email, storeName, storeSlug, redirectTo } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'El correo electrónico es requerido' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()
    const supabaseAdmin = createSupabaseAdminClient()

    // 1. Intentar actualizar user_metadata con la tienda actual antes de enviar el email
    try {
      const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 50,
      })

      if (!listErr && usersData?.users) {
        const targetUser = usersData.users.find(
          (u) => u.email?.toLowerCase() === cleanEmail
        )

        if (targetUser) {
          await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
            user_metadata: {
              ...(targetUser.user_metadata || {}),
              store_name: storeName,
              store_slug: storeSlug,
            },
          })
        }
      }
    } catch (metaErr) {
      // Si falla la actualización de metadata, no bloqueamos el envío de recuperación
      console.warn('No se pudo actualizar store_name en metadata previa a recovery:', metaErr)
    }

    // 2. Disparar el correo de recuperación mediante el cliente admin
    const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    })

    if (resetErr) {
      return NextResponse.json({ error: resetErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Error en /api/auth/store-recover:', err)
    return NextResponse.json(
      { error: err?.message || 'Error al procesar la solicitud de recuperación' },
      { status: 500 }
    )
  }
}
