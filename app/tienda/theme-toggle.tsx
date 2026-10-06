// =============================================================================
// PORTALMAKER — Toggle de Modo Claro / Oscuro para la Tienda Pública y Portal
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Leer el tema aplicado actualmente en el DOM por el script del <head>
    const currentTheme = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ||
      (localStorage.getItem('portalmaker-theme') as 'light' | 'dark') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    
    setTheme(currentTheme)
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    // Detectar el estado actual del DOM en el instante del clic
    const current = (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || theme || 'light'
    const next: 'light' | 'dark' = current === 'dark' ? 'light' : 'dark'

    document.documentElement.setAttribute('data-theme', next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('portalmaker-theme', next)
    setTheme(next)
  }

  // Prevenir desajuste visual antes del montaje
  if (!mounted) {
    return (
      <div className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/10 opacity-50" />
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      aria-label="Alternar tema de color"
      className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-xl border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/10 text-[var(--color-texto)] hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-[var(--color-primario)]" />
      ) : (
        <Sun className="w-5 h-5 text-[var(--color-primario)]" />
      )}
    </button>
  )
}

