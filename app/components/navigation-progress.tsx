// =============================================================================
// PORTALMAKER — Barra de Progreso de Navegación Instantánea (Feedback 0ms)
// "El portal del Maker" | portalmaker.com.ar
//
// Brinda respuesta visual inmediata (0ms) a cada clic en enlaces y menús,
// eliminando la percepción de delay y evitando que los usuarios hagan doble clic.
// =============================================================================

'use client'

import { useEffect, useState, useTransition, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  // Cuando la ruta o los searchParams cambian efectivamente, completamos y ocultamos la barra
  useEffect(() => {
    if (isNavigating) {
      setProgress(100)
      const timer = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  // Interceptar clics en enlaces internos para arrancar la barra en 0ms
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignorar clics con teclas especiales (abrir en nueva pestaña, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) return

      const target = e.target as HTMLElement | null
      const link = target?.closest('a')
      if (!link) return

      const href = link.getAttribute('href')
      const targetAttr = link.getAttribute('target')

      // Ignorar links externos, anchors hash (#) o target="_blank"
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || targetAttr === '_blank') {
        return
      }

      // Comprobar si es un enlace interno de la app
      const isInternal = href.startsWith('/') || href.startsWith(window.location.origin)
      if (!isInternal) return

      // Evitar animar si es la misma URL exacta
      const currentUrl = window.location.pathname + window.location.search
      if (href === currentUrl || href === window.location.href) return

      // Iniciar feedback visual instantáneo
      setIsNavigating(true)
      setProgress(15)

      // Avance incremental simulado mientras carga el Server Component de Next.js
      const t1 = setTimeout(() => setProgress((p) => (p < 50 ? 45 : p)), 100)
      const t2 = setTimeout(() => setProgress((p) => (p < 80 ? 75 : p)), 350)
      const t3 = setTimeout(() => setProgress((p) => (p < 95 ? 90 : p)), 800)

      // Failsafe de 8s para no dejar la barra pegada si la navegación se cancela
      const failsafe = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 8000)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        clearTimeout(failsafe)
      }
    }

    document.addEventListener('click', handleDocumentClick, { capture: true })
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true })
    }
  }, [])

  if (!isNavigating && progress === 0) return null

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-amber-400 via-[var(--color-primario,#FACC15)] to-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.6)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: isNavigating ? 1 : 0,
        }}
      />
    </div>
  )
}

export default function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}
