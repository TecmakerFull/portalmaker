'use client'

import { useState, useEffect } from 'react'
import {
  Layers,
  Percent,
  Package,
  CreditCard,
  MessageCircle,
  ShoppingCart,
  Banknote,
  DollarSign,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCcw,
} from 'lucide-react'

interface PlanData {
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
  precio_mensual_ars?: number
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

export default function PlanesConfigManager() {
  const [plans, setPlans] = useState<PlanData[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('free')
  const [formState, setFormState] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Cargar planes
  const fetchPlans = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/plans')
      const json = await res.json()
      if (json.plans) {
        setPlans(json.plans)
        const current = json.plans.find((p: PlanData) => p.id === selectedPlanId) || json.plans[0]
        if (current) {
          setSelectedPlanId(current.id)
          setFormState({ ...current })
        }
      }
    } catch {
      setMessage({ text: 'Error al cargar los planes', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Cargar logs de auditoría para planes
  const fetchAuditLogs = async () => {
    try {
      setLoadingLogs(true)
      const res = await fetch('/api/admin/audit-log?target_type=plan&limit=30')
      const json = await res.json()
      if (json.logs) {
        setAuditLogs(json.logs)
      }
    } catch {
      // Ignorar error secundario de auditoría
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchPlans()
    fetchAuditLogs()
  }, [])

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId)
    const p = plans.find((x) => x.id === planId)
    if (p) {
      setFormState({ ...p })
      setMessage(null)
    }
  }

  const handleSave = async () => {
    if (!formState) return

    // Validaciones
    if (formState.commission_pct < 0 || formState.commission_pct > 20) {
      setMessage({ text: 'La comisión debe estar entre 0% y 20%', type: 'error' })
      return
    }

    if (
      formState.max_active_products !== null &&
      (isNaN(Number(formState.max_active_products)) || Number(formState.max_active_products) < 0)
    ) {
      setMessage({ text: 'El límite de productos debe ser mayor o igual a 0 o ilimitado', type: 'error' })
      return
    }

    try {
      setSaving(true)
      setMessage(null)
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: formState.id,
          commission_pct: Number(formState.commission_pct),
          max_active_products: formState.max_active_products,
          whatsapp_orders: formState.whatsapp_orders,
          online_checkout: formState.online_checkout,
          mercadopago: formState.mercadopago,
          deposit_payments: formState.deposit_payments,
          mp_surcharge: formState.mp_surcharge,
          bank_transfer: formState.bank_transfer,
        }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar el plan')
      }

      setMessage({
        text: `Plan ${formState.nombre} actualizado correctamente (${json.changesCount} variable/s registradas en auditoría).`,
        type: 'success',
      })
      await fetchPlans()
      await fetchAuditLogs()
    } catch (err: any) {
      setMessage({ text: err.message || 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#FF5500]" />
        <span className="text-sm opacity-70">Cargando configuración de planes...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selector de Plan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {plans.map((p) => {
          const isSelected = p.id === selectedPlanId
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPlan(p.id)}
              className={`min-h-[44px] p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-[#FF5500] bg-[#FF5500]/10 text-[var(--color-texto)] shadow-sm'
                  : 'border-[var(--color-borde)] bg-[var(--color-superficie)] opacity-75 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm tracking-tight">{p.nombre}</span>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-[#FF5500]" />}
              </div>
              <div className="mt-2 text-xs opacity-70">
                Comisión: <span className="font-semibold">{p.commission_pct}%</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Editor del Plan Seleccionado */}
      {formState && (
        <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--color-borde)]">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#FF5500]" />
                <h3 className="font-bold text-base sm:text-lg">
                  Configuración por Defecto: Plan {formState.nombre}
                </h3>
              </div>
              <p className="text-xs opacity-70 mt-1">
                Los cambios aplican automáticamente a todas las tiendas suscritas a este plan que no tengan un valor personalizado (override).
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#FF5500] hover:bg-[#e04b00] text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Guardar Plan</span>
            </button>
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

          {/* Grilla de Variables Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Comisión Portalmaker */}
            <div className="p-4 rounded-xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-[#FF5500]" />
                  Comisión Portalmaker por venta (%)
                </label>
                <span className="text-[11px] font-bold text-[#FF5500]">{formState.commission_pct}%</span>
              </div>
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={formState.commission_pct}
                onChange={(e) =>
                  setFormState({ ...formState, commission_pct: Number(e.target.value) })
                }
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
              />
              <p className="text-[11px] opacity-60">
                Retención de plataforma por cada venta con Mercado Pago (0% a 20%). Adicional a la tarifa de MP.
              </p>
            </div>

            {/* Límite de productos */}
            <div className="p-4 rounded-xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider opacity-80 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#FF5500]" />
                  Límite de productos activos
                </label>
                <span className="text-[11px] font-bold">
                  {formState.max_active_products === null ? 'Ilimitado' : formState.max_active_products}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  disabled={formState.max_active_products === null}
                  value={formState.max_active_products ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
                    setFormState({ ...formState, max_active_products: val })
                  }}
                  placeholder="Sin límite"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium disabled:opacity-40"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormState({
                      ...formState,
                      max_active_products: formState.max_active_products === null ? 50 : null,
                    })
                  }
                  className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold shrink-0 transition-colors ${
                    formState.max_active_products === null
                      ? 'bg-[#FF5500] text-white border-[#FF5500]'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  {formState.max_active_products === null ? 'Ilimitado' : 'Fijar límite'}
                </button>
              </div>
              <p className="text-[11px] opacity-60">
                Tope de productos que la tienda puede tener publicados simultáneamente.
              </p>
            </div>
          </div>

          {/* Grilla de Flags Booleanos */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
              Funcionalidades Habilitadas en el Plan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {/* WhatsApp Orders */}
              <div className="p-3.5 rounded-xl border border-[var(--color-borde)] flex items-center justify-between gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="min-w-0">
                  <span className="font-semibold text-xs block">Pedidos por WhatsApp</span>
                  <span className="text-[10px] opacity-60 block mt-0.5">Botonera y contacto directo</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormState({ ...formState, whatsapp_orders: !formState.whatsapp_orders })
                  }
                  className={`min-h-[44px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    formState.whatsapp_orders
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {formState.whatsapp_orders ? 'Sí' : 'No'}
                </button>
              </div>

              {/* Online Checkout */}
              <div className="p-3.5 rounded-xl border border-[var(--color-borde)] flex items-center justify-between gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="min-w-0">
                  <span className="font-semibold text-xs block">Carrito y Checkout Online</span>
                  <span className="text-[10px] opacity-60 block mt-0.5">Procesamiento de órdenes en web</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormState({ ...formState, online_checkout: !formState.online_checkout })
                  }
                  className={`min-h-[44px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    formState.online_checkout
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {formState.online_checkout ? 'Sí' : 'No'}
                </button>
              </div>

              {/* Mercado Pago */}
              <div className="p-3.5 rounded-xl border border-[var(--color-borde)] flex items-center justify-between gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="min-w-0">
                  <span className="font-semibold text-xs block">Mercado Pago</span>
                  <span className="text-[10px] opacity-60 block mt-0.5">Cobro con tarjetas y cuotas</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormState({ ...formState, mercadopago: !formState.mercadopago })
                  }
                  className={`min-h-[44px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    formState.mercadopago
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {formState.mercadopago ? 'Sí' : 'No'}
                </button>
              </div>

              {/* Deposit Payments (Seña) */}
              <div className="p-3.5 rounded-xl border border-[var(--color-borde)] flex items-center justify-between gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="min-w-0">
                  <span className="font-semibold text-xs block">Seña / Pago Parcial</span>
                  <span className="text-[10px] opacity-60 block mt-0.5">Cobro inicial y saldo pendiente</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormState({ ...formState, deposit_payments: !formState.deposit_payments })
                  }
                  className={`min-h-[44px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    formState.deposit_payments
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {formState.deposit_payments ? 'Sí' : 'No'}
                </button>
              </div>

              {/* MP Surcharge */}
              <div className="p-3.5 rounded-xl border border-[var(--color-borde)] flex items-center justify-between gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="min-w-0">
                  <span className="font-semibold text-xs block">Recargo por MP al Comprador</span>
                  <span className="text-[10px] opacity-60 block mt-0.5">Trasladar costo de pasarela</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormState({ ...formState, mp_surcharge: !formState.mp_surcharge })
                  }
                  className={`min-h-[44px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    formState.mp_surcharge
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {formState.mp_surcharge ? 'Sí' : 'No'}
                </button>
              </div>

              {/* Bank Transfer */}
              <div className="p-3.5 rounded-xl border border-[var(--color-borde)] flex items-center justify-between gap-3 bg-black/[0.01] dark:bg-white/[0.01]">
                <div className="min-w-0">
                  <span className="font-semibold text-xs block">Transferencia en Checkout</span>
                  <span className="text-[10px] opacity-60 block mt-0.5">Datos CBU/Alias al finalizar</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFormState({ ...formState, bank_transfer: !formState.bank_transfer })
                  }
                  className={`min-h-[44px] min-w-[70px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                    formState.bank_transfer
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {formState.bank_transfer ? 'Sí' : 'No'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Auditoría de Planes */}
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-borde)]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#FF5500]" />
            <h4 className="font-bold text-sm">Registro de Auditoría de Planes</h4>
          </div>
          <button
            type="button"
            onClick={fetchAuditLogs}
            disabled={loadingLogs}
            className="text-xs opacity-75 hover:opacity-100 flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg border border-[var(--color-borde)]"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs opacity-60 py-4 text-center">
            No se han registrado modificaciones a los planes por defecto todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--color-borde)] opacity-60">
                  <th className="py-2 pr-3">Plan</th>
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
                    <td className="py-2.5 pr-3 font-semibold uppercase text-[#FF5500]">
                      {log.target_id}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px]">{log.variable_name}</td>
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
