// =============================================================================
// PORTALMAKER — Lista de Tiendas en el Panel de Superadmin
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Store, ExternalLink, Package, Palette, CheckCircle2, XCircle, Power, Loader2 } from 'lucide-react'

type StoreItem = {
  id: string
  nombre: string
  slug: string
  admin_email: string
  slogan: string | null
  suscripcion_activa: boolean
  fecha_inicio_suscripcion: string | null
  fecha_proximo_vencimiento: string | null
  created_at: string
}

export default function SuperadminTiendasList({ initialStores }: { initialStores: StoreItem[] }) {
  const [stores, setStores] = useState<StoreItem[]>(initialStores)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Alternar estado de suscripción (Activar / Pausar)
  const toggleSuscripcion = async (storeId: string, currentState: boolean) => {
    setLoadingId(storeId)
    try {
      const nextState = !currentState
      const { error } = await supabase
        .from('stores')
        .update({ suscripcion_activa: nextState })
        .eq('id', storeId)

      if (error) throw error

      setStores((prev) =>
        prev.map((s) => (s.id === storeId ? { ...s, suscripcion_activa: nextState } : s))
      )
    } catch (err) {
      alert('Error al actualizar la suscripción: ' + (err as Error)?.message)
    } finally {
      setLoadingId(null)
    }
  }

  if (stores.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-[var(--color-borde)] rounded-2xl">
        <Store className="w-10 h-10 mx-auto opacity-40 mb-3" />
        <h3 className="text-base font-bold">No hay tiendas registradas aún</h3>
        <p className="text-xs opacity-70 mt-1">
          Crea la primera tienda de la plataforma haciendo clic en &quot;Nueva Tienda&quot;.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {stores.map((store) => (
        <div
          key={store.id}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-fondo)]/40 hover:bg-[var(--color-fondo)]/80 transition-colors"
        >
          {/* Datos de la Tienda */}
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-base">{store.nombre}</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  store.suscripcion_activa
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                }`}
              >
                {store.suscripcion_activa ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span>Activa</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3 text-amber-500" />
                    <span>Pausada / Prueba</span>
                  </>
                )}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs opacity-70 flex-wrap">
              <span className="font-mono text-[#CA8A04] dark:text-[#FACC15] font-semibold">
                {store.slug}.portalmaker.ar
              </span>
              <span>•</span>
              <span>Maker: <strong>{store.admin_email}</strong></span>
              {store.slogan && (
                <>
                  <span>•</span>
                  <span>{store.slogan}</span>
                </>
              )}
            </div>
          </div>

          {/* Acciones de Superadmin */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Botón para cambiar suscripción */}
            <button
              type="button"
              disabled={loadingId === store.id}
              onClick={() => toggleSuscripcion(store.id, store.suscripcion_activa)}
              className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                store.suscripcion_activa
                  ? 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                  : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              {loadingId === store.id ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Power className="w-3.5 h-3.5" />
              )}
              <span>{store.suscripcion_activa ? 'Pausar' : 'Activar'}</span>
            </button>

            {/* Administrar Catálogo */}
            <Link
              href={`/tienda/admin/productos?tenant=${store.slug}`}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <Package className="w-3.5 h-3.5 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Productos</span>
            </Link>

            {/* Ver Tienda Pública */}
            <Link
              href={`/tienda?tenant=${store.slug}`}
              target="_blank"
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-xs font-semibold flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              <span>Visitar</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
