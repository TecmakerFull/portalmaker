// =============================================================================
// PORTALMAKER — Registro automático del cliente al iniciar sesión
//
// Cualquier forma de entrar (contraseña, enlace del correo, confirmación de un
// registro) termina con una sesión en el navegador. Este componente, montado en
// toda la tienda pública, la detecta y le pide al servidor que anote a la persona
// como cliente de la tienda, para que pueda reservar, dejar reseñas y editar sus
// datos aunque nunca pase por "Mi cuenta". Sin pantalla propia.
// =============================================================================

'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// Cada cuánto se refresca "último ingreso" aunque ya esté registrada
const REFRESCO_MS = 12 * 60 * 60 * 1000

export default function CustomerSync({ storeId }: { storeId: string }) {
  const pathname = usePathname()
  // El panel de administración no registra clientes
  const enAdmin = pathname.includes('/admin')

  useEffect(() => {
    if (enAdmin) return
    const supabase = createSupabaseBrowserClient()
    let cancelado = false

    const sincronizar = async (userId: string) => {
      const clave = `pm_cust_sync_${storeId}_${userId}`
      try {
        const ultimo = Number(localStorage.getItem(clave) || 0)
        if (Date.now() - ultimo < REFRESCO_MS) return
      } catch {
        // Sin localStorage: se sincroniza igual
      }
      // En desarrollo y previews la tienda se identifica con ?tenant=
      const tenant = new URLSearchParams(window.location.search).get('tenant')
      try {
        const res = await fetch(`/api/store/customer-sync${tenant ? `?tenant=${encodeURIComponent(tenant)}` : ''}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        })
        if (res.ok && !cancelado) {
          try {
            localStorage.setItem(clave, String(Date.now()))
          } catch {}
        }
      } catch {
        // Sin red: se reintenta en la próxima visita
      }
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id && !cancelado) sincronizar(data.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === 'SIGNED_IN' && session?.user?.id) sincronizar(session.user.id)
    })
    return () => {
      cancelado = true
      sub.subscription.unsubscribe()
    }
  }, [storeId, enAdmin])

  return null
}
