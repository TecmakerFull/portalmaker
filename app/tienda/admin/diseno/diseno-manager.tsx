'use client';

// =============================================================================
// DISENO MANAGER — Gestor Maestro de Secciones del Storefront
// Administra el orden, activación y edición de Top Bar, Header, Navbar y Hero Banner,
// con simulación en tiempo real (Live Preview) y persistencia en Supabase.
// =============================================================================

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type {
  Store,
  StoreSection,
  Category,
  Product,
  StorePage,
  TopBarSettings,
  TopBarMessageItem,
  HeaderSettings,
  NavbarSettings,
  NavbarItem,
  HeroBannerSettings,
  HeroBannerSlide
} from '@/types/database';
import {
  Layers,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Sliders,
  Sparkles,
  MoveUp,
  MoveDown,
  ArrowLeft,
  ChevronRight,
  MessageSquare,
  Compass,
  Image as ImageIcon,
  LayoutTemplate
} from 'lucide-react';
import TopBarEditor from './top-bar-editor';
import { HeaderEditor } from './header-editor';
import { NavbarEditor } from './navbar-editor';
import { HeroEditor } from './hero-editor';
import { LivePreview } from './live-preview';

interface DisenoManagerProps {
  store: Store;
  initialSections: StoreSection[];
  categories: Category[];
  products: Product[];
  pages: StorePage[];
  tenantQuery: string;
}

