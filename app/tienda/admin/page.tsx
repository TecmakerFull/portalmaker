// =============================================================================
// PORTALMAKER — Panel de Control Principal de Tienda (Estilo Empretienda)
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  CheckCircle2,
  Package,
  Palette,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Store,
  Layers,
  HelpCircle,
  Truck,
  BookOpen,
  ArrowRight,
} from 'lucide-react'

export default async function AdminHomePage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''

  const supabase = await createSupabaseServerClient()

  // Consultar cantidad de productos creados en la tienda
  const { count: productCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('store_id', store.id)

  const hasProducts = (productCount ?? 0) > 0
  const hasBranding = Boolean(store.color_primario && store.whatsapp_numero)

  // Calcular progreso (ej: 2/4 o 3/4)
  let stepsCompleted = 1 // 1 por haber creado la tienda
  if (hasProducts) stepsCompleted++
  if (hasBranding) stepsCompleted++
  if (store.whatsapp_numero) stepsCompleted++

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      {/* Saludo Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)]">
            ¡Hola, {store.nombre}!
          </h1>
          <p className="text-sm opacity-70 mt-1 max-w-xl">
            Te damos la bienvenida a tu panel de control. Este es tu espacio para administrar productos, personalizar tu marca y recibir pedidos directos.
          </p>
        </div>

        {/* Acceso a Guía Paso a Paso */}
        <Link
          href={`/tienda/admin/guia${tenantQuery}`}
          style={{ color: '#1F2937' }}
          className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#FACC15] text-[#1F2937] hover:bg-[#eab308] text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all shrink-0 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 text-[#1F2937]" />
          <span>Ver Guía Paso a Paso</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#1F2937]" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Checklist de Pasos (2 columnas de ancho) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs">
            {/* Header del Progreso */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-base sm:text-lg font-bold">Pasos para dejar lista tu tienda</h2>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#FACC15]/20 text-amber-900 dark:text-amber-200">
                {stepsCompleted}/4
              </span>
            </div>

            <p className="text-xs sm:text-sm opacity-70 mb-5">
              Te dejamos una guía rápida para que empieces a poner en marcha tu taller online.
            </p>

            {/* Barra de Progreso */}
            <div className="w-full bg-black/5 dark:bg-white/10 h-2 rounded-full overflow-hidden mb-6">
              <div
                className="bg-[#FACC15] h-full rounded-full transition-all duration-500"
                style={{ width: `${(stepsCompleted / 4) * 100}%` }}
              />
            </div>

            {/* Lista de Pasos */}
            <div className="space-y-3">
              {/* Paso 1: Creación de Tienda */}
              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold">Creaste tu tienda</span>
                    <p className="text-xs opacity-60">Subdominio {store.slug}.portalmaker.ar asignado</p>
                  </div>
                </div>
              </div>

              {/* Paso 2: Cargar Productos */}
              <Link
                href={`/tienda/admin/productos${tenantQuery}`}
                className="p-4 rounded-2xl border border-[var(--color-borde)] hover:border-[#FACC15] hover:bg-[#FACC15]/5 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  {hasProducts ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-[var(--color-borde)] flex items-center justify-center shrink-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-semibold group-hover:text-[#CA8A04] dark:group-hover:text-[#FACC15] transition-colors">
                      {hasProducts ? 'Productos cargados en catálogo' : 'Agregá tus productos de taller'}
                    </span>
                    <p className="text-xs opacity-60">
                      Cargá piezas de impresión 3D, corte láser o CNC con fotos y fichas técnicas.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              </Link>

              {/* Paso 3: Personalizar Marca */}
              <Link
                href={`/tienda/admin/branding${tenantQuery}`}
                className="p-4 rounded-2xl border border-[var(--color-borde)] hover:border-[#FACC15] hover:bg-[#FACC15]/5 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-[#CA8A04] dark:text-[#FACC15] shrink-0" />
                  <div>
                    <span className="text-sm font-semibold group-hover:text-[#CA8A04] dark:group-hover:text-[#FACC15] transition-colors">
                      Personalizá tus colores y marca
                    </span>
                    <p className="text-xs opacity-60">
                      Elegí tu paleta de colores, tipografía y subí tu logo o banner.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              </Link>

              {/* Paso 4: WhatsApp de Ventas */}
              <Link
                href={`/tienda/admin/branding${tenantQuery}`}
                className="p-4 rounded-2xl border border-[var(--color-borde)] hover:border-[#FACC15] hover:bg-[#FACC15]/5 transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold group-hover:text-[#CA8A04] dark:group-hover:text-[#FACC15] transition-colors">
                      Configurá tu WhatsApp para recibir consultas
                    </span>
                    <p className="text-xs opacity-60">
                      Tus compradores te escribirán directamente con el producto precargado.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tarjetas de Consejos & Ayuda Maker */}
        <div className="space-y-4">
          {/* Card: Tip Maker */}
          <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Tip Maker</span>
            </div>
            <h3 className="text-sm font-bold mb-1.5">Fichas técnicas y materiales</h3>
            <p className="text-xs opacity-75 leading-relaxed">
              En cada producto podés detallar el filamento (PLA, PETG, ABS, Resina), espesores de corte o tolerancias CNC para que tus clientes conozcan la calidad de tu trabajo.
            </p>
          </div>

          {/* Card: Envíos & Retiro en Taller */}
          <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-2">
              <Truck className="w-4 h-4" />
              <span>Envíos y Retiro</span>
            </div>
            <h3 className="text-sm font-bold mb-1.5">Atención directa</h3>
            <p className="text-xs opacity-75 leading-relaxed">
              Al no haber intermediarios en los cobros del plan vitrina, acordás envíos por Andreani, Correo Argentino o retiro en tu taller sin pagar comisiones por venta.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
