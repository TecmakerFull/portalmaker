// =============================================================================
// PORTALMAKER — Catálogos de la franja de confianza y medios de pago del footer
//
// Se comparten entre la tienda pública (server/client) y el editor del panel,
// para que lo que el dueño elige sea exactamente lo que ve el comprador.
// =============================================================================

import {
  Truck,
  RotateCcw,
  ShieldCheck,
  Headphones,
  CreditCard,
  Clock,
  Gift,
  BadgeCheck,
  MapPin,
  MessageCircle,
  Package,
  Heart,
  type LucideIcon,
} from 'lucide-react'
import type { Store, TrustBarItem } from '@/types/database'

/** Íconos disponibles para cada mensaje de confianza, con una etiqueta simple para el editor. */
export const TRUST_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  Truck: { icon: Truck, label: 'Envíos' },
  Package: { icon: Package, label: 'Paquete' },
  MapPin: { icon: MapPin, label: 'Retiro / Ubicación' },
  CreditCard: { icon: CreditCard, label: 'Pagos / Cuotas' },
  ShieldCheck: { icon: ShieldCheck, label: 'Seguridad' },
  BadgeCheck: { icon: BadgeCheck, label: 'Calidad / Garantía' },
  RotateCcw: { icon: RotateCcw, label: 'Cambios / Devoluciones' },
  Clock: { icon: Clock, label: 'Rapidez / Horarios' },
  Headphones: { icon: Headphones, label: 'Atención' },
  MessageCircle: { icon: MessageCircle, label: 'Consultas' },
  Gift: { icon: Gift, label: 'Regalos / Promos' },
  Heart: { icon: Heart, label: 'Hecho con amor' },
}

/** Devuelve el componente del ícono, con un ícono neutro si el nombre no existe. */
export function getTrustIcon(name: string | null | undefined): LucideIcon {
  return (name && TRUST_ICONS[name]?.icon) || BadgeCheck
}

/** Máximo de mensajes: con más de 4 la franja deja de leerse en mobile. */
export const MAX_TRUST_ITEMS = 4

/** Mensajes por defecto: los mismos que se mostraban fijos antes de ser editables. */
export const DEFAULT_TRUST_ITEMS: TrustBarItem[] = [
  { id: 'trust-1', icono: 'Truck', titulo: 'Envíos a todo el país', texto: 'Tu pedido, donde estés', activo: true },
  { id: 'trust-2', icono: 'RotateCcw', titulo: 'Devoluciones sencillas', texto: 'Comprá sin preocupaciones', activo: true },
  { id: 'trust-3', icono: 'ShieldCheck', titulo: 'Pago 100% seguro', texto: 'Tus datos, siempre protegidos', activo: true },
  { id: 'trust-4', icono: 'Headphones', titulo: 'Atención personalizada', texto: 'Estamos para ayudarte', activo: true },
]

/** Medios de pago que se pueden mostrar en el pie de página. */
export const MEDIOS_PAGO_FOOTER: Array<{ id: string; label: string }> = [
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex', label: 'American Express' },
  { id: 'naranja', label: 'Naranja X' },
  { id: 'cabal', label: 'Cabal' },
  { id: 'debito', label: 'Tarjeta de débito' },
]

/**
 * Medios de pago sugeridos según lo que la tienda tiene activo.
 * Por qué: antes el footer mostraba siempre "VISA" y "Mastercard", aunque la
 * tienda no aceptara tarjetas. Las tarjetas solo se sugieren si Mercado Pago
 * está conectado (es el medio por el que se cobran).
 */
export function getAutoMediosPago(store: Pick<Store, 'transferencia_activa' | 'mp_connected'>): string[] {
  const ids: string[] = []
  if (store.transferencia_activa) ids.push('transferencia')
  ids.push('efectivo')
  if (store.mp_connected) ids.push('mercadopago', 'visa', 'mastercard')
  return ids
}

/** Resuelve los ids guardados (o automáticos) a etiquetas visibles, respetando el orden del catálogo. */
export function resolveMediosPago(
  mediosGuardados: string[] | null | undefined,
  store: Pick<Store, 'transferencia_activa' | 'mp_connected'>
): string[] {
  const ids = Array.isArray(mediosGuardados) ? mediosGuardados : getAutoMediosPago(store)
  return MEDIOS_PAGO_FOOTER.filter((m) => ids.includes(m.id)).map((m) => m.label)
}
