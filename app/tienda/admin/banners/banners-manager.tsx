// =============================================================================
// PORTALMAKER — Panel de Administración de Banners y Carrusel Promocional
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store, Banner } from '@/types/database'
import {
  Layers,
  Plus,
  Trash2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Check,
  Loader2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Tag,
  ShoppingBag,
  FolderTree,
  Link2,
} from 'lucide-react'

interface ProductOption {
  id: string
  nombre: string
  slug: string
  visible: boolean
}

interface CategoryOption {
  id: string
  nombre: string
  slug: string
}

interface BannersManagerProps {
  store: Store
  initialBanners: Banner[]
  products: ProductOption[]
  categories: CategoryOption[]
  tenantQuery: string
}

interface SlideItem {
  id?: string
  imagen_url: string
  titulo: string
  subtitulo: string
  has_cta: boolean
  cta_texto: string
  cta_destino_tipo: 'producto' | 'categoria' | 'custom'
  cta_destino_valor: string
  cta_url: string
  activo: boolean
  orden: number
}

export default function BannersManager({
  store,
  initialBanners,
  products,
  categories,
  tenantQuery,
}: BannersManagerProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  // Master switch
  const [bannersActivo, setBannersActivo] = useState(store.banners_activo ?? false)

  // Mapear banners iniciales al formato de edición
  const mapInitialBanners = (list: Banner[]): SlideItem[] => {
    return list.slice(0, 3).map((b, idx) => {
      let destinoTipo: 'producto' | 'categoria' | 'custom' = 'custom'
      let destinoValor = b.cta_url || ''

      if (b.cta_url) {
        if (b.cta_url.includes('/tienda/productos/')) {
          destinoTipo = 'producto'
          const slug = b.cta_url.split('/tienda/productos/')[1]?.split('?')[0] || ''
          destinoValor = slug
        } else if (b.cta_url.includes('cat=')) {
          destinoTipo = 'categoria'
          const cat = b.cta_url.split('cat=')[1]?.split('&')[0] || ''
          destinoValor = cat
        }
      }

      return {
        id: b.id,
        imagen_url: b.imagen_url || '',
        titulo: b.titulo || '',
        subtitulo: b.subtitulo || '',
        has_cta: Boolean(b.cta_texto && b.cta_url),
        cta_texto: b.cta_texto || 'Ver Más',
        cta_destino_tipo: destinoTipo,
        cta_destino_valor: destinoValor,
        cta_url: b.cta_url || '',
        activo: b.activo ?? true,
        orden: b.orden ?? idx,
      }
    })
  }

  const [slides, setSlides] = useState<SlideItem[]>(() => mapInitialBanners(initialBanners))
  const [saving, setSaving] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Agregar nuevo slide (máximo 3)
  const handleAddSlide = () => {
    if (slides.length >= 3) return
    const newSlide: SlideItem = {
      imagen_url: '',
      titulo: '',
      subtitulo: '',
      has_cta: false,
      cta_texto: 'Ver Producto',
      cta_destino_tipo: products.length > 0 ? 'producto' : 'custom',
      cta_destino_valor: products[0]?.slug || '',
      cta_url: products[0]?.slug ? `/tienda/productos/${products[0].slug}` : '',
      activo: true,
      orden: slides.length,
    }
    setSlides([...slides, newSlide])
  }

  // Eliminar slide
  const handleDeleteSlide = (index: number) => {
    const updated = slides.filter((_, i) => i !== index).map((s, idx) => ({ ...s, orden: idx }))
    setSlides(updated)
  }

  // Mover slide arriba/abajo
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= slides.length) return

    const updated = [...slides]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp

    setSlides(updated.map((s, idx) => ({ ...s, orden: idx })))
  }

  // Actualizar campo de slide
  const handleUpdateSlide = (index: number, field: keyof SlideItem, value: any) => {
    const updated = [...slides]
    const current = { ...updated[index], [field]: value }

    // Si cambió destino tipo o valor, recalcular cta_url final
    if (field === 'cta_destino_tipo' || field === 'cta_destino_valor') {
      const tipo = field === 'cta_destino_tipo' ? value : current.cta_destino_tipo
      const valor = field === 'cta_destino_valor' ? value : current.cta_destino_valor

      if (tipo === 'producto') {
        current.cta_url = valor ? `/tienda/productos/${valor}` : ''
      } else if (tipo === 'categoria') {
        current.cta_url = valor ? `/tienda?cat=${valor}` : ''
      } else {
        current.cta_url = valor || ''
      }
    }

    updated[index] = current
    setSlides(updated)
  }

  // Subir imagen a Supabase Storage
  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingIndex(index)
      const fileExt = file.name.split('.').pop()
      const fileName = `${store.id}/banner-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`

      const { data, error } = await supabase.storage
        .from('portalmaker-media')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      const { data: publicUrlData } = supabase.storage
        .from('portalmaker-media')
        .getPublicUrl(fileName)

      if (publicUrlData?.publicUrl) {
        handleUpdateSlide(index, 'imagen_url', publicUrlData.publicUrl)
      }
    } catch (err: any) {
      console.error('Error al subir imagen de banner:', err)
      setMsg({ type: 'error', text: 'Error al subir la imagen. Podés ingresar la URL directamente.' })
    } finally {
      setUploadingIndex(null)
    }
  }

  // Guardar todos los cambios
  const handleSaveAll = async () => {
    setSaving(true)
    setMsg(null)

    try {
      // 1. Validar que los slides activos tengan imagen
      for (let i = 0; i < slides.length; i++) {
        if (!slides[i].imagen_url.trim()) {
          throw new Error(`Por favor ingresá la imagen para el Slide #${i + 1} antes de guardar.`)
        }
      }

      // 2. Actualizar switch maestro en stores
      const { error: storeError } = await supabase
        .from('stores')
        .update({
          banners_activo: bannersActivo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', store.id)

      if (storeError) throw storeError

      // 3. Sincronizar tabla banners (borrar anteriores y reinsertar ordenados)
      const { error: deleteError } = await supabase
        .from('banners')
        .delete()
        .eq('store_id', store.id)

      if (deleteError) throw deleteError

      if (slides.length > 0) {
        const rowsToInsert = slides.map((s, idx) => ({
          store_id: store.id,
          imagen_url: s.imagen_url.trim(),
          titulo: s.titulo.trim() || null,
          subtitulo: s.subtitulo.trim() || null,
          cta_texto: s.has_cta && s.cta_texto.trim() ? s.cta_texto.trim() : null,
          cta_url: s.has_cta && s.cta_url.trim() ? s.cta_url.trim() : null,
          orden: idx,
          activo: s.activo,
        }))

        let { error: insertError } = await supabase.from('banners').insert(rowsToInsert)

        // Si la columna subtitulo no existe en la base de datos de banners, reintentar sin ella
        if (insertError && (insertError.message?.includes('subtitulo') || insertError.code === 'PGRST204')) {
          const fallbackRows = rowsToInsert.map(({ subtitulo, ...rest }) => rest)
          const fallbackResult = await supabase.from('banners').insert(fallbackRows)
          insertError = fallbackResult.error
        }

        if (insertError) throw insertError
      }

      // 4. Sincronizar también con la arquitectura modular store_sections (hero)
      try {
        const heroSlides = slides.map((s, idx) => ({
          id: s.id || `slide-${idx}`,
          imagen_desktop: s.imagen_url.trim(),
          titulo: s.titulo.trim() || null,
          subtitulo: s.subtitulo.trim() || null,
          cta_texto: s.has_cta && s.cta_texto.trim() ? s.cta_texto.trim() : null,
          cta_url: s.has_cta && s.cta_url.trim() ? s.cta_url.trim() : null,
          cta_destino_tipo: s.cta_destino_tipo,
          cta_destino_valor: s.cta_destino_valor,
          orden: idx,
          activo: s.activo,
        }))

        await supabase.from('store_sections').upsert(
          {
            store_id: store.id,
            section_type: 'hero',
            enabled: bannersActivo,
            orden: 4,
            settings: {
              modo: 'carrusel',
              autoplay: true,
              intervalo_segundos: 5,
              mostrar_flechas: true,
              mostrar_indicadores: true,
              pausar_hover: true,
              altura: 'adaptable',
            },
            content: heroSlides,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'store_id,section_type' }
        )
      } catch (secErr) {
        console.warn('Sincronización opcional con store_sections omitida:', secErr)
      }

      setMsg({ type: 'success', text: '¡Banners y carrusel promocional guardados con éxito!' })
      router.refresh()
      setTimeout(() => setMsg(null), 4000)
    } catch (err: any) {
      console.error('Error al guardar banners:', err)
      setMsg({ type: 'error', text: err?.message || 'Error al guardar los banners.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 dark:border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-[var(--font-heading)]">
                Banners & Carrusel Promocional
              </h1>
              <p className="text-xs sm:text-sm opacity-70">
                Mostrá hasta 3 anuncios o novedades debajo del header con botones de acceso directo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/tienda${tenantQuery}`}
            target="_blank"
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-black/15 dark:border-white/15 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4 opacity-70" />
            <span>Ver mi tienda</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-40" />
          </Link>
        </div>
      </div>

      {/* Alertas */}
      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-200 ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* 1. Interruptor Maestro (Activar / Desactivar Banner Carrusel) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[var(--color-superficie)] border border-black/10 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                bannersActivo ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <h2 className="text-sm sm:text-base font-bold">
              Mostrar banner / carrusel debajo del header
            </h2>
          </div>
          <p className="text-xs opacity-70 max-w-xl leading-relaxed">
            Si está activado y tenés al menos una imagen cargada, se mostrará un carrusel rotativo
            con transiciones automáticas en la parte superior de tu catálogo.
          </p>
        </div>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={() => setBannersActivo(!bannersActivo)}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            bannersActivo ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
              bannersActivo ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 2. Lista de Slides (Máximo 3) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-[var(--font-heading)] flex items-center gap-2">
              <span>Imágenes del Carrusel</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-80">
                {slides.length} de 3 configuradas
              </span>
            </h2>
          </div>

          {slides.length < 3 && (
            <button
              type="button"
              onClick={handleAddSlide}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar Slide</span>
            </button>
          )}
        </div>

        {slides.length === 0 ? (
          <div className="p-8 sm:p-12 text-center rounded-3xl border border-dashed border-black/15 dark:border-white/15 bg-black/[0.01] dark:bg-white/[0.02] space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto opacity-70">
              <ImageIcon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold">No hay slides configurados</h3>
              <p className="text-xs opacity-60 max-w-sm mx-auto mt-1">
                Creá tu primer banner promocional para destacar lanzamientos, descuentos o productos clave en tu tienda.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddSlide}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--color-primario)] text-white text-xs font-bold hover:opacity-90 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear mi primer Slide</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {slides.map((slide, idx) => (
              <div
                key={idx}
                className={`p-5 sm:p-7 rounded-3xl border transition-all duration-200 space-y-5 ${
                  slide.activo
                    ? 'bg-[var(--color-superficie)] border-black/10 dark:border-white/10 shadow-xs'
                    : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/5 dark:border-white/5 opacity-75'
                }`}
              >
                {/* Cabecera del Slide */}
                <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-sm">
                      Slide #{idx + 1} {idx === 0 ? '(Principal)' : ''}
                    </span>
                    {!slide.activo && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400">
                        Inactivo
                      </span>
                    )}
                  </div>

                  {/* Acciones de Orden, Estado y Eliminar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveSlide(idx, 'up')}
                      title="Mover arriba"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === slides.length - 1}
                      onClick={() => handleMoveSlide(idx, 'down')}
                      title="Mover abajo"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateSlide(idx, 'activo', !slide.activo)}
                      title={slide.activo ? 'Desactivar este slide' : 'Activar este slide'}
                      className={`min-h-[36px] px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        slide.activo
                          ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                          : 'border-black/10 dark:border-white/10 opacity-60'
                      }`}
                    >
                      {slide.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span className="hidden sm:inline">{slide.activo ? 'Activo' : 'Pausado'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSlide(idx)}
                      title="Eliminar este slide"
                      className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-lg text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Contenido del Slide: Grid Imagen & Textos */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  {/* Columna Izquierda: Imagen y Upload (5 cols) */}
                  <div className="md:col-span-5 space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                      Imagen del Banner * (Recomendado 1920x600 o similar)
                    </label>

                    {/* Preview de la imagen */}
                    <div className="w-full aspect-[16/7] rounded-2xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 relative group flex items-center justify-center">
                      {slide.imagen_url ? (
                        <img
                          src={slide.imagen_url}
                          alt={`Banner ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 opacity-40 space-y-1">
                          <ImageIcon className="w-8 h-8 mx-auto" />
                          <span className="text-xs block">Sin imagen seleccionada</span>
                        </div>
                      )}

                      {uploadingIndex === idx && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Subiendo imagen...</span>
                        </div>
                      )}
                    </div>

                    {/* Input para subir archivo o pegar URL */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="min-h-[38px] flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer">
                          <UploadCloud className="w-4 h-4 text-amber-500" />
                          <span>Subir desde mi PC</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(idx, file)
                            }}
                          />
                        </label>
                      </div>

                      <input
                        type="url"
                        value={slide.imagen_url}
                        onChange={(e) => handleUpdateSlide(idx, 'imagen_url', e.target.value)}
                        placeholder="O pegá la URL directa de la imagen (https://...)"
                        className="w-full min-h-[38px] px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                      />
                    </div>
                  </div>

                  {/* Columna Derecha: Título, Subtítulo y Botón CTA (7 cols) */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                          Título o Mensaje Promocional (Opcional)
                        </label>
                        <input
                          type="text"
                          value={slide.titulo}
                          onChange={(e) => handleUpdateSlide(idx, 'titulo', e.target.value)}
                          placeholder="Ej: Nueva Colección 2026 / 3 Cuotas sin interés"
                          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                        />
                      </div>

                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                          Subtítulo o Aclaración (Opcional)
                        </label>
                        <input
                          type="text"
                          value={slide.subtitulo}
                          onChange={(e) => handleUpdateSlide(idx, 'subtitulo', e.target.value)}
                          placeholder="Ej: Piezas exclusivas impresas en alta precisión"
                          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                        />
                      </div>
                    </div>

                    {/* Configuración del Botón CTA */}
                    <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={slide.has_cta}
                            onChange={(e) => handleUpdateSlide(idx, 'has_cta', e.target.checked)}
                            className="w-4 h-4 rounded text-[var(--color-primario)] focus:ring-[var(--color-primario)]"
                          />
                          <span>Incluir botón de llamada a la acción (CTA)</span>
                        </label>
                      </div>

                      {slide.has_cta && (
                        <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                              Texto del Botón
                            </label>
                            <input
                              type="text"
                              value={slide.cta_texto}
                              onChange={(e) => handleUpdateSlide(idx, 'cta_texto', e.target.value)}
                              placeholder="Ej: Ver Producto, Ver Ofertas, Comprar Ahora"
                              className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                            />
                          </div>

                          {/* Tipo de Destino del Botón */}
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider opacity-70 block">
                              ¿A dónde debe dirigir el botón?
                            </label>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateSlide(idx, 'cta_destino_tipo', 'producto')
                                  if (products.length > 0) {
                                    handleUpdateSlide(idx, 'cta_destino_valor', products[0].slug)
                                  }
                                }}
                                className={`min-h-[38px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  slide.cta_destino_tipo === 'producto'
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                    : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                                }`}
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span className="truncate">Un Producto</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateSlide(idx, 'cta_destino_tipo', 'categoria')
                                  if (categories.length > 0) {
                                    handleUpdateSlide(idx, 'cta_destino_valor', categories[0].id)
                                  }
                                }}
                                className={`min-h-[38px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  slide.cta_destino_tipo === 'categoria'
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                    : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                                }`}
                              >
                                <FolderTree className="w-3.5 h-3.5" />
                                <span className="truncate">Una Categoría</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  handleUpdateSlide(idx, 'cta_destino_tipo', 'custom')
                                }}
                                className={`min-h-[38px] px-2 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                  slide.cta_destino_tipo === 'custom'
                                    ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                    : 'border-black/10 dark:border-white/10 opacity-70 hover:opacity-100'
                                }`}
                              >
                                <Link2 className="w-3.5 h-3.5" />
                                <span className="truncate">Enlace Libre</span>
                              </button>
                            </div>

                            {/* Selector según el tipo */}
                            {slide.cta_destino_tipo === 'producto' && (
                              <div className="pt-1">
                                {products.length > 0 ? (
                                  <div className="relative">
                                    <select
                                      value={slide.cta_destino_valor}
                                      onChange={(e) => handleUpdateSlide(idx, 'cta_destino_valor', e.target.value)}
                                      className="w-full min-h-[42px] appearance-none pl-3.5 pr-10 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
                                    >
                                      {products.map((p) => (
                                        <option key={p.id} value={p.slug} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 py-1.5">
                                          {p.nombre} {p.visible ? '' : '(Oculto)'}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                ) : (
                                  <p className="text-xs opacity-60 italic">
                                    No hay productos cargados todavía en tu catálogo.
                                  </p>
                                )}
                              </div>
                            )}

                            {slide.cta_destino_tipo === 'categoria' && (
                              <div className="pt-1">
                                {categories.length > 0 ? (
                                  <div className="relative">
                                    <select
                                      value={slide.cta_destino_valor}
                                      onChange={(e) => handleUpdateSlide(idx, 'cta_destino_valor', e.target.value)}
                                      className="w-full min-h-[42px] appearance-none pl-3.5 pr-10 py-2.5 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-zinc-900 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all cursor-pointer"
                                    >
                                      {categories.map((c) => (
                                        <option key={c.id} value={c.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 py-1.5">
                                          {c.nombre}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                ) : (
                                  <p className="text-xs opacity-60 italic">
                                    No hay categorías cargadas todavía.
                                  </p>
                                )}
                              </div>
                            )}

                            {slide.cta_destino_tipo === 'custom' && (
                              <div className="pt-1">
                                <input
                                  type="text"
                                  value={slide.cta_destino_valor}
                                  onChange={(e) => handleUpdateSlide(idx, 'cta_destino_valor', e.target.value)}
                                  placeholder="Ej: /tienda/sobre-nosotros o https://..."
                                  className="w-full min-h-[40px] px-3.5 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-[var(--color-fondo)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primario)]"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón Guardar Cambios Fijo / Destacado */}
      <div className="pt-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <p className="text-xs opacity-60">
          Los cambios se reflejarán de inmediato en tu tienda pública.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {msg && (
            <div
              className={`p-3 px-4 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-in fade-in ${
                msg.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400'
              }`}
            >
              {msg.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              )}
              <span>{msg.text}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving}
            className="min-h-[48px] w-full sm:w-auto px-8 py-3 rounded-2xl bg-[var(--color-primario)] text-white text-sm font-bold hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 shrink-0"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando banners...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Guardar Banners</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notificación Toast Flotante */}
      {msg && msg.type === 'success' && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1F2937] text-white text-sm font-medium shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{msg.text}</span>
        </div>
      )}
    </div>
  )
}
