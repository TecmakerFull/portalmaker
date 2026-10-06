// =============================================================================
// PORTALMAKER — Sincronizador del Tema por Defecto de la Tienda
// =============================================================================

'use client'

import { useEffect } from 'react'

export default function StoreThemeSync({
  defaultTheme,
}: {
  defaultTheme?: string | null
}) {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('portalmaker-theme')
      if (!saved) {
        const themeToApply =
          defaultTheme === 'sistema'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : defaultTheme === 'oscuro'
            ? 'dark'
            : 'light'

        document.documentElement.setAttribute('data-theme', themeToApply)
        if (themeToApply === 'dark') {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      }
    } catch (e) {
      // Ignorar error si localStorage no está disponible
    }
  }, [defaultTheme])

  return null
}
