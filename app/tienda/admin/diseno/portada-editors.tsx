// =============================================================================
// PORTALMAKER — Editores de textos de la portada
//   - Encabezado del catálogo ("Nuestros productos")
//   - Por qué elegirnos (ex manifiesto fijo "Menos, pero mejor")
//   - Novedades (suscripción por email)
//
// Pensados para dueños que no quieren leer mucho: pocos campos, etiquetas
// claras, un ejemplo en cada uno y controles de 44px para usar desde el celular.
// =============================================================================

'use client'

import type {
  StoreSection,
  CatalogHeaderSettings,
  StorySettings,
  StoryPillar,
  NewsletterSettings,
} from '@/types/database'
import { TRUST_ICONS, getTrustIcon } from '@/lib/trust-icons'
import { Plus, Trash2, Type, Sparkles, Mail } from 'lucide-react'
import StyledSelect from '@/components/styled-select'

const inputClass =
  'w-full min-h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-base sm:text-sm'

/** Campo de texto con etiqueta y ayuda corta. */
function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  multiline = false,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  multiline?: boolean
  hint?: string
}) {
  return (
    <div className="space-y-1.5 text-xs">
      <label htmlFor={id} className="font-semibold opacity-75 block">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} py-2.5 resize-y`}
        />
      ) : (
        <input
          id={id}
          type="text"
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      )}
      {hint && <p className="opacity-60">{hint}</p>}
    </div>
  )
}

function EditorCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 text-[var(--color-texto)]">
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h3>
        <p className="text-xs opacity-70 mt-1 leading-relaxed">{description}</p>
      </div>
      {children}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Encabezado del catálogo
// -----------------------------------------------------------------------------
export function CatalogHeaderEditor({
  section,
  onChange,
}: {
  section: StoreSection<CatalogHeaderSettings, []>
  onChange: (updated: StoreSection<CatalogHeaderSettings, []>) => void
}) {
  const s = section.settings
  const set = (patch: Partial<CatalogHeaderSettings>) => onChange({ ...section, settings: { ...s, ...patch } })

  return (
    <EditorCard
      icon={<Type className="w-4 h-4 text-amber-500" />}
      title="Encabezado del catálogo"
      description="Es el título que aparece arriba de tus productos en la portada."
    >
      <TextField id="cat-etiqueta" label="Texto chico (arriba del título)" value={s.etiqueta} onChange={(v) => set({ etiqueta: v })} placeholder="Ej: Nuestros productos" maxLength={40} />
      <TextField id="cat-titulo" label="Título" value={s.titulo} onChange={(v) => set({ titulo: v })} placeholder="Ej: Lo más elegido" maxLength={60} />
      <TextField id="cat-subtitulo" label="Frase debajo del título (opcional)" value={s.subtitulo} onChange={(v) => set({ subtitulo: v })} placeholder="Ej: Envíos a todo el país" maxLength={120} />
    </EditorCard>
  )
}

// -----------------------------------------------------------------------------
// Por qué elegirnos
// -----------------------------------------------------------------------------
const MAX_PILLARS = 4

export function StoryEditor({
  section,
  onChange,
}: {
  section: StoreSection<StorySettings, StoryPillar[]>
  onChange: (updated: StoreSection<StorySettings, StoryPillar[]>) => void
}) {
  const s = section.settings
  const pillars = section.content || []
  const set = (patch: Partial<StorySettings>) => onChange({ ...section, settings: { ...s, ...patch } })
  const setPillars = (next: StoryPillar[]) => onChange({ ...section, content: next })
  const updatePillar = (index: number, patch: Partial<StoryPillar>) => {
    const next = [...pillars]
    next[index] = { ...next[index], ...patch }
    setPillars(next)
  }

  return (
    <EditorCard
      icon={<Sparkles className="w-4 h-4 text-amber-500" />}
      title="Por qué elegirnos"
      description="Un bloque para contar qué hace especial a tu tienda. Si no lo necesitás, ocultalo desde la lista de secciones."
    >
      <TextField id="story-etiqueta" label="Texto chico (arriba del título)" value={s.etiqueta} onChange={(v) => set({ etiqueta: v })} placeholder="Ej: Por qué elegirnos" maxLength={40} />
      <TextField id="story-titulo" label="Título" value={s.titulo} onChange={(v) => set({ titulo: v })} placeholder="Ej: Más de 10 años vendiendo calidad" maxLength={80} />
      <TextField id="story-texto" label="Texto" value={s.texto} onChange={(v) => set({ texto: v })} placeholder="Contá en pocas líneas qué ofrecés y qué te diferencia." maxLength={400} multiline />

      <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer min-h-11">
        <span className="text-xs font-semibold">Mostrar el enlace &quot;Conocé nuestra historia&quot;</span>
        <input
          type="checkbox"
          checked={s.mostrar_link_historia}
          onChange={(e) => set({ mostrar_link_historia: e.target.checked })}
          className="w-5 h-5 accent-[#FACC15] cursor-pointer shrink-0"
        />
      </label>

      <div className="space-y-3">
        <p className="text-xs font-semibold opacity-75">Puntos destacados (hasta {MAX_PILLARS})</p>
        {pillars.map((pilar, index) => {
          const Icon = getTrustIcon(pilar.icono)
          return (
            <div key={pilar.id} className="p-4 rounded-2xl border border-[var(--color-borde)] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-semibold">
                  <Icon className="w-4 h-4 text-amber-500" />
                  Punto {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setPillars(pillars.filter((_, i) => i !== index))}
                  aria-label={`Borrar punto ${index + 1}`}
                  className="min-h-11 min-w-11 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 inline-flex items-center justify-center hover:bg-red-500/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 text-xs">
                <div className="space-y-1.5">
                  <label htmlFor={`pilar-icon-${pilar.id}`} className="font-semibold opacity-75 block">Ícono</label>
                  <StyledSelect
                      id={`pilar-icon-${pilar.id}`}
                      value={pilar.icono}
                      onChange={(v) => updatePillar(index, { icono: v })}
                      options={Object.entries(TRUST_ICONS).map(([clave, { label, icon: Icono }]) => ({ value: clave, label, icon: <Icono className="w-4 h-4 shrink-0 text-amber-500" /> }))}
                    />
                </div>
                <TextField id={`pilar-titulo-${pilar.id}`} label="Título" value={pilar.titulo} onChange={(v) => updatePillar(index, { titulo: v })} placeholder="Ej: Atención cercana" maxLength={40} />
              </div>
              <TextField id={`pilar-texto-${pilar.id}`} label="Texto (opcional)" value={pilar.texto || ''} onChange={(v) => updatePillar(index, { texto: v })} placeholder="Ej: Respondemos rápido por WhatsApp" maxLength={100} />
            </div>
          )
        })}
        <button
          type="button"
          disabled={pillars.length >= MAX_PILLARS}
          onClick={() => setPillars([...pillars, { id: `pilar-${Date.now()}`, icono: 'BadgeCheck', titulo: '', texto: '' }])}
          className="min-h-11 px-4 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{pillars.length >= MAX_PILLARS ? `Máximo ${MAX_PILLARS} puntos` : 'Agregar punto'}</span>
        </button>
      </div>
    </EditorCard>
  )
}

// -----------------------------------------------------------------------------
// Novedades (suscripción por email)
// -----------------------------------------------------------------------------
export function NewsletterEditor({
  section,
  onChange,
}: {
  section: StoreSection<NewsletterSettings, []>
  onChange: (updated: StoreSection<NewsletterSettings, []>) => void
}) {
  const s = section.settings
  const set = (patch: Partial<NewsletterSettings>) => onChange({ ...section, settings: { ...s, ...patch } })

  return (
    <EditorCard
      icon={<Mail className="w-4 h-4 text-amber-500" />}
      title="Novedades por email"
      description="Bloque para que tus clientes dejen su email. Los emails los ves en Suscriptores."
    >
      <TextField id="news-etiqueta" label="Texto chico (arriba del título)" value={s.etiqueta} onChange={(v) => set({ etiqueta: v })} placeholder="Ej: Novedades" maxLength={40} />
      <TextField id="news-titulo" label="Título" value={s.titulo} onChange={(v) => set({ titulo: v })} placeholder="Ej: Enterate primero de las ofertas" maxLength={80} />
      <TextField id="news-texto" label="Frase (opcional)" value={s.texto} onChange={(v) => set({ texto: v })} placeholder="Ej: Te avisamos cuando lleguen productos nuevos" maxLength={140} />
    </EditorCard>
  )
}
