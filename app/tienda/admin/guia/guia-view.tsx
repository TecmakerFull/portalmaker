// =============================================================================
// PORTALMAKER — Guía Paso a Paso Interactiva para Configurar la Tienda
// Manual interactivo por temas con acordeones desplegables para profundizar.
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
  Users,
  UserCheck,
  Star,
  Mail,
  Filter,
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
  const [expandedStep, setExpandedStep] = useState<number | null>(3) // Paso 3 abierto por defecto
  const [filterCategory, setFilterCategory] = useState<'todos' | 'tienda' | 'avanzado'>('todos')

  const storeUrl = `https://${store.slug}.portalmaker.ar`

  const handleCopy = () => {
    navigator.clipboard.writeText(storeUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const steps = [
    {
      num: 1,
      category: 'tienda' as const,
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
      category: 'tienda' as const,
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
      category: 'tienda' as const,
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
      category: 'tienda' as const,
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
      category: 'tienda' as const,
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
      category: 'tienda' as const,
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
      category: 'tienda' as const,
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
    {
      num: 8,
      category: 'avanzado' as const,
      title: 'Colaboradores y Trabajo en Equipo',
      tag: 'Gestión y accesos',
      icon: UserCheck,
      color: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-400/30',
      href: `/tienda/admin/colaboradores${tenantQuery}`,
      buttonText: 'Administrar Colaboradores',
      summary: 'Invita a socios o ayudantes a cargar productos y atender pedidos sin compartir tu clave principal.',
      details: [
        {
          sub: 'Invitar con un correo',
          desc: 'Escribe el correo de tu colaborador y asígnale su rol (Colaborador para catálogo y pedidos, o Administrador).',
        },
        {
          sub: 'Enlace de acceso directo',
          desc: 'Copia el enlace de invitación con un clic y envíaselo por WhatsApp. El ayudante podrá ingresar con su cuenta de Google o correo.',
        },
        {
          sub: 'Privacidad protegida',
          desc: 'El colaborador puede ayudarte en el día a día sin tener acceso a los datos de facturación ni a las credenciales privadas del dueño.',
        },
      ],
    },
    {
      num: 9,
      category: 'avanzado' as const,
      title: 'Clientes & Historial CRM',
      tag: 'Tus compradores',
      icon: Users,
      color: 'from-indigo-500/20 to-indigo-500/5 text-indigo-600 dark:text-indigo-400 border-indigo-400/30',
      href: `/tienda/admin/clientes${tenantQuery}`,
      buttonText: 'Ver Clientes & CRM',
      summary: 'Conoce a cada usuario registrado, su historial de compras, valoraciones y favoritos guardados.',
      details: [
        {
          sub: 'Registro de clientes',
          desc: 'Cada usuario que inicia sesión en tu tienda para guardar piezas o consultar queda registrado automáticamente con su fecha de último ingreso.',
        },
        {
          sub: 'Ficha de historial completo',
          desc: 'Toca el botón "Historial" en cualquier cliente para consultar cuántos pedidos realizó, el gasto acumulado en pesos y sus comentarios dejados.',
        },
        {
          sub: 'Promoción a colaborador',
          desc: 'Si un cliente de confianza o empleado tuyo necesita administrar la tienda, puedes promoverlo con el botón "Hacer Colaborador" de forma instantánea.',
        },
      ],
    },
    {
      num: 10,
      category: 'avanzado' as const,
      title: 'Reseñas & Moderación de Opiniones',
      tag: 'Calificaciones y opiniones',
      icon: Star,
      color: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-400/30',
      href: `/tienda/admin/resenas${tenantQuery}`,
      buttonText: 'Moderar Reseñas',
      summary: 'Tus clientes registrados pueden calificar productos. Tú tienes el control de ocultar opiniones.',
      details: [
        {
          sub: 'Calificación para usuarios de la tienda',
          desc: 'Cualquier visitante registrado en tu tienda puede calificar piezas con 1 a 5 estrellas y escribir su experiencia en la pestaña de opiniones.',
        },
        {
          sub: 'Control total de visibilidad',
          desc: 'Desde el menú "Reseñas" puedes ver todas las opiniones recibidas y alternar el botón "Visible / Oculta" para pausar cualquier comentario no deseado.',
        },
        {
          sub: 'Promedio dinámico',
          desc: 'El sistema calcula automáticamente el promedio de estrellas y la cantidad de reseñas visibles en la ficha del producto y en el catálogo.',
        },
      ],
    },
    {
      num: 11,
      category: 'avanzado' as const,
      title: 'Marketing & Suscriptores al Newsletter',
      tag: 'Audiencia y difusión',
      icon: Mail,
      color: 'from-rose-500/20 to-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-400/30',
      href: `/tienda/admin/suscriptores${tenantQuery}`,
      buttonText: 'Gestionar Suscriptores',
      summary: 'Capta correos de visitantes interesados y envía campañas con novedades en copia oculta (CCO).',
      details: [
        {
          sub: 'Captación en el pie de página',
          desc: 'El formulario de newsletter en el pie de tu tienda guarda los correos en tiempo real para que construyas tu propia base de clientes.',
        },
        {
          sub: 'Envío de campañas con copia oculta',
          desc: 'Redacta el asunto y mensaje de tus novedades y pulsa "Abrir en mi Correo" para que tu cliente de email se abra con todos los contactos en CCO.',
        },
        {
          sub: 'Exportar a CSV / Excel',
          desc: 'Descarga el listado completo de correos con fecha de registro para respaldar tus contactos o cargarlos en herramientas de marketing.',
        },
      ],
    },
  ]

  // Filtrado por categoría temática
  const filteredSteps = steps.filter((s) => {
    if (filterCategory === 'todos') return true
    if (filterCategory === 'tienda') return s.category === 'tienda'
    if (filterCategory === 'avanzado') return s.category === 'avanzado'
    return true
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-12">
      {/* Encabezado Principal */}
      <div className="bg-[var(--color-superficie)] p-6 sm:p-8 rounded-3xl border border-[var(--color-borde)] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          <Sparkles className="w-4 h-4" />
          <span>Manual de Usuario Interactivo</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight font-[var(--font-heading)]">
          Guía Completa para Administrar tu Tienda Maker
        </h1>

        <p className="text-xs sm:text-sm opacity-75 max-w-2xl leading-relaxed">
          Aprende a configurar tu vidriera, gestionar pedidos, invitar colaboradores, moderar reseñas y enviar campañas publicitarias a tus suscriptores.
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
            className="min-h-[44px] px-4 py-2 rounded-2xl bg-amber-400/20 text-amber-800 dark:text-amber-300 hover:bg-amber-400/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
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

      {/* Selector de Temas con Filtro Rápido */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs opacity-60 flex items-center gap-1 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filtrar temas:</span>
        </span>
        <button
          type="button"
          onClick={() => setFilterCategory('todos')}
          className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterCategory === 'todos'
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'border border-[var(--color-borde)] bg-[var(--color-superficie)] opacity-70 hover:opacity-100'
          }`}
        >
          Todos los temas ({steps.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('tienda')}
          className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterCategory === 'tienda'
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'border border-[var(--color-borde)] bg-[var(--color-superficie)] opacity-70 hover:opacity-100'
          }`}
        >
          Puesta a Punto de Tienda (7)
        </button>
        <button
          type="button"
          onClick={() => setFilterCategory('avanzado')}
          className={`min-h-[36px] px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            filterCategory === 'avanzado'
              ? 'bg-[#FACC15] text-[#1F2937] shadow-xs'
              : 'border border-[var(--color-borde)] bg-[var(--color-superficie)] opacity-70 hover:opacity-100'
          }`}
        >
          Clientes, Reseñas & Equipo (4)
        </button>
      </div>

      {/* Lista de Pasos con Acordeón Desplegable */}
      <div className="space-y-3.5">
        {filteredSteps.map((step) => {
          const Icon = step.icon
          const isExpanded = expandedStep === step.num

          return (
            <div
              key={step.num}
              className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                isExpanded
                  ? 'bg-[var(--color-superficie)] border-amber-400/50 shadow-md ring-1 ring-amber-400/20'
                  : 'bg-[var(--color-superficie)] border-[var(--color-borde)] hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              {/* Barra del Paso (Click para abrir o cerrar) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedStep(isExpanded ? null : step.num)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setExpandedStep(isExpanded ? null : step.num)
                  }
                }}
                className="w-full text-left p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border bg-gradient-to-br ${step.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Paso {step.num}
                      </span>
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        {step.tag}
                      </span>
                    </div>

                    <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)] leading-snug">
                      {step.title}
                    </h2>

                    <p className="text-xs opacity-70 line-clamp-1 max-w-xl">
                      {step.summary}
                    </p>
                  </div>
                </div>

                <div className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-black/5 dark:bg-white/5 opacity-70 shrink-0 mt-1">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </div>

              {/* Contenido Expandido del Paso */}
              {isExpanded && (
                <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-[var(--color-borde)] space-y-5 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {step.details.map((d, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-[var(--color-borde)]/60 space-y-1.5"
                      >
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
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
                      className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] hover:bg-[#eab308] text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
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

      {/* Preguntas Frecuentes / Dudas Clave con Acordeones Desplegables */}
      <div className="bg-[var(--color-superficie)] p-6 sm:p-7 rounded-3xl border border-[var(--color-borde)] space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-texto)]">
          <Info className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
          <span>Dudas Frecuentes del Maker (Haz clic para ver la respuesta)</span>
        </div>

        <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
          <details className="group p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 transition-colors cursor-pointer">
            <summary className="font-semibold flex items-center justify-between text-slate-900 dark:text-white list-none">
              <span>¿Las variantes (colores/talles) me descuentan cupo del límite de productos?</span>
              <ChevronDown className="w-4 h-4 opacity-50 group-open:rotate-180 transition-transform shrink-0 ml-2" />
            </summary>
            <p className="opacity-80 pt-2 text-xs leading-relaxed border-t border-[var(--color-borde)]/40 mt-2">
              No. Un producto con 10 colores cuenta como 1 solo producto de tu plan. Puedes crear todas las variantes que necesites.
            </p>
          </details>

          <details className="group p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 transition-colors cursor-pointer">
            <summary className="font-semibold flex items-center justify-between text-slate-900 dark:text-white list-none">
              <span>¿Tengo que achicar o comprimir las fotos antes de subirlas?</span>
              <ChevronDown className="w-4 h-4 opacity-50 group-open:rotate-180 transition-transform shrink-0 ml-2" />
            </summary>
            <p className="opacity-80 pt-2 text-xs leading-relaxed border-t border-[var(--color-borde)]/40 mt-2">
              No es necesario. Portalmaker cuenta con optimizador WebP automático integrado: sube fotos de celular de cualquier tamaño y el sistema las comprime en el navegador sin perder calidad.
            </p>
          </details>

          <details className="group p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 transition-colors cursor-pointer">
            <summary className="font-semibold flex items-center justify-between text-slate-900 dark:text-white list-none">
              <span>¿Cómo sé cuándo me entra un pedido?</span>
              <ChevronDown className="w-4 h-4 opacity-50 group-open:rotate-180 transition-transform shrink-0 ml-2" />
            </summary>
            <p className="opacity-80 pt-2 text-xs leading-relaxed border-t border-[var(--color-borde)]/40 mt-2">
              El comprador armará su carrito y al hacer clic en "Pedir por WhatsApp" te llegará un mensaje pre-armado a tu número con la lista exacta de productos, variantes elegidas, total en pesos y datos de entrega. Además, queda guardado en tu menú "Ventas & Pedidos".
            </p>
          </details>

          <details className="group p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 transition-colors cursor-pointer">
            <summary className="font-semibold flex items-center justify-between text-slate-900 dark:text-white list-none">
              <span>¿Cómo modero o elimino las reseñas que dejan los clientes?</span>
              <ChevronDown className="w-4 h-4 opacity-50 group-open:rotate-180 transition-transform shrink-0 ml-2" />
            </summary>
            <p className="opacity-80 pt-2 text-xs leading-relaxed border-t border-[var(--color-borde)]/40 mt-2">
              Desde el menú lateral "Reseñas" verás todas las valoraciones recibidas. Cada tarjeta tiene un botón "Visible / Oculta" para pausar cualquier opinión con un solo clic, sin que aparezca en tu tienda pública.
            </p>
          </details>

          <details className="group p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 transition-colors cursor-pointer">
            <summary className="font-semibold flex items-center justify-between text-slate-900 dark:text-white list-none">
              <span>¿Puedo convertir a un cliente frecuente en colaborador de mi tienda?</span>
              <ChevronDown className="w-4 h-4 opacity-50 group-open:rotate-180 transition-transform shrink-0 ml-2" />
            </summary>
            <p className="opacity-80 pt-2 text-xs leading-relaxed border-t border-[var(--color-borde)]/40 mt-2">
              Sí. En el menú "Clientes & CRM", cada usuario tiene un botón "Hacer Colaborador". Al tocarlo, se le habilitan los permisos para ingresar al panel de administración de tu tienda y ayudarte con la carga de productos y pedidos.
            </p>
          </details>
        </div>
      </div>
    </div>
  )
}
