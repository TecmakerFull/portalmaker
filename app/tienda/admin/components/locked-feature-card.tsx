// =============================================================================
// PORTALMAKER — Tarjeta de Funcionalidad Bloqueada por Nivel de Suscripción
// Se muestra cuando una tienda intenta acceder a una sección que requiere un plan superior.
// =============================================================================

import Link from 'next/link'
import { Lock, Sparkles, ArrowRight, ShieldAlert } from 'lucide-react'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'
import { FEATURE_REQUIREMENTS, type PlanFeatureKey } from '@/lib/plans'

interface LockedFeatureCardProps {
  featureKey?: PlanFeatureKey
  featureName?: string
  minPlanName?: string
  description?: string
  tenantQuery?: string
  storeName?: string
  storePlan?: string
}

export default function LockedFeatureCard({
  featureKey,
  featureName,
  minPlanName,
  description,
  tenantQuery = '',
  storeName = 'mi tienda',
}: LockedFeatureCardProps) {
  const req = featureKey ? FEATURE_REQUIREMENTS[featureKey] : null
  const effectiveName = featureName || req?.nombre || 'Esta funcionalidad'
  const effectiveMinPlan = minPlanName || req?.minPlanNombre || 'un plan superior'
  const effectiveDesc = description || req?.descripcion || 'Esta función está reservada para niveles superiores de suscripción.'
  return (
    <div className="max-w-2xl mx-auto my-8 p-6 sm:p-8 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-sm text-center space-y-5">
      <div className="w-14 h-14 rounded-2xl bg-amber-400/10 text-[#CA8A04] dark:text-[#FACC15] flex items-center justify-center mx-auto border border-amber-400/20">
        <Lock className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <span className="text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full bg-amber-400/15 text-[#CA8A04] dark:text-[#FACC15]">
          Disponible a partir de {effectiveMinPlan}
        </span>
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {effectiveName} no está incluido en tu plan actual
        </h2>
        <p className="text-xs sm:text-sm opacity-70 max-w-lg mx-auto leading-relaxed">
          {effectiveDesc}
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[var(--color-borde)] text-xs text-left max-w-md mx-auto space-y-1">
        <div className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
          <Sparkles className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>¿Cómo habilitar esta función?</span>
        </div>
        <p className="opacity-70 leading-normal">
          Puedes mejorar tu suscripción o solicitar una habilitación especial a la administración de Portalmaker.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          href={`/tienda/admin/suscripcion${tenantQuery}`}
          className="w-full sm:w-auto min-h-[44px] px-6 rounded-xl bg-[#CA8A04] hover:bg-[#A16207] text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <span>Ver Planes y Mejorar Cuenta</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <a
          href={`https://wa.me/5493415866464?text=${encodeURIComponent(
            `Hola Portalmaker, me gustaría consultar para habilitar "${featureName}" en mi tienda "${storeName}".`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          <span>Consultar por WhatsApp</span>
        </a>
      </div>
    </div>
  )
}
