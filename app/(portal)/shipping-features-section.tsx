// =============================================================================
// PORTALMAKER — Sección de Envíos Automatizados (Landing Page del Portal)
// Explica qué es Zipnova (agregador logístico multicourier con Andreani, Correo Argentino, OCA),
// cómo funciona la cotización y etiquetas, con desplegables interactivos minimalistas.
// REGLAS: Sin emojis, solo lucide-react, touch-targets >= 44x44px, tipografía sutil.
// =============================================================================

'use client'

import { useState } from 'react'
import {
  Truck,
  Building2,
  Package,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  Tag,
  ShieldCheck,
  Printer,
  Compass,
  ArrowRight,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

interface AccordionItem {
  id: string
  title: string
  icon: typeof Truck
  shortDesc: string
  content: {
    subtitle?: string
    paragraphs: string[]
    bulletPoints?: { label: string; text: string }[]
  }
}

const ITEMS: AccordionItem[] = [
  {
    id: 'que-es',
    title: '¿Cómo funciona un agregador logístico como Zipnova?',
    icon: Compass,
    shortDesc: 'No es una empresa de fletes propia, sino un puente tecnológico multicourier.',
    content: {
      paragraphs: [
        'Zipnova actúa como un conector central entre tu tienda en Portalmaker y los principales correos y transportistas de la Argentina. Gracias a esta integración, no necesitás gestionar cuentas separadas en cada empresa de transporte.',
      ],
      bulletPoints: [
        {
          label: 'Cotización en tiempo real',
          text: 'Cuando tu cliente ingresa su código postal en el checkout, el sistema consulta las tarifas y plazos exactos de entrega de forma instantánea.',
        },
        {
          label: 'Generación de etiquetas en 1 clic',
          text: 'Se genera la guía de despacho oficial en formato PDF para imprimir en hoja común o impresora térmica, sin cargar datos a mano.',
        },
        {
          label: 'Seguimiento unificado',
          text: 'Tanto vos como tu comprador reciben un enlace de tracking en tiempo real para conocer la ubicación del paquete en todo momento.',
        },
      ],
    },
  },
  {
    id: 'transportistas',
    title: 'Empresas de transporte líderes integradas',
    icon: Building2,
    shortDesc: 'Despachá con las marcas más reconocidas y con mayor cobertura del país.',
    content: {
      paragraphs: [
        'Al habilitar la logística en tu tienda, tus clientes pueden elegir entre las empresas más confiables del mercado argentino según conveniencia y costo:',
      ],
      bulletPoints: [
        {
          label: 'Andreani',
          text: 'Líder en paquetería express con entregas a domicilio y amplia red de sucursales en todo el país.',
        },
        {
          label: 'Correo Argentino',
          text: 'La mayor capilaridad y alcance nacional, llegando a cada localidad y pueblo del territorio argentino.',
        },
        {
          label: 'OCA',
          text: 'Reconocida red logística para envíos estándar y prioritarios a sucursal y a domicilio.',
        },
        {
          label: 'Servicios de última milla y Flex',
          text: 'Envíos en el día o en 24 horas dentro de los principales conglomerados urbanos (CABA, Rosario, Córdoba, etc.).',
        },
      ],
    },
  },
  {
    id: 'beneficios',
    title: 'Beneficios para tu negocio y tus clientes',
    icon: Tag,
    shortDesc: 'Tarifas corporativas con descuento, cero trámites y mayor tasa de conversión.',
    content: {
      paragraphs: [
        'Portalmaker y Zipnova resuelven la logística de punta a punta para que te concentres en fabricar y vender:',
      ],
      bulletPoints: [
        {
          label: 'Tarifas con descuento por volumen',
          text: 'Accedés a convenios mayoristas que normalmente solo obtienen grandes empresas, sin importar tu escala de venta.',
        },
        {
          label: 'Cero burocracia',
          text: 'No tenés que firmar contratos comerciales, presentar balances ni comprometer un volumen mínimo de paquetes por mes.',
        },
        {
          label: 'Ahorro de tiempo diario',
          text: 'Se terminaron las filas en el mostrador para pagar o llenar guías a mano; el paquete sale rotulado y pago desde tu taller.',
        },
        {
          label: 'Confianza inmediata',
          text: 'Tus clientes reconocen marcas como Andreani o Correo Argentino, eliminando el miedo al despacho a distancia.',
        },
      ],
    },
  },
  {
    id: 'operatoria',
    title: '¿Cómo es el paso a paso para despachar un pedido?',
    icon: Package,
    shortDesc: 'La operatoria diaria se reduce a 4 pasos simples y rápidos.',
    content: {
      paragraphs: [
        'Desde que un comprador realiza una compra con envío, el circuito operativo es directo y automático:',
      ],
      bulletPoints: [
        {
          label: '1. Recepción del pedido',
          text: 'El cliente paga su compra y la orden entra a tu panel con el domicilio de entrega y la modalidad seleccionada.',
        },
        {
          label: '2. Generar e imprimir etiqueta',
          text: 'Desde el detalle del pedido, presionás "Imprimir Etiqueta PDF" y se descarga lista para imprimir.',
        },
        {
          label: '3. Embalar el producto',
          text: 'Alistás tu producto en su caja o bolsa y pegás la etiqueta impresa en el frente.',
        },
        {
          label: '4. Despacho ágil',
          text: 'Podés dejar el paquete en cualquier sucursal de recepción (Drop-off) sin hacer fila, o solicitar retiro por tu taller (Pick-up) si está disponible en tu zona.',
        },
      ],
    },
  },
]

export default function ShippingFeaturesSection() {
  const [openItem, setOpenItem] = useState<string | null>(null)

  const toggleItem = (id: string) => {
    setOpenItem((prev) => (prev === id ? null : id))
  }

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 scroll-mt-20">
      <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-6 sm:p-10 lg:p-12 shadow-sm transition-colors duration-200 space-y-8">
        {/* Encabezado de la sección */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5500]/15 border border-[#FF5500]/30 text-xs font-semibold uppercase tracking-wider text-[#FF5500]">
            <Truck className="w-3.5 h-3.5" />
            <span>Logística Integrada a Todo el País</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight font-[var(--font-portal-heading)] text-[var(--color-texto)]">
            Envíos automáticos con las empresas líderes de Argentina
          </h2>

          <p className="text-sm sm:text-base opacity-80 leading-relaxed font-normal">
            En Portalmaker integramos <strong>Zipnova</strong>, la plataforma de logística multicourier que conecta tu tienda con <strong>Andreani</strong>, <strong>Correo Argentino</strong> y <strong>OCA</strong>. Cotizaciones exactas al instante, etiquetas automáticas y seguimiento unificado sin trámites engorrosos.
          </p>
        </div>

        {/* Insignias de Carriers reconocidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block text-[var(--color-texto)]">Andreani</span>
              <span className="text-[11px] opacity-60">Domicilio y sucursal</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block text-[var(--color-texto)]">Correo Argentino</span>
              <span className="text-[11px] opacity-60">Alcance nacional</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block text-[var(--color-texto)]">OCA</span>
              <span className="text-[11px] opacity-60">Red de sucursales</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.02] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold block text-[var(--color-texto)]">Flex / Express</span>
              <span className="text-[11px] opacity-60">Entregas en el día</span>
            </div>
          </div>
        </div>

        {/* Desplegables minimalistas interactivos */}
        <div className="space-y-3 pt-2">
          {ITEMS.map((item) => {
            const isOpen = openItem === item.id
            const IconComponent = item.icon

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  isOpen
                    ? 'border-[#FF5500]/60 bg-black/[0.015] dark:bg-white/[0.02]'
                    : 'border-[var(--color-borde)] bg-[var(--color-superficie)] hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                {/* Botón de cabecera del acordeón */}
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={isOpen}
                  className="w-full min-h-[56px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isOpen
                          ? 'bg-[#FF5500] text-white'
                          : 'bg-black/5 dark:bg-white/5 text-[var(--color-texto)]'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-semibold text-[var(--color-texto)] truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs opacity-65 truncate mt-0.5">{item.shortDesc}</p>
                    </div>
                  </div>

                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-[#FF5500]/15 text-[#FF5500]' : 'opacity-60'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Contenido desplegable */}
                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-[var(--color-borde)]/60 text-xs sm:text-sm space-y-4 animate-in fade-in duration-200">
                    {item.content.paragraphs.map((p, idx) => (
                      <p key={idx} className="opacity-80 leading-relaxed">
                        {p}
                      </p>
                    ))}

                    {item.content.bulletPoints && item.content.bulletPoints.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {item.content.bulletPoints.map((bp, bpIdx) => (
                          <div
                            key={bpIdx}
                            className="p-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] space-y-1"
                          >
                            <span className="font-semibold text-[var(--color-texto)] flex items-center gap-1.5 text-xs sm:text-sm">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>{bp.label}</span>
                            </span>
                            <p className="text-xs opacity-75 leading-relaxed">{bp.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Llamado a la acción inferior */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[var(--color-borde)]">
          <div className="text-xs opacity-75 text-center sm:text-left">
            Activá la logística desde el panel de control de tu tienda en 1 minuto.
          </div>

          <Link
            href="/login"
            style={{ color: '#FFFFFF' }}
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#FF5500] text-white text-xs sm:text-sm font-bold hover:bg-[#E04B00] active:scale-98 transition-all flex items-center gap-2 shadow-xs"
          >
            <span>Crear mi tienda y activar envíos</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </Link>
        </div>
      </div>
    </section>
  )
}
