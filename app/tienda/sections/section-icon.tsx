// =============================================================================
// PORTALMAKER — Mapeador Dinámico de Iconos SVG de lucide-react para Secciones
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

'use client'

import React from 'react'
import {
  Truck,
  Camera,
  MessageSquare,
  Clock,
  ShieldCheck,
  Tag,
  CreditCard,
  Store,
  Sparkles,
  Package,
  Wrench,
  Heart,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Flame,
  Star,
  Gift,
  CheckCircle,
  Info,
  Layers,
  ShoppingBag,
} from 'lucide-react'

export const AVAILABLE_SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck,
  Instagram: Camera,
  Camera,
  MessageSquare,
  Clock,
  ShieldCheck,
  Tag,
  CreditCard,
  Store,
  Sparkles,
  Package,
  Wrench,
  Heart,
  HelpCircle,
  Phone,
  Mail,
  MapPin,
  Flame,
  Star,
  Gift,
  CheckCircle,
  Info,
  Layers,
  ShoppingBag,
}

export default function SectionIcon({
  name,
  className = 'w-4 h-4',
}: {
  name?: string | null
  className?: string
}) {
  if (!name) return null
  const IconComponent = AVAILABLE_SECTION_ICONS[name]
  if (!IconComponent) return null
  return <IconComponent className={className} />
}
