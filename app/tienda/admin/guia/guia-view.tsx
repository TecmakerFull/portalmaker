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
  Truck,
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
  BookOpen,
} from 'lucide-react'
import { AdminPageHeader } from '../components/admin-page-header'
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
          desc: 'Crea carpetas claras según tu negocio o rubro. Portalmaker se adapta a todo tipo de tiendas: desde indumentaria, calzado y accesorios, hasta deco del hogar, impresión 3D, repuestos o bazar.',
        },
        {
          sub: 'Subcategorías opcionales',
          desc: 'Si tienes variedad de artículos, puedes crear divisiones adentro (por ejemplo: dentro de "Indumentaria", crear "Remeras", "Buzos"; o dentro de "Filamentos", crear "PLA", "PETG").',
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
          desc: 'Ponle el nombre general del producto (ej: "Remera Oversize de Algodón", "Lámpara Luna 3D", "Zapatillas Urbanas" o "Taza Cerámica"). No le pongas solo el color o talle aquí.',
        },
        {
          sub: 'B. Las Variantes (Los colores, talles, materiales o modelos)',
          desc: 'Si tu producto tiene opciones, agrega una variante por cada una: "Negro / Talle M", "Blanco / Talle L", "Azul Marino", "Madera Natural". Cada una lleva su stock individual, precio propio si varía y foto asignada.',
        },
        {
          sub: 'C. Fotos Generales vs. Fotos de Variante',
          desc: 'En el producto puedes subir hasta 10 fotos generales (ángulos, medidas, empaque). Y a cada variante le asignas 1 foto principal para que cuando el cliente toque la opción, la foto cambie automáticamente.',
        },
        {
          sub: 'D. Subida Fácil y Rápida',
          desc: 'Puedes arrastrar archivos desde tu PC/celular o simplemente pegar imágenes con Ctrl + V. Todo se convierte a WebP liviano de forma automática.',
        },
        {
          sub: 'E. Stock Inmediato vs. Fabricación a Pedido / Sin Stock',
          desc: 'Si tienes piezas listas, activa "Gestiona stock" e ingresa la cantidad para habilitar la compra directa. Si trabajas a pedido o un producto se queda sin stock, la tienda no detiene tus ventas: le muestra al comprador tus condiciones y tiempo estimado de entrega/fabricación (ej: "Elaboración en 3 a 5 días hábiles") con el botón para consultar disponibilidad por WhatsApp.',
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
      title: 'Sobre Nosotros (Tu historia y propuesta)',
      tag: 'Genera confianza',
      icon: HelpCircle,
      color: 'from-cyan-500/20 to-cyan-500/5 text-cyan-600 dark:text-cyan-400 border-cyan-400/30',
      href: `/tienda/admin/sobre-nosotros${tenantQuery}`,
      buttonText: 'Editar Sobre Nosotros',
      summary: 'Cuéntales a tus visitantes quién está detrás de los productos.',
      details: [
        {
          sub: 'Tu presentación',
          desc: 'Escribe de qué ciudad eres, a qué te dedicas, cómo elaboras o seleccionas tus productos y qué te apasiona de tu emprendimiento o negocio.',
        },
        {
          sub: 'Foto de tu espacio o equipo',
          desc: 'Una foto real de tu espacio de trabajo, de tu equipo o de tus productos terminados genera muchísima confianza y cercanía en los compradores.',
        },
      ],
    },
    {
      num: 6,
      category: 'tienda' as const,
      title: 'Cobros: Mercado Pago y Transferencias',
      tag: 'Cómo entra tu dinero',
      icon: CreditCard,
      color: 'from-[#009EE3]/20 to-[#009EE3]/5 text-[#009EE3] border-[#009EE3]/30',
      href: `/tienda/admin/pagos${tenantQuery}`,
      buttonText: 'Configurar Mercado Pago y Cobros',
      summary: 'Cobrá online con tarjetas en 1 solo clic o recibí transferencias directas a tu Alias.',
      details: [
        {
          sub: '1. Mercado Pago en 1 solo clic',
          desc: 'Entrá a la sección de Cobros y tocá el botón azul "Conectar con Mercado Pago". Iniciás sesión con tu cuenta y listo. Tus clientes ya pueden pagarte con tarjeta de crédito en cuotas, débito o dinero en cuenta.',
        },
        {
          sub: '2. ¿A dónde va el dinero y cuál es la comisión?',
          desc: 'La plata entra directo a tu propia cuenta de Mercado Pago en el acto. Portalmaker únicamente retiene una comisión mínima del 2% por cada venta exitosa (el 98% restante es todo tuyo).',
        },
        {
          sub: '3. Recargo opcional al comprador',
          desc: 'Si querés compensar el costo de operar con tarjetas, podés fijar un recargo porcentual al cliente (ej: 10%). Si dejás 0%, el comprador paga el precio regular del producto.',
        },
        {
          sub: '4. Aviso inmediato por Email con botón a WhatsApp',
          desc: 'Apenas un cliente te paga, recibís un email al instante con sus datos (nombre, teléfono y dirección) y un botón directo para escribirle por WhatsApp y decirle que su paquete ya está en preparación.',
        },
        {
          sub: '5. Transferencia Bancaria clásica (Alias / CBU)',
          desc: 'Si además querés recibir transferencias bancarias directas, activá la opción de Transferencia, cargá tu Alias o CBU y el cliente te adjuntará el comprobante.',
        },
      ],
    },
    {
      num: 7,
      category: 'tienda' as const,
      title: 'Envíos a Todo el País con Zipnova (Multicourier)',
      tag: 'Andreani, Correo Argentino y OCA',
      icon: Truck,
      color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-400/30',
      href: `/tienda/admin/envios${tenantQuery}`,
      buttonText: 'Configurar Envíos y Tarifas',
      summary: 'Cotizaciones automáticas, etiquetas listas para imprimir en 1 clic y seguimiento unificado para el cliente.',
      details: [
        {
          sub: '1. ¿Qué es Zipnova y cómo trabaja?',
          desc: 'No es una empresa de fletes propia, sino un agregador logístico inteligente (puente tecnológico) que conecta Portalmaker con Andreani, Correo Argentino, OCA y mensajerías Flex. Al activarlo, accedes a tarifas corporativas mayoristas sin necesidad de abrir cuentas individuales en cada correo ni comprometer mínimos de envío mensuales.',
        },
        {
          sub: '2. Vinculación en 3 minutos',
          desc: 'Creá tu cuenta en zipnova.com.ar, andá a Configuración > Integraciones, hacé clic en "Gestionar Credenciales y Webhooks" dentro de API personalizadas, copiá tu API Key y API Secret, y pegalos en la sección Envíos de tu panel. Portalmaker verifica la conexión en el acto.',
        },
        {
          sub: '3. El paso a paso diario para despachar un pedido',
          desc: '1) Recepción: el cliente paga y la orden entra con la dirección cargada. 2) Imprimir etiqueta: desde el panel de Ventas tocás "Imprimir Etiqueta PDF". 3) Embalar: pegás la guía en el paquete. 4) Despacho: dejás el paquete en cualquier sucursal de Andreani o Correo Argentino (Drop-off) sin hacer fila porque ya está pago y rotulado, o solicitás retiro por tu taller (Pick-up) si tu zona lo habilita.',
        },
        {
          sub: '4. Preguntas Frecuentes y Dudas Habituales',
          desc: '¿Quién paga el envío? El comprador lo abona en el checkout al momento de pagar. ¿Cómo rastrea el cliente el paquete? Recibe un email con el número de guía y el link de seguimiento oficial. ¿Y si quieren retirar en mi taller? Podés mantener activa la opción "Retiro en local" sin costo adicional.',
        },
      ],
    },
    {
      num: 8,
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
      num: 9,
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
      num: 10,
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
          desc: 'Cada usuario que inicia sesión en tu tienda para guardar productos en favoritos o consultar queda registrado automáticamente con su fecha de último ingreso.',
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
      num: 11,
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
          desc: 'Cualquier visitante registrado en tu tienda puede calificar productos con 1 a 5 estrellas y escribir su experiencia en la pestaña de opiniones.',
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
      num: 12,
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
    {
      num: 13,
      category: 'avanzado' as const,
      title: 'Vincular tu Dominio Propio (.com.ar / .ar)',
      tag: 'Identidad y presencia oficial',
      icon: Globe,
      color: 'from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-400/30',
      href: `/tienda/admin/dominio${tenantQuery}`,
      buttonText: 'Configurar Dominio Propio',
      summary: 'Conecta tu dominio propio (.com.ar o .ar) mediante delegación en NIC.ar o registros A y CNAME en Cloudflare / DonWeb.',
      details: [
        {
          sub: 'Opción 1: Delegar directo en NIC.ar (La más fácil)',
          desc: 'En nic.ar pulsa "Delegar" y pega: Servidor 1: ns1.vercel-dns.com y Servidor 2: ns2.vercel-dns.com.',
        },
        {
          sub: 'Opción 2: Usar registros A y CNAME (Cloudflare / DonWeb)',
          desc: 'Crea un Registro A con nombre @ apuntando a 76.76.21.21 y un Registro CNAME con nombre www apuntando a cname.vercel-dns.com.',
        },
        {
          sub: 'Propagación y Candado SSL Gratis',
          desc: 'La propagación demora entre 2 y 12 horas. Una vez propagado, el certificado de seguridad HTTPS se activa automáticamente sin costo.',
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
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-12">
      {/* Encabezado Principal */}
      <AdminPageHeader
        title="Guía Paso a Paso"
        description="Aprende a configurar tu vidriera, gestionar pedidos, invitar colaboradores, moderar reseñas y potenciar tu taller."
        icon={BookOpen}
      />

      {/* Tarjeta de Acceso y Link de la Tienda con Botón de Copiar */}
      <div className="bg-[var(--color-superficie)] p-5 sm:p-6 rounded-3xl border border-[var(--color-borde)] shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Globe className="w-4 h-4 text-amber-500" />
          <span>Enlace público de tu tienda:</span>
        </div>

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
          <span>Dudas Frecuentes sobre tu Tienda (Haz clic para ver la respuesta)</span>
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
