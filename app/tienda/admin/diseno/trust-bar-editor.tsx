// =============================================================================
// PORTALMAKER — Editor: Mensajes de confianza
//
// Pedido de clientes: los mensajes debajo del banner ("Devoluciones sencillas",
// "Pago 100% seguro"...) eran fijos y algunas tiendas no los ofrecían. Acá cada
// tienda edita, oculta o borra cada mensaje. Pensado para dueños que no quieren
// leer mucho: textos cortos y controles grandes (44px en mobile).
// =============================================================================

'use client'

import type { StoreSection, TrustBarItem, TrustBarSettings } from '@/types/database'
import { TRUST_ICONS, MAX_TRUST_ITEMS, DEFAULT_TRUST_ITEMS, DEFAULT_TRUST_ITEMS_SERVICIOS, getTrustIcon } from '@/lib/trust-icons'
import { Plus, Trash2, Eye, EyeOff, ShieldCheck, RotateCcw } from 'lucide-react'
import StyledSelect from '@/components/styled-select'

interface TrustBarEditorProps {
  section: StoreSection<TrustBarSettings, TrustBarItem[]>
  onChange: (updated: StoreSection<TrustBarSettings, TrustBarItem[]>) => void
  /** En tiendas de servicios los mensajes de ejemplo hablan de turnos, no de envíos. */
  soloServicios?: boolean
}

export default function TrustBarEditor({ section, onChange, soloServicios = false }: TrustBarEditorProps) {
  const items = section.content || []
  const settings = section.settings || { mostrar_en_producto: true }

  const updateItems = (next: TrustBarItem[]) => onChange({ ...section, content: next })

  const updateItem = (index: number, patch: Partial<TrustBarItem>) => {
    const next = [...items]
    next[index] = { ...next[index], ...patch }
    updateItems(next)
  }

  const addItem = () => {
    if (items.length >= MAX_TRUST_ITEMS) return
    updateItems([
      ...items,
      { id: `trust-${Date.now()}`, icono: 'BadgeCheck', titulo: '', texto: '', activo: true },
    ])
  }

  const removeItem = (index: number) => updateItems(items.filter((_, i) => i !== index))

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 text-[var(--color-texto)]">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Mensajes de confianza</span>
          </h3>
          <p className="text-xs opacity-70 mt-1 leading-relaxed">
            Aparecen debajo del banner principal. Poné solo lo que tu tienda realmente ofrece. Podés ocultar o borrar los que no correspondan.
          </p>
        </div>

        {/* Repetir en la ficha de producto */}
        <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer min-h-11">
          <span className="text-xs">
            <span className="font-semibold block">Mostrarlos también en cada producto</span>
            <span className="opacity-70">Debajo del botón de compra.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.mostrar_en_producto}
            onChange={(e) => onChange({ ...section, settings: { ...settings, mostrar_en_producto: e.target.checked } })}
            className="w-5 h-5 accent-[#FACC15] cursor-pointer shrink-0"
          />
        </label>

        {/* Lista de mensajes */}
        <div className="space-y-3">
          {items.length === 0 && (
            <p className="text-xs opacity-70 p-4 rounded-2xl border border-dashed border-[var(--color-borde)] text-center">
              No hay mensajes. La franja no se mostrará en tu tienda.
            </p>
          )}

          {items.map((item, index) => {
            const Icon = getTrustIcon(item.icono)
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border border-[var(--color-borde)] space-y-3 ${item.activo ? '' : 'opacity-60'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-semibold">
                    <Icon className="w-4 h-4 text-amber-500" />
                    Mensaje {index + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateItem(index, { activo: !item.activo })}
                      className="min-h-11 px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      {item.activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{item.activo ? 'Visible' : 'Oculto'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      aria-label={`Borrar mensaje ${index + 1}`}
                      className="min-h-11 min-w-11 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 inline-flex items-center justify-center hover:bg-red-500/10 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-semibold opacity-75 block" htmlFor={`trust-icon-${item.id}`}>Ícono</label>
                    <StyledSelect
                      id={`trust-icon-${item.id}`}
                      value={item.icono}
                      onChange={(v) => updateItem(index, { icono: v })}
                      options={Object.entries(TRUST_ICONS).map(([clave, { label, icon: Icono }]) => ({ value: clave, label, icon: <Icono className="w-4 h-4 shrink-0 text-amber-500" /> }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-semibold opacity-75 block" htmlFor={`trust-title-${item.id}`}>Título</label>
                    <input
                      id={`trust-title-${item.id}`}
                      type="text"
                      maxLength={40}
                      value={item.titulo}
                      onChange={(e) => updateItem(index, { titulo: e.target.value })}
                      placeholder="Ej: Envíos a todo el país"
                      className="w-full min-h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label className="font-semibold opacity-75 block" htmlFor={`trust-text-${item.id}`}>Texto chico (opcional)</label>
                  <input
                    id={`trust-text-${item.id}`}
                    type="text"
                    maxLength={60}
                    value={item.texto || ''}
                    onChange={(e) => updateItem(index, { texto: e.target.value })}
                    placeholder="Ej: Tu pedido, donde estés"
                    className="w-full min-h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)]"
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={addItem}
            disabled={items.length >= MAX_TRUST_ITEMS}
            className="min-h-11 px-4 rounded-xl border border-[var(--color-borde)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{items.length >= MAX_TRUST_ITEMS ? `Máximo ${MAX_TRUST_ITEMS} mensajes` : 'Agregar mensaje'}</span>
          </button>
          <button
            type="button"
            onClick={() => updateItems((soloServicios ? DEFAULT_TRUST_ITEMS_SERVICIOS : DEFAULT_TRUST_ITEMS).map((it) => ({ ...it, id: `${it.id}-${Date.now()}` })))}
            className="min-h-11 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 opacity-75 hover:opacity-100 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Volver a los mensajes de ejemplo</span>
          </button>
        </div>
      </div>
    </div>
  )
}
