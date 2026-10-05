// =============================================================================
// PORTALMAKER — Toggle de Modo Claro / Oscuro para la Tienda Pública
// =============================================================================

'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('portalmaker-theme') as 'light' | 'dark' | null
    if (saved) {
      setTheme(saved)
      document.documentElement.setAttribute('data-theme', saved)
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('portalmaker-theme', next)
  }

  if (!mounted) {
    return <div className="w-10 h-10" />
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
