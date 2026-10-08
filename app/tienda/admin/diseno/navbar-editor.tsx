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
  Sliders
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
      <div className="flex items-start gap-3 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Organiza la barra de navegación para que tus clientes descubran rápidamente categorías clave, productos destacados, páginas informativas o links a medida.
        </p>
      </div>

      {/* 1. Apariencia y Alineación */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Estilo y Alineación de la Barra
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Alineación */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Alineación de los Enlaces
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'centro', label: 'Centro' },
                { key: 'izquierda', label: 'Izquierda' },
                { key: 'espaciado', label: 'Distribuido' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => updateSettings('alineacion', opt.key as any)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium transition-all ${
                    settings.alineacion === opt.key
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estilo visual */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Estilo Visual de Pestañas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateSettings('estilo', 'linea')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.estilo === 'linea'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Subrayado sutil
              </button>
              <button
                type="button"
                onClick={() => updateSettings('estilo', 'pills')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  settings.estilo === 'pills'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                Pastillas (Pills)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Lista de Enlaces */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Enlaces de Navegación ({items.length})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Crea links directos a secciones clave de tu tienda
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar enlace
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <Layers className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
                  className={`border rounded-xl transition-all ${
                    isExpanded
                      ? 'border-blue-500/50 bg-zinc-50/50 dark:bg-zinc-800/30 ring-1 ring-blue-500/20'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                  }`}
                >
                  {/* Fila colapsada / Encabezado del ítem */}
                  <div className="flex items-center justify-between p-3 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex items-center gap-0.5 text-zinc-400">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveItem(index, 'up')}
                          className="p-1 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-30"
                        >
                          <MoveUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === items.length - 1}
                          onClick={() => handleMoveItem(index, 'down')}
                          className="p-1 hover:text-zinc-600 dark:hover:text-zinc-200 disabled:opacity-30"
                        >
                          <MoveDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEditingItemId(isExpanded ? null : item.id)}
                        className="text-left font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate hover:text-blue-600 transition-colors flex items-center gap-2"
                      >
                        <span>{item.texto || '(Sin texto)'}</span>
                        {item.destacado && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-medium">
                            Destacado
                          </span>
                        )}
                        {item.badge_texto && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 font-medium">
                            Badge: {item.badge_texto}
                          </span>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.activo}
                          onChange={(e) => handleUpdateItem(item.id, { activo: e.target.checked })}
                          className="w-3.5 h-3.5 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
                        />
                        <span className="hidden sm:inline">Activo</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setEditingItemId(isExpanded ? null : item.id)}
                        className="p-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {isExpanded ? 'Cerrar' : 'Editar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Formulario de edición expandido */}
                  {isExpanded && (
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Texto del enlace */}
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Texto visible
                          </label>
                          <input
                            type="text"
                            value={item.texto}
                            onChange={(e) => handleUpdateItem(item.id, { texto: e.target.value })}
                            placeholder="Ej: Ofertas, Impresoras 3D, Contacto"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          />
                        </div>

                        {/* Tipo de destino */}
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Tipo de destino
                          </label>
                          <select
                            value={item.tipo_destino}
                            onChange={(e) => handleUpdateItem(item.id, { tipo_destino: e.target.value as any })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          >
                            <option value="catalogo">Catálogo completo</option>
                            <option value="categoria">Categoría de productos</option>
                            <option value="producto">Producto específico</option>
                            <option value="pagina">Página informativa</option>
                            <option value="custom">URL personalizada / Externa</option>
                          </select>
                        </div>
                      </div>

                      {/* Selector específico según el tipo de destino */}
                      {item.tipo_destino === 'categoria' && (
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Seleccionar Categoría
                          </label>
                          <select
                            value={item.destino_valor || ''}
                            onChange={(e) => handleUpdateItem(item.id, { destino_valor: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          >
                            <option value="">-- Elige una categoría --</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {item.tipo_destino === 'producto' && (
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Seleccionar Producto
                          </label>
                          <select
                            value={item.destino_valor || ''}
                            onChange={(e) => handleUpdateItem(item.id, { destino_valor: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          >
                            <option value="">-- Elige un producto --</option>
                            {products.map((prod) => (
                              <option key={prod.id} value={prod.slug}>
                                {prod.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {item.tipo_destino === 'pagina' && (
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Seleccionar Página
                          </label>
                          <select
                            value={item.destino_valor || ''}
                            onChange={(e) => handleUpdateItem(item.id, { destino_valor: e.target.value })}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          >
                            <option value="">-- Elige una página --</option>
                            {pages.map((pg) => (
                              <option key={pg.id} value={pg.slug}>
                                {pg.titulo}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {item.tipo_destino === 'custom' && (
                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            URL personalizada
                          </label>
                          <input
                            type="text"
                            value={item.destino_url}
                            onChange={(e) => handleUpdateItem(item.id, { destino_url: e.target.value })}
                            placeholder="https://... o /ruta"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          />
                        </div>
                      )}

                      {/* Destacados y Badge */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!item.destacado}
                            onChange={(e) => handleUpdateItem(item.id, { destacado: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-blue-500"
                          />
                          <div>
                            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block">
                              Resaltar enlace
                            </span>
                            <span className="text-[11px] text-zinc-500">
                              Aplica color de acento y tipografía destacada
                            </span>
                          </div>
                        </label>

                        <div>
                          <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Badge o etiqueta (opcional)
                          </label>
                          <input
                            type="text"
                            value={item.badge_texto || ''}
                            onChange={(e) => handleUpdateItem(item.id, { badge_texto: e.target.value })}
                            placeholder="Ej: HOT, Nuevo, -20%"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
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
