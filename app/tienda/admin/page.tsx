// =============================================================================
// PORTALMAKER — Panel de Control Principal de Tienda (Estilo Empretienda)
//
// El checklist y los consejos cambian según lo que ofrece la tienda:
//   productos -> cargar productos y envíos
//   servicios -> cargar servicios y definir horarios (no hay productos ni envíos)
//   ambos     -> las dos cosas
// =============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTenantStore, isStoreAdmin } from '@/lib/tenant'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  CheckCircle2,
  Package,
  Palette,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Store,
  Truck,
  BookOpen,
  ArrowRight,
  ClipboardList,
  Clock,
  CalendarCheck,
  type LucideIcon,
} from 'lucide-react'
import { AdminPageHeader } from './components/admin-page-header'
import ClientesUso from './components/clientes-uso'
import { getStoreEffectiveLimit } from '@/lib/plans'

interface Paso {
  id: string
  titulo: string
  tituloHecho?: string
  descripcion: string
  href: string
  hecho: boolean
  icono: LucideIcon
  colorIcono: string
}

export default async function AdminHomePage() {
  const tenant = await getTenantStore()

  if (!tenant) {
    notFound()
  }

  const { store, context } = tenant
  // El layout ya verifica permisos; se revalida acá porque las páginas corren en paralelo.
  if (!(await isStoreAdmin(store))) notFound()

  const tenantQuery = context.resolved_by === 'query-param-dev' ? `?tenant=${store.slug}` : ''
  const tipo = store.tipo_negocio ?? 'productos'
  const vendeProductos = tipo !== 'servicios'
  const daTurnos = tipo !== 'productos'

  const supabase = await createSupabaseServerClient()

  // Solo se consulta lo que corresponde al tipo de tienda
  const [productos, servicios, profesional, clientes, porConfirmar] = await Promise.all([
    vendeProductos
      ? supabase.from('products').select('*', { count: 'exact', head: true }).eq('store_id', store.id)
      : Promise.resolve({ count: 0 }),
    daTurnos
      ? supabase.from('services').select('*', { count: 'exact', head: true }).eq('store_id', store.id)
      : Promise.resolve({ count: 0 }),
    // La agenda se crea al entrar por primera vez a "Horarios y reglas"
    daTurnos
      ? supabase.from('staff').select('id', { count: 'exact', head: true }).eq('store_id', store.id)
      : Promise.resolve({ count: 0 }),
    // Clientes registrados: cada uno ocupa un lugar del tope del plan
    supabase.from('store_customers').select('id', { count: 'exact', head: true }).eq('store_id', store.id),
    // Turnos que esperan la aprobación de la tienda: son lo primero que hay que atender
    daTurnos
      ? supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('store_id', store.id)
          .eq('estado', 'pendiente')
          .is('pendiente_expira_at', null)
          .gte('starts_at', new Date().toISOString())
      : Promise.resolve({ count: 0 }),
  ])
  const limiteClientes = getStoreEffectiveLimit(store, 'limite_clientes')

  const hasProducts = (productos.count ?? 0) > 0
  const hasServices = (servicios.count ?? 0) > 0
  const hasHorarios = (profesional.count ?? 0) > 0
  const hasLogo = Boolean(store.logo_url)
  const hasWhatsapp = Boolean(store.whatsapp_numero)

  const pasos: Paso[] = []

  if (daTurnos) {
    pasos.push({
      id: 'servicios',
      titulo: 'Agregá tus servicios',
      tituloHecho: 'Servicios cargados',
      descripcion: 'Cargá cada servicio con su duración, precio y, si querés, un tiempo libre después.',
      href: `/tienda/admin/servicios${tenantQuery}`,
      hecho: hasServices,
      icono: ClipboardList,
      colorIcono: 'text-[#CA8A04] dark:text-[#FACC15]',
    })
    pasos.push({
      id: 'horarios',
      titulo: 'Definí tus horarios de atención',
      tituloHecho: 'Horarios de atención definidos',
      descripcion: 'Elegí qué días y en qué horario recibís turnos. Podés bloquear vacaciones y feriados.',
      href: `/tienda/admin/horarios${tenantQuery}`,
      hecho: hasHorarios,
      icono: Clock,
      colorIcono: 'text-sky-500',
    })
  }

  if (vendeProductos) {
    pasos.push({
      id: 'productos',
      titulo: 'Agregá tus productos',
      tituloHecho: 'Productos cargados en catálogo',
      descripcion: 'Cargá tus productos con fotos, precio y una breve descripción.',
      href: `/tienda/admin/productos${tenantQuery}`,
      hecho: hasProducts,
      icono: Package,
      colorIcono: 'text-[#CA8A04] dark:text-[#FACC15]',
    })
  }

  pasos.push({
    id: 'marca',
    titulo: 'Personalizá tus colores y marca',
    tituloHecho: 'Marca personalizada',
    descripcion: 'Elegí tu paleta de colores, tipografía y subí tu logo o banner.',
    href: `/tienda/admin/branding${tenantQuery}`,
    hecho: hasLogo,
    icono: Palette,
    colorIcono: 'text-[#CA8A04] dark:text-[#FACC15]',
  })

  pasos.push({
    id: 'whatsapp',
    titulo: daTurnos ? 'Configurá tu WhatsApp para recibir tus reservas' : 'Configurá tu WhatsApp para recibir consultas',
    tituloHecho: 'WhatsApp configurado',
    descripcion: daTurnos
      ? 'Cuando alguien reserva, le damos un botón para avisarte por WhatsApp con todos los datos del turno.'
      : 'Tus compradores te escribirán directamente con el producto precargado.',
    href: `/tienda/admin/branding${tenantQuery}`,
    hecho: hasWhatsapp,
    icono: MessageSquare,
    colorIcono: 'text-emerald-500',
  })

  // El primer paso (haber creado la tienda) siempre está hecho
  const total = pasos.length + 1
  const completados = 1 + pasos.filter((p) => p.hecho).length

  const descripcionSaludo =
    tipo === 'servicios'
      ? 'Te damos la bienvenida a tu panel de control. Cargá tus servicios, definí tus horarios y recibí turnos online.'
      : tipo === 'ambos'
        ? 'Te damos la bienvenida a tu panel de control. Administrá tus servicios y productos, personalizá tu marca y recibí turnos y pedidos.'
        : 'Te damos la bienvenida a tu panel de control. Administra tus productos, personaliza tu marca y recibe pedidos directos.'

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Saludo Principal */}
      <AdminPageHeader
        title={`¡Hola, ${store.nombre}!`}
        description={descripcionSaludo}
        icon={Store}
        actions={
          <Link
            href={`/tienda/admin/guia${tenantQuery}`}
            style={{ color: '#1F2937' }}
            className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#FACC15] text-[#1F2937] hover:bg-[#eab308] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-[#1F2937]" />
            <span>Ver Guía Paso a Paso</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#1F2937]" />
          </Link>
        }
      />

      {(porConfirmar.count ?? 0) > 0 && (
        <Link
          href={`/tienda/admin/agenda${tenantQuery}`}
          className="min-h-14 px-4 py-3 rounded-2xl border border-red-500/30 bg-red-500/5 flex items-center justify-between gap-3 text-sm"
        >
          <span className="flex items-center gap-3 min-w-0">
            <span className="min-w-7 h-7 px-2 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {porConfirmar.count}
            </span>
            <span className="font-semibold">
              {porConfirmar.count === 1 ? 'Tenés 1 turno por confirmar' : `Tenés ${porConfirmar.count} turnos por confirmar`}
            </span>
          </span>
          <ArrowRight className="w-4 h-4 opacity-60 shrink-0" />
        </Link>
      )}

      <ClientesUso usados={clientes.count ?? 0} limite={limiteClientes} tenantQuery={tenantQuery} modo="aviso" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Checklist de Pasos (2 columnas de ancho) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs">
            {/* Header del Progreso */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="text-base sm:text-lg font-semibold">Pasos para dejar lista tu tienda</h2>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FACC15]/20 text-amber-900 dark:text-amber-200">
                {completados}/{total}
              </span>
            </div>

            <p className="text-xs sm:text-sm opacity-70 mb-5">
              {daTurnos
                ? 'Te dejamos una guía rápida para que tu agenda esté lista y puedas recibir turnos.'
                : 'Te dejamos una guía rápida para que empieces a poner en marcha tu tienda online.'}
            </p>

            {/* Barra de Progreso */}
            <div className="w-full bg-black/5 dark:bg-white/10 h-2 rounded-full overflow-hidden mb-6">
              <div
                className="bg-[#FACC15] h-full rounded-full transition-all duration-500"
                style={{ width: `${(completados / total) * 100}%` }}
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

              {pasos.map((paso) => {
                const Icono = paso.icono
                return (
                  <Link
                    key={paso.id}
                    href={paso.href}
                    className="min-h-[44px] p-4 rounded-2xl border border-[var(--color-borde)] hover:border-[#FACC15] hover:bg-[#FACC15]/5 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      {paso.hecho ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      ) : (
                        <Icono className={`w-5 h-5 shrink-0 ${paso.colorIcono}`} />
                      )}
                      <div>
                        <span className="text-sm font-semibold group-hover:text-[#CA8A04] dark:group-hover:text-[#FACC15] transition-colors">
                          {paso.hecho ? (paso.tituloHecho ?? paso.titulo) : paso.titulo}
                        </span>
                        <p className="text-xs opacity-60">{paso.descripcion}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Consejos */}
        <div className="space-y-4">
          {daTurnos ? (
            <>
              <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Consejo</span>
                </div>
                <h3 className="text-sm font-semibold mb-1.5">Duración y tiempo libre</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  Poné en cada servicio cuánto dura de verdad y, si lo necesitás, un tiempo libre después para preparar al próximo cliente. Así los turnos nunca se pisan.
                </p>
              </div>

              <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-2">
                  <CalendarCheck className="w-4 h-4" />
                  <span>Turnos online</span>
                </div>
                <h3 className="text-sm font-semibold mb-1.5">Reservas sin llamadas</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  Tus clientes reservan solos, desde el celular, y vos los ves en la Agenda. Si querés, podés pedir una seña con Mercado Pago para asegurar cada turno.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Consejo</span>
                </div>
                <h3 className="text-sm font-semibold mb-1.5">Fichas técnicas y materiales</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  En cada producto contá medidas, materiales y qué incluye: cuanta más información tenga tu cliente, menos dudas y más ventas.
                </p>
              </div>

              <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 shadow-xs">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#CA8A04] dark:text-[#FACC15] mb-2">
                  <Truck className="w-4 h-4" />
                  <span>Envíos y Retiro</span>
                </div>
                <h3 className="text-sm font-semibold mb-1.5">Atención directa</h3>
                <p className="text-xs opacity-75 leading-relaxed">
                  Al no haber intermediarios en los cobros del plan vitrina, acordás envíos por Andreani, Correo Argentino o retiro en tu local sin pagar comisiones por venta.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
