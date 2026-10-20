// =============================================================================
// PORTALMAKER — Consulta de Sucursales de Punto de Retiro (Fase 4)
// "El portal del Maker" | portalmaker.com.ar
//
// Permite al comprador elegir una sucursal del carrier cuando selecciona
// la modalidad 'sucursal' durante el checkout.
// =============================================================================

import { NextResponse } from 'next/server'
import { getStoreShippingProvider } from '@/lib/shipping/registry'
import type { ShippingProviderType } from '@/lib/shipping/types'

export const maxDuration = 30

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const storeId = searchParams.get('storeId')
    const providerName = (searchParams.get('provider') || 'zipnova') as ShippingProviderType
    const codigoPostal = searchParams.get('codigoPostal') || searchParams.get('cp') || ''
    const provincia = searchParams.get('provincia') || ''

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es obligatorio' }, { status: 400 })
    }

    const provider = await getStoreShippingProvider(storeId, providerName)
    if (!provider || typeof provider.listBranches !== 'function') {
      return NextResponse.json({ success: true, branches: [] })
    }

    const branches = await provider.listBranches({
      cp: codigoPostal,
      provincia,
    })

    return NextResponse.json({
      success: true,
      branches: branches || [],
    })
  } catch (err: any) {
    console.error('Error al consultar sucursales:', err)
    return NextResponse.json({ error: 'No se pudieron consultar las sucursales' }, { status: 500 })
  }
}
