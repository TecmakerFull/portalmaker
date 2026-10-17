// =============================================================================
// PORTALMAKER — Editor de Sección: Top Bar / Utility Bar
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import type { StoreSection, TopBarSettings, TopBarMessageItem } from '@/types/database'
import { AVAILABLE_SECTION_ICONS } from '@/app/tienda/sections/section-icon'
import SectionIcon from '@/app/tienda/sections/section-icon'
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Sparkles,
  Link as LinkIcon,
  Layers,
} from 'lucide-react'

interface TopBarEditorProps {
  section: StoreSection<TopBarSettings, TopBarMessageItem[]>
  onChange: (updated: StoreSection<TopBarSettings, TopBarMessageItem[]>) => void
}

export default function TopBarEditor({ section, onChange }: TopBarEditorProps) {
  const settings = section.settings || {
    modo: 'rotativo',
    intervalo_segundos: 4,
    velocidad_ticker: 25,
    pausar_hover: true,
    fondo_color: 'primario',
    mostrar_en_mobile: true,
  }

  const items = section.content || []

  // Actualizar settings
  const handleSettingChange = (field: keyof TopBarSettings, value: any) => {
    onChange({
      ...section,
      settings: {
        ...settings,
        [field]: value,
      },
    })
  }

  // Agregar nuevo mensaje
  const handleAddMessage = () => {
    const newItem: TopBarMessageItem = {
      id: `msg-${Date.now()}`,
      texto: 'Nuevo aviso promocional',
      icono: 'Truck',
      link_url: '',
      activo: true,
      orden: items.length + 1,
    }
    onChange({
      ...section,
      content: [...items, newItem],
    })
  }

  // Actualizar mensaje
  const handleUpdateMessage = (index: number, field: keyof TopBarMessageItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange({
      ...section,
      content: updated,
    })
  }

  // Eliminar mensaje
  const handleDeleteMessage = (index: number) => {
    const updated = items.filter((_, i) => i !== index).map((it, idx) => ({ ...it, orden: idx + 1 }))
    onChange({
      ...section,
      content: updated,
    })
  }

  // Mover mensaje arriba/abajo
  const handleMoveMessage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const updated = [...items]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp

    onChange({
      ...section,
      content: updated.map((it, idx) => ({ ...it, orden: idx + 1 })),
    })
  }

  const iconOptions = Object.keys(AVAILABLE_SECTION_ICONS)

  return (
    <div className="space-y-6">
      {/* Configuración Visual de la Barra */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 text-[var(--color-texto)]">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Layers className="w-4 h-4 text-amber-500" />
          <span>Comportamiento y Estilos de la Top Bar</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          {/* Modo */}
          <div className="space-y-1.5">
            <label className="font-semibold opacity-75 block">Modo de visualización</label>
            <div className="relative">
              <select
                value={settings.modo}
                onChange={(e) => handleSettingChange('modo', e.target.value)}
                className="w-full appearance-none pl-3 pr-9 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all cursor-pointer"
              >
                <option value="rotativo">Rotativo (Pasa de mensaje en mensaje)</option>
                <option value="ticker">Ticker / Marquee (Desplazamiento continuo)</option>
                <option value="estatico">Estático (Mensajes fijos)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Color de Fondo */}
          <div className="space-y-1.5">
            <label className="font-semibold opacity-75 block">Color de fondo</label>
            <div className="relative">
              <select
                value={settings.fondo_color}
                onChange={(e) => handleSettingChange('fondo_color', e.target.value)}
                className="w-full appearance-none pl-3 pr-9 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all cursor-pointer"
              >
                <option value="primario">Color Primario de la Tienda</option>
                <option value="superficie">Superficie Sutil (Gris claro / Oscuro)</option>
                <option value="contraste">Alto Contraste (Negro / Blanco)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Intervalo / Velocidad */}
          {settings.modo === 'rotativo' ? (
            <div className="space-y-1.5">
              <label className="font-semibold opacity-75 block">Intervalo entre mensajes</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={2}
                  max={15}
                  value={settings.intervalo_segundos}
                  onChange={(e) => handleSettingChange('intervalo_segundos', Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                />
                <span className="opacity-60 text-xs shrink-0">segundos</span>
              </div>
            </div>
          ) : settings.modo === 'ticker' ? (
            <div className="space-y-1.5">
              <label className="font-semibold opacity-75 block">Duración del ciclo ticker</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10}
                  max={60}
                  value={settings.velocidad_ticker}
                  onChange={(e) => handleSettingChange('velocidad_ticker', Number(e.target.value))}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                />
                <span className="opacity-60 text-xs shrink-0">segundos</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-[var(--color-borde)] text-xs">
          <label className="flex items-center gap-2 cursor-pointer font-medium opacity-80 hover:opacity-100">
            <input
              type="checkbox"
              checked={settings.pausar_hover}
              onChange={(e) => handleSettingChange('pausar_hover', e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-[var(--color-borde)]"
            />
            <span>Pausar movimiento al pasar el cursor (hover) o tocar</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer font-medium opacity-80 hover:opacity-100">
            <input
              type="checkbox"
              checked={settings.mostrar_en_mobile}
              onChange={(e) => handleSettingChange('mostrar_en_mobile', e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-[var(--color-borde)]"
            />
            <span>Mostrar también en teléfonos móviles</span>
          </label>
        </div>
      </div>

      {/* Lista de Mensajes */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-4 text-[var(--color-texto)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              Mensajes y Avisos ({items.length})
            </h3>
            <p className="text-xs opacity-70 mt-0.5">
              Avisos rotativos o marquesina superior
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddMessage}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FACC15] hover:bg-[#EAB308] text-[#1F2937] font-semibold text-xs rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Agregar Mensaje</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border-2 border-dashed border-[var(--color-borde)] text-xs opacity-70 bg-black/[0.01] dark:bg-white/[0.01]">
            No hay mensajes cargados en la Top Bar. Hacé clic en "Agregar Mensaje".
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className={`p-4 rounded-2xl border transition-all ${
                  item.activo
                    ? 'bg-black/[0.02] dark:bg-white/[0.02] border-[var(--color-borde)] shadow-xs'
                    : 'bg-black/[0.01] dark:bg-white/[0.01] border-[var(--color-borde)] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--color-borde)]">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-semibold">Mensaje #{idx + 1}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveMessage(idx, 'up')}
                      className="p-1 rounded-lg border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => handleMoveMessage(idx, 'down')}
                      className="p-1 rounded-lg border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateMessage(idx, 'activo', !item.activo)}
                      className={`p-1 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                        item.activo
                          ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                          : 'border-[var(--color-borde)] opacity-60'
                      }`}
                    >
                      {item.activo ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{item.activo ? 'Activo' : 'Pausado'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(idx)}
                      className="p-1.5 opacity-60 hover:opacity-100 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3">
                  {/* Icono */}
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-semibold opacity-70 block">
                      Icono SVG
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)] flex items-center justify-center shrink-0">
                        <SectionIcon name={item.icono} className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="relative flex-1">
                        <select
                          value={item.icono || ''}
                          onChange={(e) => handleUpdateMessage(idx, 'icono', e.target.value)}
                          className="w-full appearance-none pl-2.5 pr-8 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all cursor-pointer"
                        >
                          <option value="">Sin icono</option>
                          {iconOptions.map((icon) => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 opacity-60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Texto */}
                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[10px] font-semibold opacity-70 block">
                      Texto del Mensaje *
                    </label>
                    <input
                      type="text"
                      value={item.texto}
                      onChange={(e) => handleUpdateMessage(idx, 'texto', e.target.value)}
                      placeholder="Ej: Envíos a todo el país / 3 Cuotas sin interés"
                      className="w-full min-h-[38px] px-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                    />
                  </div>

                  {/* Link opcional */}
                  <div className="sm:col-span-4 space-y-1">
                    <label className="text-[10px] font-semibold opacity-70 block">
                      Enlace / URL (Opcional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={item.link_url || ''}
                        onChange={(e) => handleUpdateMessage(idx, 'link_url', e.target.value)}
                        placeholder="Ej: /tienda/contacto o https://..."
                        className="w-full min-h-[38px] pl-7 pr-3 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                      />
                      <LinkIcon className="w-3 h-3 opacity-40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