export function DisenoManager({
  store,
  initialSections,
  categories,
  products,
  pages,
  tenantQuery,
}: DisenoManagerProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  // Secciones en estado local editable
  const [sections, setSections] = useState<StoreSection[]>(initialSections);
  const [activeEditorTab, setActiveEditorTab] = useState<string | null>(null);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Estados de guardado
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Actualizar una sección específica
  const handleUpdateSection = (updated: StoreSection) => {
    setSections((prev) =>
      prev.map((s) => (s.section_type === updated.section_type ? updated : s))
    );
    setSaveSuccess(false);
  };

  // Activar o desactivar sección
  const handleToggleEnabled = (sectionType: string, enabled: boolean) => {
    setSections((prev) =>
      prev.map((s) => (s.section_type === sectionType ? { ...s, enabled } : s))
    );
    setSaveSuccess(false);
  };

  // Reordenar secciones
  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Actualizar campo orden
    const reordered = newSections.map((s, idx) => ({ ...s, orden: idx + 1 }));
    setSections(reordered);
    setSaveSuccess(false);
  };

  // Guardar en Supabase
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const payload = {
          store_id: store.id,
          section_type: sec.section_type,
          enabled: sec.enabled,
          orden: i + 1,
          settings: sec.settings,
          content: sec.content,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('store_sections')
          .upsert(payload, { onConflict: 'store_id,section_type' });

        if (error) {
          console.error('Error guardando seccion:', sec.section_type, error);
          throw error;
        }
      }

      setSaveSuccess(true);
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error general guardando diseño:', err);
      setSaveError(err.message || 'Ocurrió un error al guardar los cambios de diseño');
    } finally {
      setSaving(false);
    }
  };

  // Meta información de cada tipo de sección
  const sectionMeta: Record<
    string,
    { label: string; desc: string; icon: React.ReactNode }
  > = {
    top_bar: {
      label: 'Top Bar / Barra Superior',
      desc: 'Anuncios, promociones, avisos de envío o contacto rotativos',
      icon: <MessageSquare className="w-5 h-5 text-blue-500" />,
    },
    header: {
      label: 'Header Principal',
      desc: 'Logo, buscador, carrito, botón WhatsApp y selector de tema',
      icon: <LayoutTemplate className="w-5 h-5 text-emerald-500" />,
    },
    navbar: {
      label: 'Menú de Navegación',
      desc: 'Categorías, páginas, productos y enlaces con badges',
      icon: <Compass className="w-5 h-5 text-purple-500" />,
    },
    hero: {
      label: 'Hero / Banners Principales',
      desc: 'Carrusel promocional con imágenes para Desktop y Mobile',
      icon: <ImageIcon className="w-5 h-5 text-amber-500" />,
    },
  };

  const currentSection = sections.find((s) => s.section_type === activeEditorTab);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal de la Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Diseño & Estructura de Tienda
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Personaliza la cabecera, barras y banners de tu tienda en vivo
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Botón para ver preview en mobile/tablet */}
          <button
            type="button"
            onClick={() => setShowMobilePreview(!showMobilePreview)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <Eye className="w-4 h-4" />
            {showMobilePreview ? 'Ocultar Previsualización' : 'Ver Previsualización'}
          </button>

          {/* Botón Guardar Cambios */}
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md hover:shadow transition-all"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Guardar Cambios</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alertas de Guardado */}
      {saveSuccess && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>¡Diseño guardado exitosamente! Los cambios ya están activos en tu tienda.</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2.5 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl text-xs text-red-800 dark:text-red-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Layout Principal: Editores a la Izquierda + Live Preview a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda (Editores y Organizador de Secciones) */}
        <div className={`space-y-6 ${showMobilePreview ? 'hidden lg:block' : 'block'} lg:col-span-6 xl:col-span-6`}>
          {activeEditorTab ? (
            /* Vista del Editor Específico */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a la lista de secciones
                </button>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {sectionMeta[activeEditorTab]?.label}
                </span>
              </div>

              {/* Render del editor seleccionado */}
              {activeEditorTab === 'top_bar' && currentSection && (
                <TopBarEditor
                  section={currentSection as StoreSection<TopBarSettings, TopBarMessageItem[]>}
                  onChange={handleUpdateSection}
                />
              )}

              {activeEditorTab === 'header' && currentSection && (
                <HeaderEditor
                  section={currentSection as StoreSection<HeaderSettings, any>}
                  onChange={handleUpdateSection}
                />
              )}

              {activeEditorTab === 'navbar' && currentSection && (
                <NavbarEditor
                  section={currentSection as StoreSection<NavbarSettings, NavbarItem[]>}
                  categories={categories}
                  products={products}
                  pages={pages}
                  onChange={handleUpdateSection}
                />
              )}

              {activeEditorTab === 'hero' && currentSection && (
                <HeroEditor
                  section={currentSection as StoreSection<HeroBannerSettings, HeroBannerSlide[]>}
                  categories={categories}
                  products={products}
                  pages={pages}
                  onChange={handleUpdateSection}
                />
              )}
            </div>
          ) : (
            /* Lista y Ordenador de Secciones */
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Estructura del Encabezado
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Organiza y activa las secciones visuales superiores de tu tienda
                </p>
              </div>

              <div className="space-y-3">
                {sections.map((section, index) => {
                  const meta = sectionMeta[section.section_type] || {
                    label: section.section_type,
                    desc: '',
                    icon: <Layers className="w-5 h-5 text-zinc-400" />,
                  };

                  return (
                    <div
                      key={section.section_type}
                      className={`p-4 rounded-xl border transition-all ${
                        section.enabled
                          ? 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 shadow-sm'
                          : 'border-zinc-200/70 dark:border-zinc-800/50 bg-zinc-50 dark:bg-zinc-900/30 opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Reordenar */}
                          <div className="flex items-center gap-0.5 text-zinc-400">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveSection(index, 'up')}
                              className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-25"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === sections.length - 1}
                              onClick={() => handleMoveSection(index, 'down')}
                              className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200 disabled:opacity-25"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Ícono de sección */}
                          <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 shrink-0">
                            {meta.icon}
                          </div>

                          {/* Textos */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                {meta.label}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  section.enabled
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                }`}
                              >
                                {section.enabled ? 'Activo' : 'Oculto'}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {meta.desc}
                            </p>
                          </div>
                        </div>

                        {/* Switch de activación + botón de editar */}
                        <div className="flex items-center gap-3 shrink-0">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={section.enabled}
                              onChange={(e) =>
                                handleToggleEnabled(section.section_type, e.target.checked)
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600" />
                          </label>

                          <button
                            type="button"
                            onClick={() => setActiveEditorTab(section.section_type)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          >
                            <span>Configurar</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha (Live Preview Simulada) */}
        <div
          className={`${
            showMobilePreview ? 'block' : 'hidden lg:block'
          } lg:col-span-6 xl:col-span-6 sticky top-6`}
        >
          <div className="h-[calc(100vh-140px)] min-h-[600px]">
            <LivePreview store={store} sections={sections} />
          </div>
        </div>
      </div>
    </div>
  );
}
