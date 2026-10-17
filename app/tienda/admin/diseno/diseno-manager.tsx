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
import { StickySaveBar } from '../components/sticky-save-bar';

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
    <div className="space-y-6 pb-24">
      {/* Encabezado Principal de la Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] shadow-xs text-[var(--color-texto)]">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold">
                Diseño & Estructura de Tienda
              </h1>
              <p className="text-xs opacity-70 mt-0.5">
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
            className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-borde)] text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            {showMobilePreview ? 'Ocultar Previsualización' : 'Ver Previsualización'}
          </button>
        </div>
      </div>

      {/* Alertas de Guardado */}
      {saveSuccess && (
        <div className="flex items-center gap-2.5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>¡Diseño guardado exitosamente! Los cambios ya están activos en tu tienda.</span>
        </div>
      )}

      {saveError && (
        <div className="flex items-center gap-2.5 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-xs text-red-800 dark:text-red-300 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Layout Principal: Editores a la Izquierda + Live Preview a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda (Editores y Organizador de Secciones) */}
        <div className={`space-y-6 ${showMobilePreview ? 'hidden lg:block' : 'block'} lg:col-span-7 xl:col-span-7`}>
          {activeEditorTab ? (
            /* Vista del Editor Específico */
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[var(--color-superficie)] p-4 rounded-2xl border border-[var(--color-borde)] text-[var(--color-texto)] shadow-xs">
                <button
                  type="button"
                  onClick={() => setActiveEditorTab(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold opacity-75 hover:opacity-100 hover:text-[#CA8A04] dark:hover:text-[#FACC15] transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a la lista de secciones
                </button>
                <span className="text-xs font-semibold">
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

              {/* Botón de Guardar y Feedback al pie del editor */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-[var(--color-borde)]">
                {saveSuccess && (
                  <div className="p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>¡Diseño guardado exitosamente!</span>
                  </div>
                )}
                {saveError && (
                  <div className="p-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span>{saveError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="min-h-[44px] px-6 py-2.5 bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 text-[#1F2937] text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#1F2937]" />
                      <span>Guardar Cambios de Diseño</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Lista y Ordenador de Secciones */
            <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 text-[var(--color-texto)]">
              <div>
                <h2 className="text-base font-semibold">
                  Estructura del Encabezado
                </h2>
                <p className="text-xs opacity-70 mt-0.5">
                  Organiza y activa las secciones visuales superiores de tu tienda
                </p>
              </div>

              <div className="space-y-3">
                {sections.map((section, index) => {
                  const meta = sectionMeta[section.section_type] || {
                    label: section.section_type,
                    desc: '',
                    icon: <Layers className="w-5 h-5 opacity-50" />,
                  };

                  return (
                    <div
                      key={section.section_type}
                      className={`p-4 rounded-2xl border transition-all ${
                        section.enabled
                          ? 'border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] shadow-xs'
                          : 'border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Reordenar */}
                          <div className="flex items-center gap-0.5 opacity-60">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveSection(index, 'up')}
                              className="p-1 hover:opacity-100 disabled:opacity-25 cursor-pointer"
                            >
                              <MoveUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === sections.length - 1}
                              onClick={() => handleMoveSection(index, 'down')}
                              className="p-1 hover:opacity-100 disabled:opacity-25 cursor-pointer"
                            >
                              <MoveDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Ícono de sección */}
                          <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 shrink-0">
                            {meta.icon}
                          </div>

                          {/* Textos */}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold truncate">
                                {meta.label}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  section.enabled
                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-black/5 dark:bg-white/10 opacity-60'
                                }`}
                              >
                                {section.enabled ? 'Activo' : 'Oculto'}
                              </span>
                            </div>
                            <p className="text-xs opacity-70 truncate mt-0.5">
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
                            <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FACC15]" />
                          </label>

                          <button
                            type="button"
                            onClick={() => setActiveEditorTab(section.section_type)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-[var(--color-borde)] rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          >
                            <span>Configurar</span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Botón de Guardar y Feedback al pie de la lista de secciones */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-[var(--color-borde)]">
                {saveSuccess && (
                  <div className="p-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>¡Estructura guardada exitosamente!</span>
                  </div>
                )}
                {saveError && (
                  <div className="p-3 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                    <span>{saveError}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="min-h-[44px] px-6 py-2.5 bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-50 text-[#1F2937] text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-[#1F2937]" />
                      <span>Guardar Estructura</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Columna Derecha (Live Preview Simulada) */}
        <div
          className={`${
            showMobilePreview ? 'block' : 'hidden lg:block'
          } lg:col-span-5 xl:col-span-5 sticky top-6`}
        >
          <div className="h-[calc(100vh-140px)] min-h-[600px]">
            <LivePreview store={store} sections={sections} />
          </div>
        </div>
      </div>

      {/* Barra de Guardado Flotante Estandarizada */}
      <StickySaveBar
        loading={saving}
        hasChanges={true}
        message={
          activeEditorTab
            ? `Editando: ${sectionMeta[activeEditorTab]?.label || activeEditorTab}`
            : 'Estructura y secciones de tienda'
        }
        saveText="Guardar Cambios de Diseño"
        savingText="Guardando diseño..."
        successMsg={saveSuccess ? '¡Diseño guardado exitosamente!' : null}
        errorMsg={saveError}
        onSave={handleSaveChanges}
      />
    </div>
  );
}
