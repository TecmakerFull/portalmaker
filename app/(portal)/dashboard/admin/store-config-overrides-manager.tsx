'use client'

import { useState, useEffect } from 'react'
import {
  Layers,
  Percent,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Loader2,
  Calendar,
  History,
  Sliders,
  X,
  Clock,
} from 'lucide-react'

interface StoreConfigOverridesManagerProps {
  storeId: string
  storeNombre: string
  storePlan: string
  onPlanChanged?: (newPlan: string) => void
}

interface PlanDefaults {
  id: string
  nombre: string
  commission_pct: number
  max_active_products: number | null
  whatsapp_orders: boolean
  online_checkout: boolean
  mercadopago: boolean
  deposit_payments: boolean
  mp_surcharge: boolean
  bank_transfer: boolean
}

interface OverrideData {
  commission_pct: number | null
  max_active_products: number | null
  whatsapp_orders: boolean | null
  online_checkout: boolean | null
  mercadopago: boolean | null
  deposit_payments: boolean | null
  mp_surcharge: boolean | null
  bank_transfer: boolean | null
  override_until: string | null
}

interface EffectiveConfig {
  plan: string
  commission_pct: number
  max_active_products: number | null
  whatsapp_orders: boolean
  online_checkout: boolean
  mercadopago: boolean
  deposit_payments: boolean
  mp_surcharge: boolean
  bank_transfer: boolean
  crm: boolean
  is_customized?: {
    commission_pct: boolean
    max_active_products: boolean
    whatsapp_orders: boolean
    online_checkout: boolean
    mercadopago: boolean
    deposit_payments: boolean
    mp_surcharge: boolean
    bank_transfer: boolean
  }
}

interface AuditLogItem {
  id: string
  target_type: string
  target_id: string
  variable_name: string
  old_value: string | null
  new_value: string | null
  changed_by_email: string | null
  created_at: string
}

