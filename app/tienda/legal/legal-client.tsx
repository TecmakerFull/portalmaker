// =============================================================================
// PORTALMAKER — Vista Interactiva de Información Legal (Client Component)
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import { useState } from 'react'
import type { Store } from '@/types/database'

interface LegalClientProps {
  store: Store
  initialTab?: string
}

export default function LegalClient({ store, initialTab = 'terms' }: LegalClientProps) {
  const [tab, setTab] = useState<'privacy' | 'terms' | 'cookies'>(
    initialTab === 'privacy' ? 'privacy' : initialTab === 'cookies' ? 'cookies' : 'terms'
  )

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="eyebrow text-[var(--color-primario)]">INFORMACIÓN LEGAL</p>
        <h1 className="text-3xl sm:text-4xl font-medium font-[var(--font-heading)] mt-2 text-[var(--color-texto)]">
          {tab === 'privacy'
            ? 'Política de privacidad'
            : tab === 'cookies'
            ? 'Política de cookies'
            : 'Términos y condiciones'}
        </h1>
        <p className="mt-2 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
          Políticas comerciales, protección de datos y condiciones de compra en {store.nombre}.
        </p>
      </div>

      {/* Selector de Pestañas */}
      <div className="flex gap-4 sm:gap-6 border-b border-black/10 dark:border-white/10 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab('terms')}
          className={`pb-3.5 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer whitespace-nowrap ${
            tab === 'terms'
              ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          Términos y condiciones
        </button>
        <button
          type="button"
          onClick={() => setTab('privacy')}
          className={`pb-3.5 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer whitespace-nowrap ${
            tab === 'privacy'
              ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          Política de privacidad
        </button>
        <button
          type="button"
          onClick={() => setTab('cookies')}
          className={`pb-3.5 text-xs sm:text-sm font-semibold transition-all relative cursor-pointer whitespace-nowrap ${
            tab === 'cookies'
              ? 'text-[var(--color-primario-legible)] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[var(--color-primario-legible)]'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          Cookies
        </button>
      </div>

      {/* Contenido según pestaña */}
      <div className="space-y-6 text-xs sm:text-sm leading-relaxed opacity-75 font-[var(--font-body)]">
        {tab === 'terms' && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)] opacity-100">
              1. Condiciones Generales de Compra y Encargos
            </h2>
            <p>
              Todos los pedidos, reservas y compras realizadas en la tienda online de {store.nombre} quedan sujetos a confirmación y disponibilidad de materiales de fabricación.
            </p>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)] opacity-100">
              2. Precios y Formas de Pago
            </h2>
            <p>
              Los precios se encuentran expresados en moneda de curso legal (o la moneda especificada en catálogo). Las transferencias bancarias directas deberán acreditarse para dar inicio al despacho o preparación de la pieza.
            </p>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)] opacity-100">
              3. Envíos y Tiempos de Fabricación
            </h2>
            <p>
              Las piezas producidas bajo pedido o personalizadas cuentan con plazos estimados de fabricación acordados directamente con el cliente antes de la entrega o despacho.
            </p>
          </div>
        )}

        {tab === 'privacy' && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)] opacity-100">
              Tratamiento y Protección de Datos Personales
            </h2>
            <p>
              Los datos facilitados en los formularios de contacto, checkout o consultas por WhatsApp son utilizados exclusivamente por {store.nombre} con el propósito de coordinar pedidos, presupuestos y comunicación sobre sus encargos.
            </p>
            <p>
              No compartimos ni comercializamos tu información personal con terceros.
            </p>
          </div>
        )}

        {tab === 'cookies' && (
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)] opacity-100">
              Uso de Cookies y Almacenamiento Local
            </h2>
            <p>
              Esta tienda utiliza almacenamiento local en tu navegador exclusivamente para recordar tus preferencias de tema visual (claro/oscuro), tu lista de favoritos y los productos añadidos a tu carrito de compras durante la sesión.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
