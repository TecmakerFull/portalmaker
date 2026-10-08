// =============================================================================
// PORTALMAKER — Toggle de Modo Claro / Oscuro Minimalista para Headers
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Leer el tema aplicado actualmente en el DOM por el script del <head>
    const currentTheme =
      (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ||
      (localStorage.getItem('portalmaker-theme') as 'light' | 'dark') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

    setTheme(currentTheme)
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    const current =
      (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ||
      theme ||
      'light'
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
      <div className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] opacity-50 ${className}`} />
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      aria-label="Alternar tema de color"
      className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.04] text-[var(--color-texto)] hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${className}`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-texto)] opacity-80" />
      ) : (
        <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
      )}
    </button>
  )
}
