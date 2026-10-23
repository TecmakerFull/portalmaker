// =============================================================================
// PORTALMAKER — Wrapper de Cliente para Carrito de Tienda y WhatsApp Flotante
// =============================================================================

'use client'

import { usePathname } from 'next/navigation'
import { CartProvider } from '@/lib/cart-context'
import CartDrawer from './cart-drawer'
import FloatingWhatsApp from './floating-whatsapp'

export default function CartProviderClient({
  storeId,
  storeName,
  whatsappNumero,
  checkoutActivo = true,
  tenantQuery,
  showFloatingWhatsapp = true,
  children,
}: {
  storeId: string
  storeName: string
  whatsappNumero?: string | null
  checkoutActivo?: boolean
  tenantQuery: string
  showFloatingWhatsapp?: boolean
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/tienda/admin')

  return (
    <CartProvider storeId={storeId}>
      {children}
      {!isAdmin && (
        <CartDrawer
          storeName={storeName}
          whatsappNumero={whatsappNumero}
          checkoutActivo={checkoutActivo}
          tenantQuery={tenantQuery}
        />
      )}
      {!isAdmin && showFloatingWhatsapp && (
        <FloatingWhatsApp phone={whatsappNumero} storeName={storeName} />
      )}
    </CartProvider>
  )
}