export default function StoreConfigOverridesManager({
  storeId,
  storeNombre,
  storePlan,
  onPlanChanged,
}: StoreConfigOverridesManagerProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [assignedPlan, setAssignedPlan] = useState<string>(storePlan || 'maker_pro')
  const [planDefaults, setPlanDefaults] = useState<PlanDefaults | null>(null)
  const [effective, setEffective] = useState<EffectiveConfig | null>(null)
  const [overrides, setOverrides] = useState<OverrideData>({
    commission_pct: null,
    max_active_products: null,
    whatsapp_orders: null,
    online_checkout: null,
    mercadopago: null,
    deposit_payments: null,
    mp_surcharge: null,
    bank_transfer: null,
    override_until: null,
  })
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])

  // Cargar configuración de la tienda
  const loadConfig = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/store-config/${storeId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar configuración')

      setAssignedPlan(data.store?.plan || 'maker_pro')
      setPlanDefaults(data.plan_defaults || null)
      setEffective(data.effective || null)
      setAuditLogs(data.audit_logs || [])

      if (data.override) {
        setOverrides({
          commission_pct: data.override.commission_pct ?? null,
          max_active_products: data.override.max_active_products ?? null,
          whatsapp_orders: data.override.whatsapp_orders ?? null,
          online_checkout: data.override.online_checkout ?? null,
          mercadopago: data.override.mercadopago ?? null,
          deposit_payments: data.override.deposit_payments ?? null,
          mp_surcharge: data.override.mp_surcharge ?? null,
          bank_transfer: data.override.bank_transfer ?? null,
          override_until: data.override.override_until ?? null,
        })
      } else {
        setOverrides({
          commission_pct: null,
          max_active_products: null,
          whatsapp_orders: null,
          online_checkout: null,
          mercadopago: null,
          deposit_payments: null,
          mp_surcharge: null,
          bank_transfer: null,
          override_until: null,
        })
      }
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [storeId])

  // Helper para resetear un override individual al valor del plan (poner null)
  const handleResetToPlan = (key: keyof OverrideData) => {
    setOverrides((prev) => ({
      ...prev,
      [key]: null,
    }))
  }

  // Guardar cambios
  const handleSave = async () => {
    // Validaciones
    if (overrides.commission_pct !== null) {
      const comm = Number(overrides.commission_pct)
      if (isNaN(comm) || comm < 0 || comm > 20) {
        setMessage({ text: 'La comisión personalizada debe estar entre 0% y 20%', type: 'error' })
        return
      }
    }

    if (overrides.max_active_products !== null) {
      const maxP = Number(overrides.max_active_products)
      if (isNaN(maxP) || maxP < 0) {
        setMessage({ text: 'El límite de productos debe ser mayor o igual a 0', type: 'error' })
        return
      }
    }

    try {
      setSaving(true)
      setMessage(null)
      const res = await fetch(`/api/admin/store-config/${storeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: assignedPlan,
          overrides: {
            commission_pct: overrides.commission_pct !== null ? Number(overrides.commission_pct) : null,
            max_active_products:
              overrides.max_active_products !== null ? Number(overrides.max_active_products) : null,
            whatsapp_orders: overrides.whatsapp_orders,
            online_checkout: overrides.online_checkout,
            mercadopago: overrides.mercadopago,
            deposit_payments: overrides.deposit_payments,
            mp_surcharge: overrides.mp_surcharge,
            bank_transfer: overrides.bank_transfer,
            override_until: overrides.override_until || null,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar configuración')

      setMessage({
        text: `Configuración guardada correctamente (${data.auditCount} cambio/s registrados en auditoría).`,
        type: 'success',
      })
      if (onPlanChanged && assignedPlan !== storePlan) {
        onPlanChanged(assignedPlan)
      }
      await loadConfig()
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#FF5500]" />
        <span className="text-xs opacity-70">Cargando configuración de la tienda...</span>
      </div>
    )
  }

  // Comprobar expiración del override
  const isExpired = overrides.override_until
    ? new Date(overrides.override_until).getTime() <= Date.now()
    : false

  return (
    <div className="space-y-6">
      {/* Selector de Plan Asignado */}
      <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-borde)]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#FF5500] block">
              Plan Base de la Cuenta
            </span>
            <h4 className="text-sm font-semibold mt-0.5">
              Define los valores por defecto que hereda la tienda
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={assignedPlan}
              onChange={(e) => setAssignedPlan(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <option value="free">Free</option>
              <option value="starter">Starter</option>
              <option value="maker_pro">Maker Pro</option>
              <option value="enterprise">Enterprise</option>
              <option value="bonificado">Bonificado</option>
            </select>
          </div>
        </div>

        {/* Vencimiento del override / Promociones temporales */}
        <div className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#FF5500]" />
              Vencimiento de Personalizaciones (Promoción / Override Until)
            </span>
            <p className="opacity-60 text-[11px]">
              Al vencer la fecha, las variables personalizadas vuelven automáticamente al valor del plan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={overrides.override_until ? overrides.override_until.split('T')[0] : ''}
              onChange={(e) => {
                const val = e.target.value
                setOverrides((prev) => ({
                  ...prev,
                  override_until: val ? new Date(val + 'T23:59:59Z').toISOString() : null,
                }))
              }}
              className="h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
            {overrides.override_until && (
              <button
                type="button"
                onClick={() => handleResetToPlan('override_until')}
                className="h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-semibold text-rose-600 dark:text-rose-400"
              >
                Sin Vencimiento
              </button>
            )}
            {isExpired && (
              <span className="px-2 py-1 rounded bg-rose-500/15 text-rose-700 dark:text-rose-300 text-[10px] font-bold uppercase">
                Vencido (Inactivo)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Feedback message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2.5 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Matriz de Variables: Efectivo vs Override */}
      <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-borde)]">
          <div>
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#FF5500]" />
              Variables Operativas y Overrides de Cuenta
            </h4>
            <p className="text-xs opacity-65 mt-0.5">
              Si un campo tiene valor personalizado, pisa al plan. Con "Volver al plan" hereda el default.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#FF5500] hover:bg-[#e04b00] text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Guardar Overrides</span>
          </button>
        </div>

        <div className="space-y-3">
          {/* 1. Comisión Portalmaker (%) */}
          <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Comisión Portalmaker por Venta</span>
                {overrides.commission_pct !== null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Personalizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-70">
                    Del plan ({planDefaults?.commission_pct ?? 2}%)
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60">
                Efectivo actual: <strong className="text-[#FF5500]">{effective?.commission_pct}%</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 md:w-1/2 justify-end">
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                placeholder={`Del plan (${planDefaults?.commission_pct ?? 2}%)`}
                value={overrides.commission_pct !== null ? overrides.commission_pct : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value)
                  setOverrides((prev) => ({ ...prev, commission_pct: val }))
                }}
                className="h-10 w-36 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
              {overrides.commission_pct !== null && (
                <button
                  type="button"
                  onClick={() => handleResetToPlan('commission_pct')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver al plan</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. Límite de Productos Activos */}
          <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Límite de Productos Activos</span>
                {overrides.max_active_products !== null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Personalizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-70">
                    Del plan ({planDefaults?.max_active_products ?? 'Ilimitado'})
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60">
                Efectivo: <strong>{effective?.max_active_products ?? 'Ilimitado'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 md:w-1/2 justify-end">
              <input
                type="number"
                min="0"
                placeholder={`Del plan (${planDefaults?.max_active_products ?? 'Ilim.'})`}
                value={overrides.max_active_products !== null ? overrides.max_active_products : ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                  setOverrides((prev) => ({ ...prev, max_active_products: val }))
                }}
                className="h-10 w-36 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
              {overrides.max_active_products !== null && (
                <button
                  type="button"
                  onClick={() => handleResetToPlan('max_active_products')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver al plan</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Pedidos por WhatsApp */}
          <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Pedidos por WhatsApp</span>
                {overrides.whatsapp_orders !== null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Personalizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-70">
                    Del plan ({planDefaults?.whatsapp_orders ? 'Sí' : 'No'})
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60">
                Efectivo: <strong>{effective?.whatsapp_orders ? 'Habilitado' : 'Deshabilitado'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 md:w-1/2 justify-end">
              <button
                type="button"
                onClick={() =>
                  setOverrides((prev) => ({
                    ...prev,
                    whatsapp_orders: prev.whatsapp_orders === null ? false : !prev.whatsapp_orders,
                  }))
                }
                className={`min-h-[40px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  (overrides.whatsapp_orders ?? planDefaults?.whatsapp_orders)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {(overrides.whatsapp_orders ?? planDefaults?.whatsapp_orders) ? 'Sí' : 'No'}
              </button>

              {overrides.whatsapp_orders !== null && (
                <button
                  type="button"
                  onClick={() => handleResetToPlan('whatsapp_orders')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver al plan</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. Carrito y Checkout Online */}
          <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Carrito y Checkout Online</span>
                {overrides.online_checkout !== null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Personalizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-70">
                    Del plan ({planDefaults?.online_checkout ? 'Sí' : 'No'})
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60">
                Efectivo: <strong>{effective?.online_checkout ? 'Habilitado' : 'Deshabilitado'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 md:w-1/2 justify-end">
              <button
                type="button"
                onClick={() =>
                  setOverrides((prev) => ({
                    ...prev,
                    online_checkout: prev.online_checkout === null ? false : !prev.online_checkout,
                  }))
                }
                className={`min-h-[40px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  (overrides.online_checkout ?? planDefaults?.online_checkout)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {(overrides.online_checkout ?? planDefaults?.online_checkout) ? 'Sí' : 'No'}
              </button>

              {overrides.online_checkout !== null && (
                <button
                  type="button"
                  onClick={() => handleResetToPlan('online_checkout')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver al plan</span>
                </button>
              )}
            </div>
          </div>

          {/* 5. Mercado Pago */}
          <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Mercado Pago (Tarjetas / Cuotas)</span>
                {overrides.mercadopago !== null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Personalizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-70">
                    Del plan ({planDefaults?.mercadopago ? 'Sí' : 'No'})
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60">
                Efectivo: <strong>{effective?.mercadopago ? 'Habilitado' : 'Deshabilitado'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 md:w-1/2 justify-end">
              <button
                type="button"
                onClick={() =>
                  setOverrides((prev) => ({
                    ...prev,
                    mercadopago: prev.mercadopago === null ? false : !prev.mercadopago,
                  }))
                }
                className={`min-h-[40px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  (overrides.mercadopago ?? planDefaults?.mercadopago)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {(overrides.mercadopago ?? planDefaults?.mercadopago) ? 'Sí' : 'No'}
              </button>

              {overrides.mercadopago !== null && (
                <button
                  type="button"
                  onClick={() => handleResetToPlan('mercadopago')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver al plan</span>
                </button>
              )}
            </div>
          </div>

          {/* 6. Seña / Pago Parcial */}
          <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Seña / Pago Parcial con MP</span>
                {overrides.deposit_payments !== null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Personalizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-70">
                    Del plan ({planDefaults?.deposit_payments ? 'Sí' : 'No'})
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60">
                Efectivo: <strong>{effective?.deposit_payments ? 'Habilitado' : 'Deshabilitado'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 md:w-1/2 justify-end">
              <button
                type="button"
                onClick={() =>
                  setOverrides((prev) => ({
                    ...prev,
                    deposit_payments: prev.deposit_payments === null ? false : !prev.deposit_payments,
                  }))
                }
                className={`min-h-[40px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  (overrides.deposit_payments ?? planDefaults?.deposit_payments)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {(overrides.deposit_payments ?? planDefaults?.deposit_payments) ? 'Sí' : 'No'}
              </button>

              {overrides.deposit_payments !== null && (
                <button
                  type="button"
                  onClick={() => handleResetToPlan('deposit_payments')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver al plan</span>
                </button>
              )}
            </div>
          </div>

          {/* 7. Recargo por MP Trasladable */}
          <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Recargo MP al Comprador</span>
                {overrides.mp_surcharge !== null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Personalizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-70">
                    Del plan ({planDefaults?.mp_surcharge ? 'Sí' : 'No'})
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60">
                Efectivo: <strong>{effective?.mp_surcharge ? 'Habilitado' : 'Deshabilitado'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 md:w-1/2 justify-end">
              <button
                type="button"
                onClick={() =>
                  setOverrides((prev) => ({
                    ...prev,
                    mp_surcharge: prev.mp_surcharge === null ? false : !prev.mp_surcharge,
                  }))
                }
                className={`min-h-[40px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  (overrides.mp_surcharge ?? planDefaults?.mp_surcharge)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {(overrides.mp_surcharge ?? planDefaults?.mp_surcharge) ? 'Sí' : 'No'}
              </button>

              {overrides.mp_surcharge !== null && (
                <button
                  type="button"
                  onClick={() => handleResetToPlan('mp_surcharge')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver al plan</span>
                </button>
              )}
            </div>
          </div>

          {/* 8. Transferencia Bancaria en Checkout */}
          <div className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 md:w-1/3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Transferencia en Checkout (CBU/Alias)</span>
                {overrides.bank_transfer !== null ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                    Personalizado
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-black/5 dark:bg-white/10 opacity-70">
                    Del plan ({planDefaults?.bank_transfer ? 'Sí' : 'No'})
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-60">
                Efectivo: <strong>{effective?.bank_transfer ? 'Habilitado' : 'Deshabilitado'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 md:w-1/2 justify-end">
              <button
                type="button"
                onClick={() =>
                  setOverrides((prev) => ({
                    ...prev,
                    bank_transfer: prev.bank_transfer === null ? false : !prev.bank_transfer,
                  }))
                }
                className={`min-h-[40px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  (overrides.bank_transfer ?? planDefaults?.bank_transfer)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {(overrides.bank_transfer ?? planDefaults?.bank_transfer) ? 'Sí' : 'No'}
              </button>

              {overrides.bank_transfer !== null && (
                <button
                  type="button"
                  onClick={() => handleResetToPlan('bank_transfer')}
                  className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-medium flex items-center gap-1 opacity-80 hover:opacity-100"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Volver al plan</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Registro de Auditoría de esta Tienda */}
      <div className="p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-borde)]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#FF5500]" />
            <h4 className="font-bold text-sm">Historial de Auditoría de esta Tienda</h4>
          </div>
          <button
            type="button"
            onClick={loadConfig}
            className="text-xs opacity-75 hover:opacity-100 flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg border border-[var(--color-borde)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs opacity-60 py-4 text-center">
            No se han registrado modificaciones de configuración para esta tienda todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-borde)] opacity-60">
                  <th className="py-2 pr-3">Variable</th>
                  <th className="py-2 pr-3">Valor Anterior</th>
                  <th className="py-2 pr-3">Nuevo Valor</th>
                  <th className="py-2 pr-3">Modificado por</th>
                  <th className="py-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borde)]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-3 font-mono text-[11px] font-semibold text-[#FF5500]">
                      {log.variable_name}
                    </td>
                    <td className="py-2.5 pr-3 text-rose-600 dark:text-rose-400 font-mono">
                      {log.old_value ?? 'null'}
                    </td>
                    <td className="py-2.5 pr-3 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                      {log.new_value ?? 'null'}
                    </td>
                    <td className="py-2.5 pr-3 opacity-75">{log.changed_by_email || 'Sistema'}</td>
                    <td className="py-2.5 opacity-60 text-[11px]">
                      {new Date(log.created_at).toLocaleString('es-AR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

