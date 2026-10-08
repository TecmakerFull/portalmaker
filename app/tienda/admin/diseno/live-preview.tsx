'use client';

// =============================================================================
// LIVE PREVIEW — Simulador en Tiempo Real de la Tienda
// Permite visualizar los cambios instantáneamente en Desktop, Tablet y Mobile
// con simulación de tema claro y oscuro.
// =============================================================================

import React, { useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import type { Store, StoreSection } from '@/types/database';
import type { ResolvedStoreSections } from '@/lib/store-sections';
import StorefrontHeaderFlow from '@/app/tienda/sections/storefront-header-flow';
import HeroBanners from '@/app/tienda/sections/hero-banners';

interface LivePreviewProps {
  store: Store;
  sections: StoreSection[];
}

export function LivePreview({ store, sections }: LivePreviewProps) {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');

  // Construir objeto ResolvedStoreSections para el simulador
  const sectionsMap = new Map<string, StoreSection>();
  sections.forEach((s) => sectionsMap.set(s.section_type, s));

  const topBarSec = sectionsMap.get('top_bar') || {
    id: 'preview-top-bar',
    store_id: store.id,
    section_type: 'top_bar',
    enabled: false,
    orden: 1,
    settings: {
      modo: 'rotativo',
      intervalo_segundos: 4,
      velocidad_ticker: 25,
      pausar_hover: true,
      fondo_color: 'primario',
      mostrar_en_mobile: true,
    },
    content: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const headerSec = sectionsMap.get('header') || {
    id: 'preview-header',
    store_id: store.id,
    section_type: 'header',
    enabled: true,
    orden: 2,
    settings: {
      mostrar_buscador: true,
      mostrar_carrito: true,
      mostrar_whatsapp: true,
      mostrar_tema_toggle: true,
      logo_posicion: 'centro',
      sticky: false,
    },
    content: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const navbarSec = sectionsMap.get('navbar') || {
    id: 'preview-navbar',
    store_id: store.id,
    section_type: 'navbar',
    enabled: true,
    orden: 3,
    settings: {
      alineacion: 'centro',
      estilo: 'linea',
      sticky: false,
    },
    content: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const heroSec = (sectionsMap.get('hero') || {
    id: 'preview-hero',
    store_id: store.id,
    section_type: 'hero',
    enabled: false,
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
    content: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }) as StoreSection<any, any>;

  const resolvedSections: ResolvedStoreSections = {
    top_bar: topBarSec as any,
    header: headerSec as any,
    navbar: navbarSec as any,
    hero: heroSec as any,
    sectionsList: sections,
  };

  return (
    <div className="flex flex-col h-full bg-zinc-100/70 dark:bg-zinc-950/70 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-inner">
      {/* Barra de control del simulador */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Vista Previa en Vivo
          </span>
        </div>

        {/* Selector de Dispositivos */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            title="Vista de Computadora"
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'desktop'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice('tablet')}
            title="Vista Tablet"
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'tablet'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            title="Vista Móvil"
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              device === 'mobile'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
        </div>

        {/* Selector de Tema de la Preview */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPreviewTheme(previewTheme === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            title="Cambiar tema de la vista previa"
          >
            {previewTheme === 'light' ? (
              <Moon className="w-4 h-4 text-indigo-500" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </button>
        </div>
      </div>

      {/* Contenedor del marco simulado */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto flex items-start justify-center">
        <div
          className={`transition-all duration-300 mx-auto rounded-2xl shadow-xl overflow-hidden border border-zinc-300/80 dark:border-zinc-700/80 ${
            previewTheme === 'dark' ? 'dark bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
          } ${
            device === 'desktop'
              ? 'w-full max-w-5xl'
              : device === 'tablet'
              ? 'w-[768px]'
              : 'w-[375px]'
          }`}
        >
          {/* Barra superior de navegador simulada */}
          <div className="bg-zinc-200 dark:bg-zinc-800 px-4 py-2 border-b border-zinc-300 dark:border-zinc-700 flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            </div>
            <div className="flex-1 max-w-xs mx-auto text-center bg-white/70 dark:bg-zinc-900/70 rounded-md py-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {store.slug ? `${store.slug}.portalmaker.com.ar` : 'mi-tienda.portalmaker.com.ar'}
            </div>
          </div>

          {/* Renderizado de Secciones de la Tienda */}
          <div className="relative min-h-[420px]">
            {/* 1. Header Flow (Top Bar + Header + Navbar) */}
            <StorefrontHeaderFlow
              store={store}
              resolvedSections={resolvedSections}
              tenantQuery=""
            />

            {/* 2. Hero Banners */}
            {heroSec && heroSec.enabled && (
              <HeroBanners
                section={heroSec}
                tenantQuery=""
              />
            )}

            {/* 3. Simulación de contenido de catálogo */}
            <div className="p-6">
              <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50 dark:bg-zinc-900/50"
                  >
                    <div className="aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-2" />
                    <div className="h-3 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-1.5" />
                    <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
