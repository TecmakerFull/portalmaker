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
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/tienda/admin')

  // En el panel de administración (/tienda/admin) no renderizamos ni el carrito ni el WhatsApp flotante
  if (isAdmin) {
    return <>{children}</>
  }

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
