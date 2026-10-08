// =============================================================================
// PORTALMAKER — Guía Paso a Paso Interactiva para Configurar la Tienda
// Explicaciones ultra claras y sencillas para dejar la tienda lista en minutos.
// =============================================================================

'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Palette,
  FolderTree,
  Package,
  Layers,
  ShoppingBag,
  CreditCard,
  Globe,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Phone,
  Power,
  Info,
} from 'lucide-react'
import type { Store } from '@/types/database'

export default function GuiaView({
  store,
  tenantQuery,
}: {
  store: Store
  tenantQuery: string
}) {
  const [copiedLink, setCopiedLink] = useState(false)
  const [expandedStep, setExpandedStep] = useState<number | null>(3) // Abrir paso 3 (productos) por defecto

  const storeUrl = `https://${store.slug}.portalmaker.ar`

  const handleCopy = () => {
    navigator.clipboard.writeText(storeUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const steps = [
    {
      num: 1,
      title: 'Tu Logo, Colores y WhatsApp',
      tag: 'La cara de tu negocio',
      icon: Palette,
      color: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-400/30',
      href: `/tienda/admin/branding${tenantQuery}`,
      buttonText: 'Configurar Marca & WhatsApp',
      summary: 'Define cómo se ve tu tienda y a dónde te llegan los pedidos de tus clientes.',
      details: [
        {
          sub: '1. Tu Logo',
          desc: 'Sube una imagen de tu logo o pégala con Ctrl + V. El sistema la optimiza automáticamente para que cargue ultra rápido.',
        },
        {
          sub: '2. Tu Número de WhatsApp',
          desc: 'Ingresa tu número con código de país y área (ej: 5491123456789). A este teléfono llegarán los carritos y consultas con un solo clic.',
        },
        {
          sub: '3. Colores y Tema',
          desc: 'Elige una de las paletas listas o crea tus propios colores. También puedes definir si tu tienda abre en Modo Claro o Modo Oscuro.',
        },
      ],
    },
    {
      num: 2,
      title: 'Crea tus Categorías (Los cajones)',
      tag: 'Organización del catálogo',
      icon: FolderTree,
      color: 'from-blue-500/20 to-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-400/30',
      href: `/tienda/admin/categorias${tenantQuery}`,
      buttonText: 'Crear Categorías',
      summary: 'Son las secciones donde agrupas tus productos para que sea fácil encontrarlos.',
      details: [
        {
          sub: '¿Qué categorías crear?',
          desc: 'Crea carpetas claras como "Filamentos", "Impresión 3D", "Llaveros & Regalos", "Herramientas" o "Servicios".',
        },
        {
          sub: 'Subcategorías opcionales',
          desc: 'Si vendes mucho, puedes crear divisiones adentro (por ejemplo: dentro de "Filamentos", crear "PLA", "PETG", "FLEX").',
        },
      ],
    },
    {
      num: 3,
      title: 'Productos y Variantes (Tu vidriera)',
      tag: 'La parte más importante',
      icon: Package,
      color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-400/30',
      href: `/tienda/admin/productos${tenantQuery}`,
      buttonText: 'Cargar Productos & Variantes',
      summary: 'Aprende a diferenciar el Producto Principal de las opciones de colores o tamaños.',
      details: [
        {
          sub: 'A. El Producto Padre (La publicación principal)',
          desc: 'Ponle el nombre general del producto (ej: "Filamento PLA 1kg — Filar" o "Soporte Auriculares RGB"). No le pongas solo el nombre de un color aquí.',
        },
        {
          sub: 'B. Las Variantes (Los colores, talles o modelos)',
          desc: 'Si tu producto tiene opciones, agrega una variante por cada una: "Negro Azabache", "Blanco Antártida", "Rojo Carreras". Cada una lleva su stock individual.',
        },
        {
          sub: 'C. Fotos Generales vs. Fotos de Variante',
          desc: 'En el producto puedes subir hasta 10 fotos generales (ángulos, medidas, empaque). Y a cada variante le asignas 1 foto principal para que cuando el cliente toque el color, la foto cambie automáticamente.',
        },
        {
          sub: 'D. Subida Fácil y Rápida',
          desc: 'Puedes arrastrar archivos desde tu PC/celular o simplemente pegar imágenes con Ctrl + V. Todo se convierte a WebP liviano solo.',
        },
      ],
    },
    {
      num: 4,
      title: 'Banners y Carrusel de Entrada',
      tag: 'Carteles de bienvenida',
      icon: Layers,
      color: 'from-purple-500/20 to-purple-500/5 text-purple-600 dark:text-purple-400 border-purple-400/30',
      href: `/tienda/admin/banners${tenantQuery}`,
      buttonText: 'Administrar Banners',
      summary: 'Coloca de 1 a 3 imágenes panorámicas arriba de tu tienda para destacar promociones.',
      details: [
        {
          sub: '¿Para qué sirven?',
          desc: 'Para mostrar novedades, envíos a todo el país, descuentos especiales o productos estrella.',
        },
        {
          sub: 'Botón con enlace directo',
          desc: 'Puedes ponerle un botón que al hacer clic lleve a un producto específico, a una categoría de oferta o a una web externa.',
        },
      ],
    },
    {
      num: 5,
      title: 'Sobre Nosotros (Tu historia y taller)',
      tag: 'Genera confianza',
      icon: HelpCircle,
      color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-400/30',
      href: `/tienda/admin/sobre-nosotros${tenantQuery}`,
      buttonText: 'Editar Sobre Nosotros',
      summary: 'Cuéntales a tus visitantes quién está detrás de los productos.',
      details: [
        {
          sub: 'Tu presentación',
          desc: 'Escribe de qué ciudad eres, qué máquinas tienes en tu taller (impresoras 3D, corte láser, CNC) y tu experiencia como maker.',
        },
        {
          sub: 'Foto del taller o equipo',
          desc: 'Una foto real de tus impresoras trabajando o de tus piezas terminadas genera muchísima confianza en los compradores.',
        },
      ],
    },
    {
      num: 6,
      title: 'Datos de Cobro y Transferencia',
      tag: 'Cómo te pagan',
      icon: CreditCard,
      color: 'from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-400/30',
      href: `/tienda/admin/pagos${tenantQuery}`,
      buttonText: 'Configurar Datos de Pago',
      summary: 'Ingresa tu Alias o CBU para que los clientes te transfieran directamente.',
      details: [
        {
          sub: 'Pago por Transferencia Bancaria / Mercado Pago',
          desc: 'Al confirmar el pedido en la tienda, el comprador verá tus datos de cuenta para hacerte la transferencia y adjuntar el comprobante por WhatsApp.',
        },
      ],
    },
    {
      num: 7,
      title: '¡Encender la Tienda y Compartir!',
      tag: 'Abre tus puertas',
      icon: Power,
      color: 'from-yellow-500/20 to-yellow-500/5 text-yellow-600 dark:text-yellow-400 border-yellow-400/30',
      href: `/tienda/admin${tenantQuery}`,
      buttonText: 'Ir al Inicio del Panel',
      summary: 'Verifica que la tienda esté encendida y empieza a difundir tu link.',
      details: [
        {
          sub: 'Interruptor de Tienda',
          desc: 'En el menú superior izquierdo tienes el botón "Tienda Encendida" (con luz verde). Puedes apagarla en cualquier momento si te vas de vacaciones o entras en mantenimiento.',
        },
        {
          sub: 'Tu enlace propio',
          desc: `Tu link es ${store.slug}.portalmaker.ar. Cópialo y ponlo en tu perfil de Instagram, estados de WhatsApp, TikTok o envíaselo a tus clientes.`,
        },
      ],
    },
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12">
      {/* Encabezado Principal */}
      <div className="bg-[var(--color-superficie)] p-6 sm:p-8 rounded-3xl border border-[var(--color-borde)] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          <Sparkles className="w-4 h-4" />
          <span>Manual de Inicio Rápido</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight font-[var(--font-heading)]">
          Cómo Configurar tu Tienda Maker Paso a Paso
        </h1>

        <p className="text-sm sm:text-base opacity-75 max-w-2xl leading-relaxed">
          Guía fácil y directa para dejar tu tienda online lista en pocos minutos. Sigue estos 7 pasos para configurar tus productos, colores, métodos de pago y empezar a recibir pedidos por WhatsApp.
        </p>

        {/* Link de la Tienda con Botón de Copiar */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)] font-mono text-xs text-slate-800 dark:text-slate-200 truncate">
            <Globe className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="truncate">{storeUrl}</span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-amber-400/20 text-amber-800 dark:text-amber-300 hover:bg-amber-400/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span>¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Enlace</span>
              </>
            )}
          </button>

          <Link
            href={`/tienda${tenantQuery}`}
            target="_blank"
            className="min-h-[44px] px-4 py-2 rounded-2xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0"
          >
            <ExternalLink className="w-4 h-4 opacity-60" />
            <span>Ver Tienda Pública</span>
          </Link>
        </div>
      </div>

      {/* Lista de Pasos Desplegables */}
      <div className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon
          const isExpanded = expandedStep === step.num

          return (
            <div
              key={step.num}
              className={`bg-[var(--color-superficie)] rounded-3xl border transition-all overflow-hidden ${
                isExpanded
                  ? 'border-amber-400/60 shadow-md ring-2 ring-amber-400/10'
                  : 'border-[var(--color-borde)] hover:border-amber-400/40'
              }`}
            >
              {/* Cabecera del Paso */}
              <div
                onClick={() => setExpandedStep(isExpanded ? null : step.num)}
                className="p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-start gap-4">
                  {/* Número y Badge */}
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 bg-gradient-to-br ${step.color} border`}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 opacity-80">
                        Paso {step.num}
                      </span>
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        {step.tag}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {step.title}
                    </h2>

                    <p className="text-xs sm:text-sm opacity-70">
                      {step.summary}
                    </p>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-black/5 dark:bg-white/5 opacity-60 shrink-0 mt-1">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Contenido Expandido */}
              {isExpanded && (
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-[var(--color-borde)] space-y-5 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {step.details.map((d, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)]/60 space-y-1.5"
                      >
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>{d.sub}</span>
                        </h4>
                        <p className="text-xs opacity-75 leading-relaxed">
                          {d.desc}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Botón de Acción Directa al Menú */}
                  <div className="flex items-center justify-end pt-2">
                    <Link
                      href={step.href}
                      style={{ color: '#1F2937' }}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] hover:bg-[#eab308] text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                    >
                      <span>{step.buttonText}</span>
                      <ArrowRight className="w-4 h-4 text-[#1F2937]" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Preguntas Frecuentes / Consejos Clave */}
      <div className="bg-[var(--color-superficie)] p-6 sm:p-7 rounded-3xl border border-[var(--color-borde)] space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Info className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Dudas Frecuentes del Maker</span>
        </div>

        <div className="space-y-3 text-xs sm:text-sm opacity-85 leading-relaxed">
          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1">
            <span className="font-bold block text-slate-900 dark:text-white">
              ¿Las variantes (colores/talles) me descuentan cupo del límite de productos?
            </span>
            <p className="opacity-80">
              No. Un producto con 10 colores cuenta como 1 solo producto de tu plan.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1">
            <span className="font-bold block text-slate-900 dark:text-white">
              ¿Tengo que achicar o comprimir las fotos antes de subirlas?
            </span>
            <p className="opacity-80">
              No es necesario. Portalmaker cuenta con optimizador WebP automático integrado: sube fotos de celular de cualquier tamaño y el sistema las comprime en el navegador sin perder calidad.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 space-y-1">
            <span className="font-bold block text-slate-900 dark:text-white">
              ¿Cómo sé cuándo me entra un pedido?
            </span>
            <p className="opacity-80">
              El comprador armará su carrito y al hacer clic en "Pedir por WhatsApp" te llegará un mensaje pre-armado a tu número con la lista exacta de productos, variantes elegidas, total en pesos y datos de entrega.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
