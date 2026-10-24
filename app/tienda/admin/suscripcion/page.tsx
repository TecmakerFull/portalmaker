// =============================================================================
// PORTALMAKER — Pantalla de Planes y Niveles de Suscripción (Panel de Tienda)
// Muestra la matriz comparativa de planes (Free, Starter, Maker Pro, Enterprise)
// inspirada en la tabla de suscripciones, destacando el plan actual del maker.
// =============================================================================

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseAdminClient } from '@/lib/supabase/server'
import {
  getPlanConfig,
  PLANS_CONFIG,
  SUBSCRIPTION_MATRIX,
  type PlanKey,
} from '@/lib/plans'
import {
  Check,
  X as XIcon,
  Sparkles,
  ShieldCheck,
  Package,
  CreditCard,
  Truck,
  ArrowRight,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import WhatsAppIcon from '@/app/tienda/sections/whatsapp-icon'
import { AdminPageHeader } from '../components/admin-page-header'

export default async function TiendaSuscripcionPage() {
  const tenant = await getTenantStore()
  if (!tenant) notFound()

  const { store: publicStore, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${publicStore.slug}` : ''

  // Verificar permisos de admin
  const isAdmin = await isStoreAdmin(publicStore)
  if (!isAdmin) {
    redirect(`/tienda${tenantQuery}`)
  }

  // Cargar datos completos y frescos de la tienda desde el cliente admin
  const supabaseAdmin = createSupabaseAdminClient()
  const { data: storeData } = await supabaseAdmin
    .from('stores')
    .select('*, products:products(count)')
    .eq('id', publicStore.id)
    .single()

  const store = storeData || publicStore
  const productCount = store.products?.[0]?.count ?? 0
  const currentPlan = getPlanConfig(store.plan)

  // Detectar beneficios manuales del superadmin (overrides sobre el plan estándar)
  const manualOverrides: string[] = []
  if (store.limite_productos && store.limite_productos > currentPlan.limiteProductos) {
    manualOverrides.push(`Límite ampliado a ${store.limite_productos} productos (estándar: ${currentPlan.limiteProductos})`)
  }
  if (currentPlan.key === 'free' && (store.checkout_activo || store.modo_operacion === 'tienda')) {
    manualOverrides.push('Checkout y carrito online habilitado especialmente')
  }
  if (currentPlan.key === 'free' && store.envios_activo) {
    manualOverrides.push('Módulo de envíos habilitado especialmente')
  }
  if (currentPlan.nivel < 3 && Boolean(store.custom_domain)) {
    manualOverrides.push(`Dominio propio activo (${store.custom_domain})`)
  }

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const planKeys: PlanKey[] = ['free', 'starter', 'maker_pro', 'enterprise']

  return (
    <div className="space-y-8 pb-12">
      {/* Cabecera */}
      <AdminPageHeader
        title="Suscripción & Plan"
        description="Conoce las capacidades de tu tienda, límites de catálogo y opciones disponibles para escalar tu taller."
        icon={Sparkles}
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-60">Plan actual:</span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${currentPlan.badgeColor}`}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>{currentPlan.nombre}</span>
            </span>
          </div>
        }
      />

      {/* Banner de Overrides Manuales del Superadmin (si existen) */}
      {manualOverrides.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-400/[0.08] border border-amber-400/30 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15] shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Beneficios Especiales Habilitados por la Administración
            </h4>
            <p className="opacity-80">
              Tu cuenta cuenta con ventajas y configuraciones adicionales otorgadas de manera personalizada:
            </p>
            <ul className="list-disc list-inside space-y-0.5 opacity-90 font-medium pt-1">
              {manualOverrides.map((ov, idx) => (
                <li key={idx}>{ov}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* =======================================================================
          TARJETAS SUPERIORES DE PLANES (ESTILO REFERENCIA COMPARATIVA)
          ======================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
        {planKeys.map((pKey) => {
          const plan = PLANS_CONFIG[pKey]
          const isCurrent = (store.plan || 'free').toLowerCase() === pKey || (pKey === 'enterprise' && store.plan === 'bonificado')
          const isPro = pKey === 'maker_pro'

          return (
            <div
              key={pKey}
              className={`rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all relative ${
                isCurrent
                  ? 'bg-[var(--color-superficie)] border-2 border-[#CA8A04] dark:border-[#FACC15] shadow-lg ring-4 ring-[#CA8A04]/10 dark:ring-[#FACC15]/10'
                  : isPro
                  ? 'bg-[var(--color-superficie)] border-2 border-amber-400/40 shadow-md'
                  : 'bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs'
              }`}
            >
              {/* Badge Superior */}
              <div className="flex items-center justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border ${plan.badgeColor}`}>
                  {plan.nombre}
                </span>

                {isCurrent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                    Plan Activo
                  </span>
                )}

                {!isCurrent && isPro && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-[#CA8A04] dark:text-[#FACC15]">
                    Recomendado
                  </span>
                )}
              </div>

              {/* Precio Mensual */}
              <div className="space-y-1 mb-4">
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {plan.precioMensualSugerido === 0 ? '$0' : formatMoney(plan.precioMensualSugerido)}
                </div>
                <p className="text-xs opacity-60">por mes / facturación transparente</p>
              </div>

              <p className="text-xs opacity-75 min-h-[40px] mb-6 leading-relaxed">
                {plan.descripcion}
              </p>

              {/* Botón de Acción */}
              {isCurrent ? (
                <div className="w-full min-h-[44px] rounded-xl bg-black/5 dark:bg-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 opacity-80 cursor-default">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tu plan actual</span>
                </div>
              ) : (
                <a
                  href={`https://wa.me/5493415866464?text=${encodeURIComponent(
                    `Hola Portalmaker, me gustaría consultar para mejorar mi tienda "${store.nombre}" (${store.slug}) al plan ${plan.nombre}.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full min-h-[44px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                    isPro
                      ? 'bg-[#CA8A04] hover:bg-[#A16207] text-white'
                      : 'border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>Mejorar a {plan.nombre}</span>
                </a>
              )}
            </div>
          )
        })}
      </div>

      {/* =======================================================================
          TABLA COMPARATIVA DETALLADA DE CARACTERÍSTICAS
          ======================================================================= */}
      <div className="rounded-3xl border border-[var(--color-borde)] bg-[var(--color-superficie)] overflow-hidden shadow-xs">
        <div className="p-6 border-b border-[var(--color-borde)] bg-black/[0.01] dark:bg-white/[0.01]">
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Comparativa Completa de Posibilidades y Funciones
          </h2>
          <p className="text-xs opacity-70 mt-0.5">
            Compara en detalle qué incluye cada nivel para tomar la mejor decisión para tu taller maker.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="border-b border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <th className="py-4 px-6 w-2/5">Característica / Posibilidad</th>
                <th className="py-4 px-4 text-center w-[15%]">Free</th>
                <th className="py-4 px-4 text-center w-[15%]">Starter</th>
                <th className="py-4 px-4 text-center w-[15%] bg-amber-400/[0.04]">Maker Pro</th>
                <th className="py-4 px-4 text-center w-[15%]">Enterprise</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--color-borde)] text-xs">
              {SUBSCRIPTION_MATRIX.map((category) => (
                <>
                  {/* Encabezado de Categoría */}
                  <tr key={category.nombre} className="bg-black/[0.03] dark:bg-white/[0.03]">
                    <td
                      colSpan={5}
                      className="py-3 px-6 font-bold uppercase tracking-wider text-[11px] text-[#CA8A04] dark:text-[#FACC15]"
                    >
                      {category.nombre}
                    </td>
                  </tr>

                  {/* Filas de Características */}
                  {category.items.map((item) => (
                    <tr
                      key={item.nombre}
                      className="hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                          {item.nombre}
                        </span>
                        <span className="text-[11px] opacity-60 block mt-0.5">
                          {item.descripcion}
                        </span>
                      </td>

                      {/* Columna Free */}
                      <td className="py-3.5 px-4 text-center">
                        <CellValue value={item.free} />
                      </td>

                      {/* Columna Starter */}
                      <td className="py-3.5 px-4 text-center">
                        <CellValue value={item.starter} />
                      </td>

                      {/* Columna Maker Pro (destacada) */}
                      <td className="py-3.5 px-4 text-center bg-amber-400/[0.03]">
                        <CellValue value={item.maker_pro} highlight />
                      </td>

                      {/* Columna Enterprise */}
                      <td className="py-3.5 px-4 text-center">
                        <CellValue value={item.enterprise} />
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Banner de Soporte y Consultas */}
      <div className="p-6 rounded-3xl bg-[var(--color-superficie)] border border-[var(--color-borde)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div>
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            ¿Necesitas una configuración especial para tu taller?
          </h3>
          <p className="opacity-70 mt-0.5">
            Podemos acordar planes a medida para cooperativas, proyectos educativos o empresas con múltiples creadores.
          </p>
        </div>

        <a
          href={`https://wa.me/5493415866464?text=${encodeURIComponent(
            `Hola Portalmaker, tengo una consulta sobre mi plan de tienda "${store.nombre}".`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] px-5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-[var(--color-borde)] font-semibold flex items-center gap-2 cursor-pointer shrink-0"
        >
          <WhatsAppIcon className="w-4 h-4" />
          <span>Contactar Soporte</span>
        </a>
      </div>
    </div>
  )
}

function CellValue({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto">
        <Check className="w-3.5 h-3.5" />
      </span>
    ) : (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/5 dark:bg-white/5 text-zinc-400 dark:text-zinc-500 mx-auto opacity-50">
        <XIcon className="w-3.5 h-3.5" />
      </span>
    )
  }

  return (
    <span
      className={`font-semibold text-xs ${
        highlight
          ? 'text-[#CA8A04] dark:text-[#FACC15]'
          : 'text-zinc-800 dark:text-zinc-200'
      }`}
    >
      {value}
    </span>
  )
}
