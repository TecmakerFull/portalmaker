'use client';

// =============================================================================
// HEADER EDITOR — Editor del Header Principal
// Permite al dueño de la tienda configurar buscador, carrito, botón rápido de WhatsApp,
// toggle claro/oscuro, posición del logo y comportamiento sticky.
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
    mostrar_buscador: true,
    mostrar_carrito: true,
    mostrar_whatsapp_flotante: true,
    mostrar_tema_toggle: true,
    logo_posicion: 'centro',
    sticky: false,
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
      {/* Explicación / Banner informativo */}
      <div className="flex items-start gap-3 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Configura los elementos que aparecen en la cabecera principal de tu tienda: posición del logo, accesos rápidos y barra de búsqueda.
        </p>
      </div>

      {/* 1. Posición del Logo */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Alineación del Logo / Nombre
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Elige si el logo de tu marca va centrado (estilo Tiendanube moderno) o a la izquierda (estilo e-commerce clásico).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateSetting('logo_posicion', 'centro')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              settings.logo_posicion === 'centro'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className={`p-2 rounded-lg ${settings.logo_posicion === 'centro' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
              <AlignCenter className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-medium block">Centrado</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Buscador y acciones a los lados</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('logo_posicion', 'izquierda')}
            className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
              settings.logo_posicion === 'izquierda'
                ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <div className={`p-2 rounded-lg ${settings.logo_posicion === 'izquierda' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
              <AlignLeft className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-medium block">A la izquierda</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Buscador centralizado</span>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Elementos visibles en el Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Elementos y accesos rápidos
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Activa o desactiva qué botones y herramientas tendrán visibles tus clientes en la cabecera.
          </p>
        </div>

        <div className="space-y-3">
          {/* Nombre de la tienda en texto */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Nombre de la tienda en texto
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Muestra el nombre de tu marca junto o debajo del logo (activo por defecto)
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_nombre ?? true}
              onChange={(e) => updateSetting('mostrar_nombre', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
          </label>

          {/* Buscador */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Buscador de productos
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Barra o botón para buscar por nombre o descripción
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_buscador}
              onChange={(e) => updateSetting('mostrar_buscador', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
          </label>

          {/* Carrito */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Carrito de compras
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Botón con contador de productos agregados
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_carrito}
              onChange={(e) => updateSetting('mostrar_carrito', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
          </label>

          {/* Botón Flotante de WhatsApp */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Botón flotante de WhatsApp
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Muestra el botón flotante constante en la esquina inferior derecha
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_whatsapp_flotante ?? true}
              onChange={(e) => updateSetting('mostrar_whatsapp_flotante', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
          </label>

          {/* Toggle Modo Oscuro / Claro */}
          <label className="flex items-center justify-between p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <SunMoon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 block">
                  Selector de Modo Claro / Oscuro
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Permite a tus visitantes cambiar el tema visual de la tienda
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrar_tema_toggle}
              onChange={(e) => updateSetting('mostrar_tema_toggle', e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* 3. Comportamiento Sticky */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              <Pin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 block">
                Header Fijo al hacer Scroll (Sticky)
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Mantiene el encabezado visible en la parte superior mientras el visitante navega
              </span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.sticky}
            onChange={(e) => updateSetting('sticky', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
          />
        </label>
      </div>
    </div>
  );
}
