'use client';

// =============================================================================
// NAVBAR EDITOR — Editor del Menú de Navegación
// Administra enlaces a categorías, productos, páginas estáticas o URLs externas,
// con soporte para badges destacados ("HOT", "Ofertas"), alineación y estilos.
// =============================================================================

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Sparkles,
  Link as LinkIcon,
  Layers,
  LayoutGrid,
  FileText,
  Package,
  Globe,
  Info,
  Sliders,
  ChevronDown
} from 'lucide-react';
import type {
  NavbarSettings,
  NavbarItem,
  StoreSection,
  Category,
  Product,
  StorePage
} from '@/types/database';

interface NavbarEditorProps {
  section: StoreSection<NavbarSettings, NavbarItem[]>;
  categories: Category[];
  products: Product[];
  pages: StorePage[];
  onChange: (updated: StoreSection<NavbarSettings, NavbarItem[]>) => void;
}

export function NavbarEditor({
  section,
  categories,
  products,
  pages,
  onChange,
}: NavbarEditorProps) {
  const settings = section.settings || {
    alineacion: 'centro',
    estilo: 'linea',
    sticky: false,
  };

  const items = section.content || [];

  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const updateSettings = <K extends keyof NavbarSettings>(
    key: K,
    value: NavbarSettings[K]
  ) => {
    onChange({
      ...section,
      settings: {
        ...settings,
        [key]: value,
      },
    });
  };

  const updateItems = (newItems: NavbarItem[]) => {
    onChange({
      ...section,
      content: newItems,
    });
  };

  const handleAddItem = () => {
    const newItem: NavbarItem = {
      id: crypto.randomUUID(),
      texto: 'Nuevo enlace',
      tipo_destino: 'catalogo',
      destino_valor: '',
      destino_url: '/tienda',
      destacado: false,
      badge_texto: '',
      activo: true,
      orden: items.length + 1,
    };
    updateItems([...items, newItem]);
    setEditingItemId(newItem.id);
  };

  const handleRemoveItem = (id: string) => {
    updateItems(items.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, partial: Partial<NavbarItem>) => {
    const updated = items.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...partial };

      // Si cambió el tipo de destino, calcular destino_url por defecto
      if (partial.tipo_destino !== undefined) {
        if (partial.tipo_destino === 'catalogo') {
          merged.destino_url = '/tienda';
          merged.destino_valor = '';
        } else if (partial.tipo_destino === 'categoria') {
          const firstCat = categories[0]?.id || '';
          merged.destino_valor = firstCat;
          merged.destino_url = firstCat ? `/tienda?categoria=${firstCat}` : '/tienda';
        } else if (partial.tipo_destino === 'producto') {
          const firstProd = products[0]?.slug || '';
          merged.destino_valor = firstProd;
          merged.destino_url = firstProd ? `/tienda/productos/${firstProd}` : '/tienda';
        } else if (partial.tipo_destino === 'pagina') {
          const firstPage = pages[0]?.slug || '';
          merged.destino_valor = firstPage;
          merged.destino_url = firstPage ? `/tienda/p/${firstPage}` : '/tienda';
        } else if (partial.tipo_destino === 'custom') {
          merged.destino_url = merged.destino_url || 'https://';
        }
      }

      // Si cambió el destino_valor para categorías, productos o páginas
      if (partial.destino_valor !== undefined) {
        if (merged.tipo_destino === 'categoria') {
          merged.destino_url = partial.destino_valor
            ? `/tienda?categoria=${partial.destino_valor}`
            : '/tienda';
        } else if (merged.tipo_destino === 'producto') {
          merged.destino_url = partial.destino_valor
            ? `/tienda/productos/${partial.destino_valor}`
            : '/tienda';
        } else if (merged.tipo_destino === 'pagina') {
          merged.destino_url = partial.destino_valor
            ? `/tienda/p/${partial.destino_valor}`
            : '/tienda';
        }
      }

      return merged;
    });
    updateItems(updated);
  };

  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    updateItems(newItems);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <p>
          Organiza la barra de navegación para que tus clientes descubran rápidamente categorías clave, productos destacados, páginas informativas o links a medida.
        </p>
      </div>

      {/* 1. Apariencia y Alineación */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 text-[var(--color-texto)]">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold">
            Estilo y Alineación de la Barra
          </h3>
        </div>

        <div className="space-y-4">
          {/* Alineación */}
          <div>
            <label className="block text-xs font-semibold opacity-75 mb-2">
              Alineación de los Enlaces
            </label>
            <div className="inline-flex flex-wrap p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl border border-[var(--color-borde)] gap-1.5 w-full sm:w-auto">
              {[
                { key: 'centro', label: 'Centro' },
                { key: 'izquierda', label: 'Izquierda' },
                { key: 'espaciado', label: 'Distribuido (Justificado)' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => updateSettings('alineacion', opt.key as any)}
                  className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all text-center cursor-pointer ${
                    settings.alineacion === opt.key
                      ? 'bg-[var(--color-superficie)] text-[#CA8A04] dark:text-[#FACC15] shadow-xs border border-[var(--color-borde)]'
                      : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estilo visual */}
          <div>
            <label className="block text-xs font-semibold opacity-75 mb-2">
              Estilo Visual de Pestañas
            </label>
            <div className="inline-flex flex-wrap p-1 bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl border border-[var(--color-borde)] gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => updateSettings('estilo', 'linea')}
                className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all text-center cursor-pointer ${
                  settings.estilo === 'linea'
                    ? 'bg-[var(--color-superficie)] text-[#CA8A04] dark:text-[#FACC15] shadow-xs border border-[var(--color-borde)]'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Subrayado sutil
              </button>
              <button
                type="button"
                onClick={() => updateSettings('estilo', 'pills')}
                className={`flex-1 sm:flex-none py-2.5 px-4 rounded-xl text-xs font-semibold whitespace-nowrap transition-all text-center cursor-pointer ${
                  settings.estilo === 'pills'
                    ? 'bg-[var(--color-superficie)] text-[#CA8A04] dark:text-[#FACC15] shadow-xs border border-[var(--color-borde)]'
                    : 'opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                Pastillas (Pills)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Lista de Enlaces */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 text-[var(--color-texto)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              Enlaces de Navegación ({items.length})
            </h3>
            <p className="text-xs opacity-70 mt-0.5">
              Crea links directos a secciones clave de tu tienda
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FACC15] hover:bg-[#EAB308] text-[#1F2937] font-semibold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar enlace
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-[var(--color-borde)] rounded-2xl bg-black/[0.01] dark:bg-white/[0.01]">
            <Layers className="w-8 h-8 opacity-40 mx-auto mb-2 text-amber-500" />
            <p className="text-xs opacity-70">
              No hay enlaces agregados en el menú. Haz clic en "Agregar enlace" para comenzar.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => {
              const isExpanded = editingItemId === item.id;
              return (
                <div
                  key={item.id}
                  className={`border rounded-2xl transition-all ${
                    isExpanded
                      ? 'border-[#FACC15] bg-[#FACC15]/5 shadow-xs'
                      : 'border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02]'
                  }`}
                >
                  {/* Fila colapsada / Encabezado del ítem */}
                  <div className="flex items-center justify-between p-3.5 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center gap-0.5 opacity-60">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveItem(index, 'up')}
                          className="p-1 hover:opacity-100 disabled:opacity-30 cursor-pointer"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === items.length - 1}
                          onClick={() => handleMoveItem(index, 'down')}
                          className="p-1 hover:opacity-100 disabled:opacity-30 cursor-pointer"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingItemId(isExpanded ? null : item.id)}
                        className="text-left font-semibold text-sm truncate hover:text-[#CA8A04] dark:hover:text-[#FACC15] transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <span>{item.texto || '(Sin texto)'}</span>
                        {item.destacado && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold border border-amber-500/20">
                            Destacado
                          </span>
                        )}
                        {item.badge_texto && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 font-semibold border border-blue-500/20">
                            Badge: {item.badge_texto}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs opacity-75 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.activo}
                          onChange={(e) => handleUpdateItem(item.id, { activo: e.target.checked })}
                          className="w-3.5 h-3.5 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400"
                        />
                        <span className="hidden sm:inline">Activo</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setEditingItemId(isExpanded ? null : item.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        {isExpanded ? 'Cerrar' : 'Editar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 opacity-60 hover:opacity-100 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Formulario de edición expandido */}
                  {isExpanded && (
                    <div className="p-4 border-t border-[var(--color-borde)] space-y-4 bg-black/[0.01] dark:bg-white/[0.01]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Texto del enlace */}
                        <div>
                          <label className="block text-xs font-semibold opacity-75 mb-1.5">
                            Texto visible
                          </label>
                          <input
                            type="text"
                            value={item.texto}
                            onChange={(e) => handleUpdateItem(item.id, { texto: e.target.value })}
                            placeholder="Ej: Ofertas, Impresoras 3D, Contacto"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                          />
                        </div>

                        {/* Tipo de destino */}
                        <div>
                          <label className="block text-xs font-semibold opacity-75 mb-1.5">
                            Tipo de destino
                          </label>
                          <div className="relative">
                            <select
                              value={item.tipo_destino}
                              onChange={(e) => handleUpdateItem(item.id, { tipo_destino: e.target.value as any })}
                              className="w-full appearance-none pl-3 pr-9 py-2 text-xs rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all cursor-pointer font-medium"
                            >
                              <option value="catalogo">Catálogo completo</option>
                              <option value="categoria">Categoría de productos</option>
                              <option value="producto">Producto específico</option>
                              <option value="pagina">Página informativa</option>
                              <option value="custom">URL personalizada / Externa</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 opacity-60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      {/* Selector específico según el tipo de destino */}
                      {item.tipo_destino === 'categoria' && (
                        <div>
                          <label className="block text-xs font-semibold opacity-75 mb-1.5">
                            Seleccionar Categoría
                          </label>
                          <div className="relative">
                            <select
                              value={item.destino_valor || ''}
                              onChange={(e) => handleUpdateItem(item.id, { destino_valor: e.target.value })}
                              className="w-full appearance-none pl-3 pr-9 py-2 text-xs rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all cursor-pointer font-medium"
                            >
                              <option value="">-- Elige una categoría --</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.nombre}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 opacity-60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {item.tipo_destino === 'producto' && (
                        <div>
                          <label className="block text-xs font-semibold opacity-75 mb-1.5">
                            Seleccionar Producto
                          </label>
                          <div className="relative">
                            <select
                              value={item.destino_valor || ''}
                              onChange={(e) => handleUpdateItem(item.id, { destino_valor: e.target.value })}
                              className="w-full appearance-none pl-3 pr-9 py-2 text-xs rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all cursor-pointer font-medium"
                            >
                              <option value="">-- Elige un producto --</option>
                              {products.map((prod) => (
                                <option key={prod.id} value={prod.slug}>
                                  {prod.nombre}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 opacity-60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {item.tipo_destino === 'pagina' && (
                        <div>
                          <label className="block text-xs font-semibold opacity-75 mb-1.5">
                            Seleccionar Página
                          </label>
                          <div className="relative">
                            <select
                              value={item.destino_valor || ''}
                              onChange={(e) => handleUpdateItem(item.id, { destino_valor: e.target.value })}
                              className="w-full appearance-none pl-3 pr-9 py-2 text-xs rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all cursor-pointer font-medium"
                            >
                              <option value="">-- Elige una página --</option>
                              {pages.map((pg) => (
                                <option key={pg.id} value={pg.slug}>
                                  {pg.titulo}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 opacity-60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {item.tipo_destino === 'custom' && (
                        <div>
                          <label className="block text-xs font-semibold opacity-75 mb-1.5">
                            URL personalizada
                          </label>
                          <input
                            type="text"
                            value={item.destino_url}
                            onChange={(e) => handleUpdateItem(item.id, { destino_url: e.target.value })}
                            placeholder="https://... o /ruta"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                          />
                        </div>
                      )}

                      {/* Destacados y Badge */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--color-borde)]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!item.destacado}
                            onChange={(e) => handleUpdateItem(item.id, { destacado: e.target.checked })}
                            className="w-4 h-4 text-amber-500 rounded border-[var(--color-borde)] focus:ring-amber-400"
                          />
                          <div>
                            <span className="text-xs font-semibold block">
                              Resaltar enlace
                            </span>
                            <span className="text-[11px] opacity-70">
                              Aplica color de acento y tipografía destacada
                            </span>
                          </div>
                        </label>

                        <div>
                          <label className="block text-xs font-semibold opacity-75 mb-1.5">
                            Badge o etiqueta (opcional)
                          </label>
                          <input
                            type="text"
                            value={item.badge_texto || ''}
                            onChange={(e) => handleUpdateItem(item.id, { badge_texto: e.target.value })}
                            placeholder="Ej: HOT, Nuevo, -20%"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                          />
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
