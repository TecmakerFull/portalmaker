// =============================================================================
// PORTALMAKER — Desplegable con el estilo de la plataforma
//
// Reemplaza al <select> del navegador, cuya lista se dibuja con los colores
// del sistema operativo (resalte celeste, fondo blanco en tema oscuro) y no
// combina con nada. Esta versión:
//   - respeta el tema claro y oscuro de la tienda o del portal
//   - tiene opciones de 44px, cómodas en el celular
//   - admite grupos (como <optgroup>) y se maneja con el teclado
//   - se abre hacia arriba si abajo no hay lugar
//   - mantiene la validación nativa de "campo obligatorio"
// =============================================================================

'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface SelectOption<T extends string | number = string> {
  value: T
  label: string
  /** Opciones con el mismo grupo se muestran juntas bajo un título. */
  group?: string
  /** Ícono opcional que se muestra a la izquierda del texto (en la lista y en el botón). */
  icon?: React.ReactNode
  disabled?: boolean
}

interface Props<T extends string | number> {
  value: T | ''
  onChange: (valor: T) => void
  options: SelectOption<T>[]
  id?: string
  placeholder?: string
  'aria-label'?: string
  required?: boolean
  disabled?: boolean
  /** Clases extra para el botón (por ejemplo, para cambiar colores del portal). */
  className?: string
  /** Estilos en línea del botón (por ejemplo, mostrar cada opción en su propia tipografía). */
  style?: React.CSSProperties
}

export default function StyledSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  id,
  placeholder = 'Elegí una opción',
  required,
  disabled,
  className = '',
  style,
  ...resto
}: Props<T>) {
  const idAuto = useId()
  const listaId = `${id ?? idAuto}-lista`
  const contenedor = useRef<HTMLDivElement>(null)
  const [abierto, setAbierto] = useState(false)
  // La lista se posiciona con coordenadas de pantalla (fixed) para que no la recorten
  // tablas con scroll ni ventanas modales con overflow.
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number; maxH: number } | null>(null)
  const [activo, setActivo] = useState(-1)

  const seleccionable = useMemo(() => options.filter((o) => !o.disabled), [options])
  const elegida = options.find((o) => o.value === value)

  // Grupos en el orden en que aparecen; las opciones sin grupo van primero.
  const grupos = useMemo(() => {
    const mapa = new Map<string, SelectOption<T>[]>()
    for (const o of options) {
      const g = o.group ?? ''
      mapa.set(g, [...(mapa.get(g) ?? []), o])
    }
    return Array.from(mapa.entries())
  }, [options])

  const abrir = () => {
    if (disabled) return
    // Se abre hacia arriba si abajo hay poco lugar y arriba hay más
    const rect = contenedor.current?.getBoundingClientRect()
    if (rect) {
      const abajo = window.innerHeight - rect.bottom
      const arriba = abajo < 280 && rect.top > abajo
      setPos(
        arriba
          ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, maxH: Math.min(256, rect.top - 12) }
          : { top: rect.bottom + 4, left: rect.left, width: rect.width, maxH: Math.min(256, abajo - 12) }
      )
    }
    setActivo(Math.max(0, seleccionable.findIndex((o) => o.value === value)))
    setAbierto(true)
  }

  const elegir = (o: SelectOption<T>) => {
    if (o.disabled) return
    onChange(o.value)
    setAbierto(false)
  }

  // Cerrar al tocar fuera
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false)
    }
    // Con posición fija, la lista no acompaña un scroll de la página: se cierra
    const cerrarPorScroll = (e: Event) => {
      if (contenedor.current?.contains(e.target as Node)) return
      setAbierto(false)
    }
    const cerrar = () => setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('touchstart', fuera)
    window.addEventListener('scroll', cerrarPorScroll, true)
    window.addEventListener('resize', cerrar)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('touchstart', fuera)
      window.removeEventListener('scroll', cerrarPorScroll, true)
      window.removeEventListener('resize', cerrar)
    }
  }, [abierto])

  // Mantener visible la opción activa al moverse con el teclado
  useEffect(() => {
    if (!abierto) return
    contenedor.current?.querySelector(`[data-indice="${activo}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [activo, abierto])

  const alTeclear = (e: React.KeyboardEvent) => {
    if (disabled) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!abierto) abrir()
        else setActivo((i) => Math.min(seleccionable.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!abierto) abrir()
        else setActivo((i) => Math.max(0, i - 1))
        break
      case 'Home':
        if (abierto) {
          e.preventDefault()
          setActivo(0)
        }
        break
      case 'End':
        if (abierto) {
          e.preventDefault()
          setActivo(seleccionable.length - 1)
        }
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!abierto) abrir()
        else if (seleccionable[activo]) elegir(seleccionable[activo])
        break
      case 'Escape':
        if (abierto) {
          e.preventDefault()
          setAbierto(false)
        }
        break
      case 'Tab':
        setAbierto(false)
        break
    }
  }

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={abierto}
        aria-haspopup="listbox"
        aria-controls={listaId}
        aria-label={resto['aria-label']}
        disabled={disabled}
        style={style}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        onKeyDown={alTeclear}
        className={`w-full min-h-11 px-3 rounded-xl border border-[var(--color-input-borde,var(--color-borde))] bg-[var(--color-input-bg,var(--color-fondo))] text-[var(--color-input-texto,var(--color-texto))] text-base sm:text-sm text-left flex items-center justify-between gap-2 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span className={`flex items-center gap-2 min-w-0 ${elegida ? '' : 'opacity-60'}`}>
          {elegida?.icon}
          <span className="truncate">{elegida ? elegida.label : placeholder}</span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 opacity-60 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {/* Campo oculto: conserva la validación nativa de "obligatorio" en los formularios */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required
          value={value === '' ? '' : String(value)}
          onChange={() => {}}
          className="absolute inset-x-0 bottom-0 h-0 w-full opacity-0 pointer-events-none"
        />
      )}

      {abierto && pos && (
        <ul
          id={listaId}
          role="listbox"
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, maxHeight: pos.maxH }}
          className="z-[100] overflow-auto rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xl py-1"
        >
          {grupos.map(([grupo, items]) => (
            <li key={grupo || 'sin-grupo'} role="presentation">
              {grupo && (
                <p className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider opacity-60">{grupo}</p>
              )}
              <ul role="presentation">
                {items.map((o) => {
                  const indice = seleccionable.indexOf(o)
                  const esActiva = indice === activo
                  const esElegida = o.value === value
                  return (
                    <li
                      key={String(o.value)}
                      role="option"
                      aria-selected={esElegida}
                      aria-disabled={o.disabled}
                      data-indice={indice}
                      onMouseEnter={() => !o.disabled && setActivo(indice)}
                      onClick={() => elegir(o)}
                      className={`min-h-11 px-3 py-2 flex items-center justify-between gap-2 text-base sm:text-sm cursor-pointer ${
                        o.disabled ? 'opacity-40 cursor-not-allowed' : esActiva ? 'bg-[#FACC15]/20' : ''
                      } ${esElegida ? 'font-semibold' : ''}`}
                    >
                      <span className="flex items-center gap-2">
                        {o.icon}
                        <span>{o.label}</span>
                      </span>
                      {esElegida && <Check className="w-4 h-4 shrink-0 text-[#CA8A04] dark:text-[#FACC15]" />}
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
