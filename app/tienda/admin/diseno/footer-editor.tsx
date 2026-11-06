// =============================================================================
// PORTALMAKER — Editor: Pie de página (medios de pago)
//
// Antes el footer mostraba siempre "Transferencia, VISA, Mastercard, Efectivo".
// Ahora es opcional y cada tienda marca los que acepta. Mientras no toque nada,
// se usan los sugeridos según lo que tiene activo en Pagos (medios_pago = null).
// =============================================================================

'use client'

import type { Store, StoreSection, FooterSettings } from '@/types/database'
import { MEDIOS_PAGO_FOOTER, getAutoMediosPago } from '@/lib/trust-icons'
import { CreditCard, Sparkles, Check } from 'lucide-react'

interface FooterEditorProps {
  store: Store
  section: StoreSection<FooterSettings, []>
  onChange: (updated: StoreSection<FooterSettings, []>) => void
}

export default function FooterEditor({ store, section, onChange }: FooterEditorProps) {
  const settings = section.settings || { mostrar_medios_pago: true, medios_pago: null }
  const isAuto = !Array.isArray(settings.medios_pago)
  const selected = isAuto ? getAutoMediosPago(store) : (settings.medios_pago as string[])

  const setSettings = (patch: Partial<FooterSettings>) =>
    onChange({ ...section, settings: { ...settings, ...patch } })

  const toggleMedio = (id: string) => {
    const next = selected.includes(id) ? selected.filter((m) => m !== id) : [...selected, id]
    setSettings({ medios_pago: next })
  }

  return (
    <div className="space-y-6">
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-3xl p-5 sm:p-7 shadow-xs space-y-5 text-[var(--color-texto)]">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <span>Medios de pago en el pie de página</span>
          </h3>
          <p className="text-xs opacity-70 mt-1 leading-relaxed">
            Marcá solo los medios con los que realmente cobrás. Si no querés mostrarlos, desactivá la opción.
          </p>
        </div>

        <label className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer min-h-11">
          <span className="text-xs font-semibold">Mostrar medios de pago</span>
          <input
            type="checkbox"
            checked={settings.mostrar_medios_pago}
            onChange={(e) => setSettings({ mostrar_medios_pago: e.target.checked })}
            className="w-5 h-5 accent-[#FACC15] cursor-pointer shrink-0"
          />
        </label>

        {settings.mostrar_medios_pago && (
          <div className="space-y-3">
            {isAuto && (
              <p className="flex items-start gap-2 text-xs p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Por ahora están marcados automáticamente según lo que tenés activo en Pagos. Si cambiás algo, queda tu elección.</span>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MEDIOS_PAGO_FOOTER.map((medio) => {
                const checked = selected.includes(medio.id)
                return (
                  <button
                    key={medio.id}
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleMedio(medio.id)}
                    className={`min-h-11 px-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                      checked
                        ? 'border-amber-400 bg-amber-400/10'
                        : 'border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        checked ? 'bg-[#FACC15] border-[#FACC15] text-[#1F2937]' : 'border-[var(--color-borde)]'
                      }`}
                    >
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span>{medio.label}</span>
                  </button>
                )
              })}
            </div>

            {!isAuto && (
              <button
                type="button"
                onClick={() => setSettings({ medios_pago: null })}
                className="min-h-11 px-1 text-xs font-semibold opacity-75 hover:opacity-100 underline cursor-pointer"
              >
                Volver a la selección automática
              </button>
            )}

            {selected.length === 0 && (
              <p className="text-xs opacity-70">No marcaste ningún medio: la columna no se mostrará.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
