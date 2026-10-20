import { createSupabaseAdminClient } from '@/lib/supabase/server'
import type { Store } from '@/types/database'

export interface StoreAuthResult {
  authorized: boolean
  isSuperadmin: boolean
  isOwner: boolean
  isCollaborator: boolean
  store: Store | null
  error?: string
}

/**
 * Función centralizada de autorización de tiendas en backend.
 * Comprueba roles contra la base de datos de manera case-insensitive (lower(email)).
 * Soporta Superadmin (platform_admins), Dueño (stores.admin_email) y Colaboradores activos.
 */
export async function verifyStoreAccess(
  userEmail: string | null | undefined,
  storeId: string,
  options: {
    allowCollaborators?: boolean
    requiredCollaboratorRoles?: Array<'admin' | 'editor' | 'colaborador'>
  } = {}
): Promise<StoreAuthResult> {
  if (!userEmail || !userEmail.trim()) {
    return {
      authorized: false,
      isSuperadmin: false,
      isOwner: false,
      isCollaborator: false,
      store: null,
      error: 'Usuario no autenticado o email faltante',
    }
  }

  const cleanEmail = userEmail.trim().toLowerCase()
  const supabaseAdmin = createSupabaseAdminClient()

  // 1. Obtener la tienda
  const { data: store, error: storeErr } = await supabaseAdmin
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .maybeSingle()

  if (storeErr || !store) {
    return {
      authorized: false,
      isSuperadmin: false,
      isOwner: false,
      isCollaborator: false,
      store: null,
      error: 'Tienda no encontrada',
    }
  }

  // 2. Comprobar si es Superadmin del Portal
  const { data: superadminRow } = await supabaseAdmin
    .from('platform_admins')
    .select('email')
    .ilike('email', cleanEmail)
    .maybeSingle()

  if (superadminRow) {
    return {
      authorized: true,
      isSuperadmin: true,
      isOwner: (store.admin_email || '').toLowerCase() === cleanEmail,
      isCollaborator: false,
      store,
    }
  }

  // 3. Comprobar si es Dueño directo de la tienda
  if ((store.admin_email || '').toLowerCase() === cleanEmail) {
    return {
      authorized: true,
      isSuperadmin: false,
      isOwner: true,
      isCollaborator: false,
      store,
    }
  }

  // 4. Comprobar si es Colaborador activo con rol suficiente
  if (options.allowCollaborators) {
    const { data: collab } = await supabaseAdmin
      .from('store_collaborators')
      .select('rol, estado')
      .eq('store_id', storeId)
      .ilike('email', cleanEmail)
      .eq('estado', 'activo')
      .maybeSingle()

    if (collab) {
      const allowedRoles = options.requiredCollaboratorRoles || ['admin']
      if (allowedRoles.includes(collab.rol as any)) {
        return {
          authorized: true,
          isSuperadmin: false,
          isOwner: false,
          isCollaborator: true,
          store,
        }
      }
    }
  }

  return {
    authorized: false,
    isSuperadmin: false,
    isOwner: false,
    isCollaborator: false,
    store,
    error: 'No tienes permisos de administración sobre esta tienda',
  }
}
