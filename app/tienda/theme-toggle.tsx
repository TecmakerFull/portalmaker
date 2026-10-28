// =============================================================================
// PORTALMAKER — Toggle de Modo Claro / Oscuro Minimalista para Headers
// =============================================================================

'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const pathname = usePathname()
  const isAdmin = pathname?.startsWith('/tienda/admin')
  const storageKey = isAdmin ? 'portalmaker-admin-theme' : 'portalmaker-theme'

  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Detectar el tema real aplicado en el DOM o almacenamiento local
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark' ||
      localStorage.getItem(storageKey) === 'dark' ||
      localStorage.getItem('portalmaker-theme') === 'dark'

    setTheme(isDark ? 'dark' : 'light')
    setMounted(true)
  }, [storageKey])

  const toggleTheme = () => {
    // Inspección en tiempo real del estado actual del documento
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark'
    const next: 'light' | 'dark' = isDark ? 'light' : 'dark'

    document.documentElement.setAttribute('data-theme', next)
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }

    try {
      localStorage.setItem(storageKey, next)
      localStorage.setItem('portalmaker-theme', next)
      localStorage.setItem('portalmaker-admin-theme', next)
    } catch (e) {
      // Ignorar si localStorage está deshabilitado
    }

    setTheme(next)
  }

  // Prevenir desajuste visual antes del montaje
  if (!mounted) {
    return (
      <div className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl opacity-50 ${className}`} />
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'light' ? 'Activar modo oscuro' : 'Activar modo claro'}
      aria-label="Alternar tema de color"
      className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-xl text-[var(--color-texto)] hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95 ${className}`}
    >
      {theme === 'light' ? (
        <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--color-texto)] opacity-80" />
      ) : (
        <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF5500]" />
      )}
    </button>
  )
}
