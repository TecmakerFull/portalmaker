// =============================================================================
// PORTALMAKER — Contexto de Dispositivo Simulado en Vista Previa
// Permite que los componentes del Storefront sepan si se están simulando en
// Mobile (375px), Tablet (768px) o Desktop (1024px) independientemente de la pantalla real.
// =============================================================================

'use client'

import React, { createContext, useContext } from 'react'

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile' | null

export const PreviewDeviceContext = createContext<PreviewDevice>(null)

export function usePreviewDevice(): PreviewDevice {
  return useContext(PreviewDeviceContext)
}
