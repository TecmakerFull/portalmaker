'use client';

// =============================================================================
// HEADER EDITOR — Editor del Header Principal
// Permite al dueño de la tienda configurar buscador, carrito, botón rápido de WhatsApp,
// toggle claro/oscuro, visibilidad de nombre/slogan, tamaño de slogan y comportamiento sticky.
// =============================================================================

import React from 'react';
import {
  Search,
  ShoppingCart,
  Phone,
  SunMoon,
  AlignLeft,
  AlignCenter,
  Pin,
  Info,
  Type,
  MessageSquare
} from 'lucide-react';
import type { HeaderSettings, StoreSection } from '@/types/database';

interface HeaderEditorProps {
  section: StoreSection<HeaderSettings, any>;
  onChange: (updated: StoreSection<HeaderSettings, any>) => void;
}

export function HeaderEditor({ section, onChange }: HeaderEditorProps) {
  const settings = section.settings || {
    mostrar_nombre: true,
    mostrar_slogan: true,
    tamano_slogan: 'mediano',
    mostrar_buscador: true,
    mostrar_carrito: true,
    mostrar_whatsapp_flotante: true,
    mostrar_tema_toggle: true,
    logo_posicion: 'centro',
    sticky: true,
  };

  const updateSetting = <K extends keyof HeaderSettings>(
    key: K,
    value: HeaderSettings[K]
  ) => {
    onChange({
      ...section,
      settings: {
        ...settings,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Banner Informativo */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <p>
          Configura los elementos que aparecen en la cabecera principal de tu tienda: alineación del logo, visibilidad de tu marca/slogan, accesos rápidos y barra de búsqueda.
        </p>
      </div>

      {/* 1. Posición del Logo */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 text-[var(--color-texto)]">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlignCenter className="w-4 h-4 text-amber-500" />
            <span>Alineación del Logo y Marca</span>
          </h3>
          <p className="text-xs opacity-70 mt-0.5">
            Elige si el logo de tu marca va centrado (estilo Tiendanube moderno) o a la izquierda (estilo e-commerce clásico).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateSetting('logo_posicion', 'centro')}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              settings.logo_posicion === 'centro'
                ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-xs'
                : 'border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${settings.logo_posicion === 'centro' ? 'bg-[#FACC15] text-[#1F2937]' : 'bg-black/5 dark:bg-white/10 text-[var(--color-texto)]'}`}>
              <AlignCenter className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold block">Centrado</span>
              <span className="text-xs opacity-70">Buscador y acciones a los lados</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('logo_posicion', 'izquierda')}
            className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              settings.logo_posicion === 'izquierda'
                ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-xs'
                : 'border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 opacity-80'
            }`}
          >
            <div className={`p-2.5 rounded-xl ${settings.logo_posicion === 'izquierda' ? 'bg-[#FACC15] text-[#1F2937]' : 'bg-black/5 dark:bg-white/10 text-[var(--color-texto)]'}`}>
              <AlignLeft className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold block">A la izquierda</span>
              <span className="text-xs opacity-70">Buscador centralizado</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Identidad de Marca: Nombre y Slogan */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 text-[var(--color-texto)]">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Type className="w-4 h-4 text-amber-500" />
            <span>Identidad de Marca: Nombre y Slogan</span>
          </h3>
          <p className="text-xs opacity-70 mt-0.5">
            Personaliza cómo se muestra el nombre escrito de tu tienda y el slogan debajo del logotipo.
          </p>
        </div>

        <div className="space-y-3">
          {/* Nombre de la tienda escrito */}
          <label className="flex items-start sm:items-center justify-between p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-[var(--color-texto)] shrink-0">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  Mostrar nombre escrito junto al logotipo
                </span>
                <span className="text-xs opacity-70 block mt-0.5">
                  Si tu logo ya incluye el nombre tipográfico, podés desactivarlo para que luzca más limpio. (Es la misma opción que en Colores & Logo).
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_nombre ?? true}
              onChange={(e) => updateSetting('mostrar_nombre', e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400 mt-1 sm:mt-0 shrink-0"
            />
          </label>

          {/* Slogan visible y tamaño */}
          <div className="p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] space-y-3">
            <label className="flex items-start sm:items-center justify-between cursor-pointer gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-[var(--color-texto)] shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-bold block">
                    Mostrar slogan o frase corta
                  </span>
                  <span className="text-xs opacity-70 block mt-0.5">
                    Muestra el texto secundario de tu marca bajo el nombre o logotipo.
                  </span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.mostrar_slogan ?? true}
                onChange={(e) => updateSetting('mostrar_slogan', e.target.checked)}
                className="w-4 h-4 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400 mt-1 sm:mt-0 shrink-0"
              />
            </label>

            {/* Selector de tamaño de fuente del slogan */}
            {(settings.mostrar_slogan ?? true) && (
              <div className="pt-3 border-t border-[var(--color-borde)] space-y-2">
                <label className="block text-xs font-semibold opacity-75">
                  Tamaño de fuente del slogan
                </label>
                <div className="inline-flex flex-wrap p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl border border-[var(--color-borde)] gap-1.5 w-full sm:w-auto">
                  {[
                    { key: 'chico', label: 'Chico (10px)' },
                    { key: 'mediano', label: 'Mediano (12px)' },
                    { key: 'grande', label: 'Grande (14px)' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => updateSetting('tamano_slogan', opt.key as any)}
                      className={`flex-1 sm:flex-none py-2 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all text-center cursor-pointer ${
                        (settings.tamano_slogan || 'mediano') === opt.key
                          ? 'bg-[var(--color-superficie)] text-[#CA8A04] dark:text-[#FACC15] shadow-xs border border-[var(--color-borde)]'
                          : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Elementos y accesos rápidos */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 text-[var(--color-texto)]">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-500" />
            <span>Elementos y accesos rápidos</span>
          </h3>
          <p className="text-xs opacity-70 mt-0.5">
            Activa o desactiva qué botones y herramientas tendrán visibles tus clientes en la cabecera.
          </p>
        </div>

        <div className="space-y-3">
          {/* Buscador */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-[var(--color-texto)]">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  Buscador de productos
                </span>
                <span className="text-xs opacity-70 block mt-0.5">
                  Barra o botón para buscar por nombre, categoría o descripción
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_buscador}
              onChange={(e) => updateSetting('mostrar_buscador', e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400 shrink-0"
            />
          </label>

          {/* Carrito */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-[var(--color-texto)]">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  Carrito de compras
                </span>
                <span className="text-xs opacity-70 block mt-0.5">
                  Botón con contador de productos agregados
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_carrito}
              onChange={(e) => updateSetting('mostrar_carrito', e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400 shrink-0"
            />
          </label>

          {/* Botón Flotante de WhatsApp */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  Botón flotante de WhatsApp
                </span>
                <span className="text-xs opacity-70 block mt-0.5">
                  Muestra el botón flotante constante en la esquina inferior derecha
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_whatsapp_flotante ?? true}
              onChange={(e) => updateSetting('mostrar_whatsapp_flotante', e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400 shrink-0"
            />
          </label>

          {/* Toggle Modo Oscuro / Claro */}
          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer transition-colors gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-black/5 dark:bg-white/10 text-[var(--color-texto)]">
                <SunMoon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs sm:text-sm font-bold block">
                  Selector de Modo Claro / Oscuro
                </span>
                <span className="text-xs opacity-70 block mt-0.5">
                  Permite a tus visitantes cambiar el tema visual de la tienda
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_tema_toggle}
              onChange={(e) => updateSetting('mostrar_tema_toggle', e.target.checked)}
              className="w-4 h-4 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400 shrink-0"
            />
          </label>
        </div>
      </div>

      {/* 4. Comportamiento Sticky */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs text-[var(--color-texto)]">
        <label className="flex items-center justify-between cursor-pointer gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-black/5 dark:bg-white/10 text-[var(--color-texto)]">
              <Pin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold block">
                Header Fijo al hacer Scroll (Sticky)
              </span>
              <span className="text-xs opacity-70 block mt-0.5">
                Mantiene el encabezado visible en la parte superior con efecto traslúcido mientras el visitante navega
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.sticky}
            onChange={(e) => updateSetting('sticky', e.target.checked)}
            className="w-4 h-4 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400 shrink-0"
          />
        </label>
      </div>
    </div>
  );
}
