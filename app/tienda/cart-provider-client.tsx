// =============================================================================
// PORTALMAKER — Wrapper de Cliente para Carrito de Tienda y WhatsApp Flotante
// =============================================================================

'use client'

import { CartProvider } from '@/lib/cart-context'
import CartDrawer from './cart-drawer'
import FloatingWhatsApp from './floating-whatsapp'

export default function CartProviderClient({
  storeId,
  storeName,
  whatsappNumero,
  tenantQuery,
  showFloatingWhatsapp = true,
  children,
}: {
  storeId: string
  storeName: string
  whatsappNumero?: string | null
  tenantQuery: string
  showFloatingWhatsapp?: boolean
  children: React.ReactNode
}) {
  return (
    <CartProvider storeId={storeId}>
      {children}
      <CartDrawer storeName={storeName} tenantQuery={tenantQuery} />
      {showFloatingWhatsapp && (
        <FloatingWhatsApp phone={whatsappNumero} storeName={storeName} />
      )}
    </CartProvider>
  )
}
