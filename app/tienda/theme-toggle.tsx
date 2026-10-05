// =============================================================================
// PORTALMAKER — Toggle de Modo Claro / Oscuro para la Tienda Pública
// =============================================================================

'use client'

import { useSyncExternalStore } from 'react'
import { Sun, Moon } from 'lucide-react'

function getThemeSnapshot(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  const saved = localStorage.getItem('portalmaker-theme') as 'light' | 'dark' | null
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getServerSnapshot(): 'light' | 'dark' {
  return 'light'
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener('storage', callback)
  return () => window.removeEventListener('storage', callback)
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerSnapshot)

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('portalmaker-theme', next)
    window.dispatchEvent(new Event('storage'))
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
