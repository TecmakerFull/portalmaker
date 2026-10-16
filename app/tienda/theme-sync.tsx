// =============================================================================
// PORTALMAKER — Sincronizador del Tema e Ícono de Pestaña de la Tienda
// =============================================================================

'use client'

import { useEffect } from 'react'

export default function StoreThemeSync({
  defaultTheme,
  faviconUrl,
}: {
  defaultTheme?: string | null
  faviconUrl?: string | null
}) {
  // 1. Sincronizar tema claro / oscuro de la tienda
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

  // 2. Sincronizar ícono de la pestaña del navegador con el logo de la tienda
  useEffect(() => {
    if (!faviconUrl) return

    try {
      // Reemplazar o actualizar todos los links de ícono existentes para forzar al navegador
      const existingIcons = document.querySelectorAll("link[rel*='icon']")
      existingIcons.forEach((el) => {
        el.setAttribute('href', faviconUrl)
      })

      // Asegurar un link principal con rel="icon"
      let primaryIcon = document.querySelector("link[rel='icon']") as HTMLLinkElement | null
      if (!primaryIcon) {
        primaryIcon = document.createElement('link')
        primaryIcon.rel = 'icon'
        document.head.appendChild(primaryIcon)
      }
      primaryIcon.href = faviconUrl

      // Asegurar shortcut icon para navegadores basados en Chromium
      let shortcutIcon = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement | null
      if (!shortcutIcon) {
        shortcutIcon = document.createElement('link')
        shortcutIcon.rel = 'shortcut icon'
        document.head.appendChild(shortcutIcon)
      }
      shortcutIcon.href = faviconUrl
    } catch (err) {
      console.warn('Error actualizando favicon dinámico de la tienda:', err)
    }
  }, [faviconUrl])

  return null
}
