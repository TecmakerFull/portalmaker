'use client';

// =============================================================================
// HERO EDITOR — Editor del Banner Principal / Carrusel
// Administra slides con imagen Desktop y Mobile, títulos, textos adicionales,
// botones de llamada a la acción (CTA) con selector de destino y programación por fecha.
// =============================================================================

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Image as ImageIcon,
  Smartphone,
  Monitor,
  Calendar,
  Sparkles,
  Sliders,
  ExternalLink,
  Info,
  Clock
} from 'lucide-react';
import type {
  HeroBannerSettings,
  HeroBannerSlide,
  StoreSection,
  Category,
  Product,
  StorePage
} from '@/types/database';

interface HeroEditorProps {
  section: StoreSection<HeroBannerSettings, HeroBannerSlide[]>;
  categories: Category[];
  products: Product[];
  pages: StorePage[];
  onChange: (updated: StoreSection<HeroBannerSettings, HeroBannerSlide[]>) => void;
}

export function HeroEditor({
  section,
  categories,
  products,
  pages,
  onChange,
}: HeroEditorProps) {
  const settings = section.settings || {
    modo: 'carrusel',
    autoplay: true,
    intervalo_segundos: 5,
    mostrar_flechas: true,
    mostrar_indicadores: true,
    pausar_hover: true,
    altura: 'adaptable',
  };

  const slides = section.content || [];

  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);

  const updateSettings = <K extends keyof HeroBannerSettings>(
    key: K,
    value: HeroBannerSettings[K]
  ) => {
    onChange({
      ...section,
      settings: {
        ...settings,
        [key]: value,
      },
    });
  };

  const updateSlides = (newSlides: HeroBannerSlide[]) => {
    onChange({
      ...section,
      content: newSlides,
    });
  };

  const handleAddSlide = () => {
    const newSlide: HeroBannerSlide = {
      id: crypto.randomUUID(),
      imagen_desktop: '',
      imagen_mobile: '',
      titulo: 'Nuevo Banner Promocional',
      subtitulo: 'Añade una descripción impactante',
      texto_adicional: '',
      cta_texto: 'Ver productos',
      cta_url: '/tienda',
      cta_destino_tipo: 'catalogo' as any,
      cta_destino_valor: '',
      fecha_desde: null,
      fecha_hasta: null,
      activo: true,
      orden: slides.length + 1,
    };
    updateSlides([...slides, newSlide]);
    setEditingSlideId(newSlide.id);
  };

  const handleRemoveSlide = (id: string) => {
    updateSlides(slides.filter((slide) => slide.id !== id));
  };

  const handleUpdateSlide = (id: string, partial: Partial<HeroBannerSlide>) => {
    const updated = slides.map((slide) => {
      if (slide.id !== id) return slide;
      const merged = { ...slide, ...partial };

      // Si cambió el tipo de destino, calcular cta_url por defecto
      if (partial.cta_destino_tipo !== undefined) {
        if (partial.cta_destino_tipo === 'catalogo' as any) {
          merged.cta_url = '/tienda';
          merged.cta_destino_valor = '';
        } else if (partial.cta_destino_tipo === 'categoria') {
          const firstCat = categories[0]?.id || '';
          merged.cta_destino_valor = firstCat;
          merged.cta_url = firstCat ? `/tienda?categoria=${firstCat}` : '/tienda';
        } else if (partial.cta_destino_tipo === 'producto') {
          const firstProd = products[0]?.slug || '';
          merged.cta_destino_valor = firstProd;
          merged.cta_url = firstProd ? `/tienda/productos/${firstProd}` : '/tienda';
        } else if (partial.cta_destino_tipo === 'pagina') {
          const firstPage = pages[0]?.slug || '';
          merged.cta_destino_valor = firstPage;
          merged.cta_url = firstPage ? `/tienda/p/${firstPage}` : '/tienda';
        } else if (partial.cta_destino_tipo === 'custom') {
          merged.cta_url = merged.cta_url || 'https://';
        }
      }

      // Si cambió cta_destino_valor
      if (partial.cta_destino_valor !== undefined) {
        if (merged.cta_destino_tipo === 'categoria') {
          merged.cta_url = partial.cta_destino_valor
            ? `/tienda?categoria=${partial.cta_destino_valor}`
            : '/tienda';
        } else if (merged.cta_destino_tipo === 'producto') {
          merged.cta_url = partial.cta_destino_valor
            ? `/tienda/productos/${partial.cta_destino_valor}`
            : '/tienda';
        } else if (merged.cta_destino_tipo === 'pagina') {
          merged.cta_url = partial.cta_destino_valor
            ? `/tienda/p/${partial.cta_destino_valor}`
            : '/tienda';
        }
      }

      return merged;
    });
    updateSlides(updated);
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;
    updateSlides(newSlides);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Muestra tus principales promociones, lanzamientos y novedades en el banner central. Admite imágenes optimizadas separadas para celular y computadora.
        </p>
      </div>

      {/* 1. Configuración de Reproducción y Estilo */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Comportamiento del Banner
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Modo */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Modo de Visualización
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateSettings('modo', 'carrusel')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.modo === 'carrusel'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Carrusel de diapositivas
              </button>
              <button
                type="button"
                onClick={() => updateSettings('modo', 'banner_unico')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.modo === 'banner_unico'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Banner único estático
              </button>
            </div>
          </div>

          {/* Altura */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Altura en Pantalla
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'adaptable', label: 'Proporcional' },
                { key: 'compacta', label: 'Compacta' },
                { key: 'pantalla_completa', label: 'Grande' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => updateSettings('altura', opt.key as any)}
                  className={`py-2 px-2 rounded-xl border text-xs font-medium transition-all ${
                    settings.altura === opt.key
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Opciones de Carrusel */}
        {settings.modo === 'carrusel' && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoplay}
                onChange={(e) => updateSettings('autoplay', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
              />
              <span>Paso automático</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mostrar_flechas}
                onChange={(e) => updateSettings('mostrar_flechas', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
              />
              <span>Flechas laterales</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.mostrar_indicadores}
                onChange={(e) => updateSettings('mostrar_indicadores', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
              />
              <span>Puntos inferiores (dots)</span>
            </label>
          </div>
        )}
      </div>

      {/* 2. Diapositivas / Slides */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Diapositivas ({slides.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Administra las imágenes y mensajes de tus banners
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddSlide}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar banner
          </button>
        </div>

        {slides.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <ImageIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No tienes ningún banner creado. Haz clic en "Agregar banner" para cargar uno.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, index) => {
              const isExpanded = editingSlideId === slide.id;
              return (
                <div
                  key={slide.id}
                  className={`border rounded-xl transition-all ${
                    isExpanded
                      ? 'border-blue-500/50 bg-zinc-50/50 dark:bg-zinc-800/30 ring-1 ring-blue-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  {/* Fila colapsada */}
                  <div className="flex items-center justify-between p-3 gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-0.5 text-zinc-400">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveSlide(index, 'up')}
                          className="p-1 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-30"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === slides.length - 1}
                          onClick={() => handleMoveSlide(index, 'down')}
                          className="p-1 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-30"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Miniatura si existe */}
                      {slide.imagen_desktop ? (
                        <img
                          src={slide.imagen_desktop}
                          alt=""
                          className="w-12 h-8 rounded-lg object-cover bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-zinc-200 dark:border-zinc-700"
                        />
                      ) : (
                        <div className="w-12 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setEditingSlideId(isExpanded ? null : slide.id)}
                        className="text-left min-w-0"
                      >
                        <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate block">
                          {slide.titulo || '(Banner sin título)'}
                        </span>
                        <span className="text-xs text-zinc-500 truncate block">
                          {slide.cta_texto ? `Botón: "${slide.cta_texto}"` : 'Sin botón CTA'}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={slide.activo}
                          onChange={(e) => handleUpdateSlide(slide.id, { activo: e.target.checked })}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
                        />
                        <span className="hidden sm:inline">Activo</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setEditingSlideId(isExpanded ? null : slide.id)}
                        className="p-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {isExpanded ? 'Cerrar' : 'Editar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveSlide(slide.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Formulario de edición expandido */}
                  {isExpanded && (
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                      {/* Imágenes Desktop & Mobile */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                            <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                            URL Imagen Desktop (1920×600 o similar)
                          </label>
                          <input
                            type="text"
                            value={slide.imagen_desktop}
                            onChange={(e) => handleUpdateSlide(slide.id, { imagen_desktop: e.target.value })}
                            placeholder="https://... imagen para PC"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                            <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                            URL Imagen Mobile (opcional, vertical)
                          </label>
                          <input
                            type="text"
                            value={slide.imagen_mobile || ''}
                            onChange={(e) => handleUpdateSlide(slide.id, { imagen_mobile: e.target.value })}
                            placeholder="https://... optimizada para celulares"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          />
                        </div>
                      </div>

                      {/* Textos del Banner */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Título principal
                          </label>
                          <input
                            type="text"
                            value={slide.titulo || ''}
                            onChange={(e) => handleUpdateSlide(slide.id, { titulo: e.target.value })}
                            placeholder="Ej: Ofertas de Temporada"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Subtítulo / Bajada
                          </label>
                          <input
                            type="text"
                            value={slide.subtitulo || ''}
                            onChange={(e) => handleUpdateSlide(slide.id, { subtitulo: e.target.value })}
                            placeholder="Ej: Hasta 3 cuotas sin interés en filamentos"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          />
                        </div>
                      </div>

                      {/* Botón de Llamada a la Acción (CTA) */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                        <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          Botón de Acción (CTA)
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Texto del botón
                            </label>
                            <input
                              type="text"
                              value={slide.cta_texto || ''}
                              onChange={(e) => handleUpdateSlide(slide.id, { cta_texto: e.target.value })}
                              placeholder="Ej: Ver catálogo, Comprar"
                              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Destino del clic
                            </label>
                            <select
                              value={slide.cta_destino_tipo || 'catalogo'}
                              onChange={(e) => handleUpdateSlide(slide.id, { cta_destino_tipo: e.target.value as any })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                            >
                              <option value="catalogo">Catálogo general</option>
                              <option value="categoria">Categoría</option>
                              <option value="producto">Producto</option>
                              <option value="pagina">Página</option>
                              <option value="custom">URL personalizada</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                              Elemento destino
                            </label>
                            {slide.cta_destino_tipo === 'categoria' ? (
                              <select
                                value={slide.cta_destino_valor || ''}
                                onChange={(e) => handleUpdateSlide(slide.id, { cta_destino_valor: e.target.value })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                              >
                                <option value="">-- Elige categoría --</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                              </select>
                            ) : slide.cta_destino_tipo === 'producto' ? (
                              <select
                                value={slide.cta_destino_valor || ''}
                                onChange={(e) => handleUpdateSlide(slide.id, { cta_destino_valor: e.target.value })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                              >
                                <option value="">-- Elige producto --</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.slug}>{p.nombre}</option>
                                ))}
                              </select>
                            ) : slide.cta_destino_tipo === 'pagina' ? (
                              <select
                                value={slide.cta_destino_valor || ''}
                                onChange={(e) => handleUpdateSlide(slide.id, { cta_destino_valor: e.target.value })}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                              >
                                <option value="">-- Elige página --</option>
                                {pages.map((pg) => (
                                  <option key={pg.id} value={pg.slug}>{pg.titulo}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={slide.cta_url || ''}
                                onChange={(e) => handleUpdateSlide(slide.id, { cta_url: e.target.value })}
                                placeholder="URL de destino"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Programación de Vigencia (Fechas) */}
                      <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          Programación de Vigencia (Opcional)
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[11px] text-zinc-500 block mb-0.5">Mostrar a partir de:</span>
                            <input
                              type="datetime-local"
                              value={slide.fecha_desde ? slide.fecha_desde.slice(0, 16) : ''}
                              onChange={(e) => handleUpdateSlide(slide.id, { fecha_desde: e.target.value ? new Date(e.target.value).toISOString() : null })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                            />
                          </div>
                          <div>
                            <span className="text-[11px] text-zinc-500 block mb-0.5">Ocultar a partir de:</span>
                            <input
                              type="datetime-local"
                              value={slide.fecha_hasta ? slide.fecha_hasta.slice(0, 16) : ''}
                              onChange={(e) => handleUpdateSlide(slide.id, { fecha_hasta: e.target.value ? new Date(e.target.value).toISOString() : null })}
                              className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
