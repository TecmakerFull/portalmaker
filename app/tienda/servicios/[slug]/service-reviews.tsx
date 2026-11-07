// =============================================================================
// PORTALMAKER — Reseñas de un servicio (tienda pública)
//
// Mismo criterio que las reseñas de productos: para opinar hay que tener
// cuenta en la tienda. La reseña se publica al instante y la tienda puede
// ocultarla desde Reseñas en el panel.
// =============================================================================

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ProductReview } from '@/types/database'
import { Star, Loader2, Check, AlertCircle, User } from 'lucide-react'

interface Props {
  storeId: string
  serviceId: string
  serviceSlug: string
  initialReviews: ProductReview[]
  tenantQuery: string
}

export default function ServiceReviews({ storeId, serviceId, serviceSlug, initialReviews, tenantQuery }: Props) {
  const supabase = createSupabaseBrowserClient()
  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews)
  const [usuario, setUsuario] = useState<{ email: string; nombre: string } | null | undefined>(undefined)
  const [rating, setRating] = useState(5)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUsuario(
        user?.email
          ? { email: user.email, nombre: (user.user_metadata?.nombre as string) || (user.user_metadata?.full_name as string) || user.email.split('@')[0] }
          : null
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const promedio = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : null

  const publicar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario || !comentario.trim()) return
    setEnviando(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('product_reviews')
      .insert([
        {
          store_id: storeId,
          service_id: serviceId,
          user_email: usuario.email.toLowerCase(),
          user_name: usuario.nombre,
          rating,
          comentario: comentario.trim(),
          visible: true,
        },
      ])
      .select()
      .single()
    setEnviando(false)
    if (err || !data) {
      setError('No pudimos guardar tu reseña. Probá de nuevo.')
      return
    }
    // El email del autor no se muestra en pantalla
    setReviews([{ ...(data as ProductReview), user_email: '' }, ...reviews])
    setComentario('')
    setOk(true)
    setTimeout(() => setOk(false), 5000)
  }

  return (
    <section className="wrap pb-12 sm:pb-16 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between gap-3 border-t border-black/10 dark:border-white/10 pt-8">
        <h2 className="text-lg font-semibold">Opiniones de clientes</h2>
        {promedio && (
          <span className="text-sm inline-flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <strong>{promedio}</strong>
            <span className="opacity-60">({reviews.length})</span>
          </span>
        )}
      </div>

      {/* Formulario: solo para usuarios de la tienda */}
      <div className="p-5 rounded-2xl border border-black/10 dark:border-white/10 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Tu opinión sobre este servicio
        </h3>

        {usuario === undefined ? (
          <Loader2 className="w-5 h-5 animate-spin opacity-60" />
        ) : usuario ? (
          <form onSubmit={publicar} className="space-y-4">
            <p className="text-xs opacity-70">
              Publicando como <b>{usuario.nombre}</b>
            </p>
            {ok && (
              <p className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" /> ¡Gracias! Tu opinión ya está publicada.
              </p>
            )}
            {error && (
              <p className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
            <div>
              <p className="text-xs font-medium mb-1.5 opacity-80">Calificación</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((estrella) => (
                  <button
                    key={estrella}
                    type="button"
                    onClick={() => setRating(estrella)}
                    aria-label={`Calificar con ${estrella} estrellas`}
                    className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg cursor-pointer"
                  >
                    <Star className={`w-6 h-6 ${estrella <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                  </button>
                ))}
                <span className="text-xs font-semibold ml-2">{rating} de 5</span>
              </div>
            </div>
            <textarea
              rows={3}
              required
              maxLength={1000}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              aria-label="Tu comentario"
              placeholder="Contá cómo fue tu experiencia."
              className="w-full p-3.5 rounded-xl border border-black/15 dark:border-white/15 bg-transparent text-sm outline-none focus:border-[var(--color-primario)] leading-relaxed"
            />
            <button
              type="submit"
              disabled={enviando}
              className="min-h-11 px-5 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-current" />}
              Publicar mi opinión
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-xs opacity-75 leading-relaxed">Para dejar tu opinión necesitás tu cuenta en la tienda. Ingresar o registrarte lleva un minuto.</p>
            <Link
              href={`/tienda/cuenta?next=${encodeURIComponent(`/tienda/servicios/${serviceSlug}`)}${tenantQuery ? `&${tenantQuery.replace('?', '')}` : ''}`}
              className="min-h-11 px-4 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-sm font-semibold inline-flex items-center gap-2"
            >
              <User className="w-4 h-4" /> Ingresar para opinar
            </Link>
          </div>
        )}
      </div>

      {/* Lista */}
      {reviews.length === 0 ? (
        <p className="p-8 text-center rounded-xl border border-dashed border-black/15 dark:border-white/15 text-sm opacity-60">
          Todavía no hay opiniones. ¡Sé el primero en compartir tu experiencia!
        </p>
      ) : (
        <ul className="space-y-4 divide-y divide-black/10 dark:divide-white/10">
          {reviews.map((r) => (
            <li key={r.id} className="pt-4 first:pt-0 space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{r.user_name}</span>
                <span className="flex gap-0.5" aria-label={`${r.rating} de 5 estrellas`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                  ))}
                </span>
              </div>
              <p className="text-sm leading-relaxed opacity-85 whitespace-pre-line">{r.comentario}</p>
              <p className="text-[11px] opacity-50">{new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
