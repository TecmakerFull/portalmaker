// =============================================================================
// PORTALMAKER — Selector de fecha con el estilo de la plataforma
//
// Reemplaza a <input type="date">, cuyo calendario lo dibuja el navegador con sus
// propios colores (claro en tema oscuro, tamaños chicos en el celular). Este:
//   - respeta el tema claro y oscuro
//   - tiene celdas de 44px, cómodas para el dedo
//   - la semana empieza el lunes y los textos están en español
//   - admite fecha mínima y máxima (los días fuera de rango se ven apagados)
// El valor es "YYYY-MM-DD", igual que el input nativo, así se cambia sin tocar el resto.
// =============================================================================

'use client'

import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do']

const pad = (n: number) => String(n).padStart(2, '0')
const aTexto = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const partir = (v: string): [number, number, number] | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? [Number(m[1]), Number(m[2]) - 1, Number(m[3])] : null
}

interface Props {
  value: string
  onChange: (valor: string) => void
  min?: string
  max?: string
  id?: string
  'aria-label'?: string
  disabled?: boolean
  className?: string
  placeholder?: string
}

export default function DatePicker({ value, onChange, min, max, id, disabled, className = '', placeholder = 'Elegir fecha', ...resto }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [abierto, setAbierto] = useState(false)
  const inicial = partir(value) ?? partir(min ?? '') ?? (() => { const h = new Date(); return [h.getFullYear(), h.getMonth(), h.getDate()] as [number, number, number] })()
  const [vista, setVista] = useState({ y: inicial[0], m: inicial[1] })
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number } | null>(null)

  const hoyTexto = (() => { const h = new Date(); return aTexto(h.getFullYear(), h.getMonth(), h.getDate()) })()

  const abrir = () => {
    if (disabled) return
    const sel = partir(value)
    if (sel) setVista({ y: sel[0], m: sel[1] })
    const rect = contenedor.current?.getBoundingClientRect()
    if (rect) {
      const alto = 400
      const abajo = window.innerHeight - rect.bottom
      const arriba = abajo < alto && rect.top > abajo
      // La ventana mide ~300px de ancho: se alinea para que no se salga de la pantalla
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 308))
      setPos(arriba ? { bottom: window.innerHeight - rect.top + 4, left } : { top: rect.bottom + 4, left })
    }
    setAbierto(true)
  }

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false)
    }
    const cerrarPorScroll = (e: Event) => {
      if (contenedor.current?.contains(e.target as Node)) return
      setAbierto(false)
    }
    const cerrar = () => setAbierto(false)
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('touchstart', fuera)
    document.addEventListener('keydown', tecla)
    window.addEventListener('scroll', cerrarPorScroll, true)
    window.addEventListener('resize', cerrar)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('touchstart', fuera)
      document.removeEventListener('keydown', tecla)
      window.removeEventListener('scroll', cerrarPorScroll, true)
      window.removeEventListener('resize', cerrar)
    }
  }, [abierto])

  const mover = (delta: number) =>
    setVista((v) => {
      const total = v.y * 12 + v.m + delta
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 }
    })

  // Celdas del mes: huecos hasta el lunes y luego los días
  const primero = new Date(vista.y, vista.m, 1).getDay() // 0 = domingo
  const huecos = (primero + 6) % 7
  const diasDelMes = new Date(vista.y, vista.m + 1, 0).getDate()

  const sel = partir(value)
  const etiqueta = sel ? `${pad(sel[2])}/${pad(sel[1] + 1)}/${sel[0]}` : ''

  return (
    <div ref={contenedor} className="relative min-w-[9.5rem]">
      <button
        type="button"
        id={id}
        aria-label={resto['aria-label']}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        disabled={disabled}
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        className={`w-full min-h-11 px-3 rounded-xl border border-[var(--color-input-borde,var(--color-borde))] bg-[var(--color-input-bg,var(--color-fondo))] text-[var(--color-input-texto,var(--color-texto))] text-base sm:text-sm text-left flex items-center justify-between gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <span className={etiqueta ? '' : 'opacity-60'}>{etiqueta || placeholder}</span>
        <CalendarDays className="w-4 h-4 shrink-0 opacity-60" />
      </button>

      {abierto && pos && (
        <div
          role="dialog"
          aria-label="Calendario"
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: 300 }}
          className="z-[100] rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] text-[var(--color-texto)] shadow-xl p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior" className="min-h-11 min-w-11 rounded-xl inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="text-sm font-semibold capitalize">{MESES[vista.m]} {vista.y}</p>
            <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente" className="min-h-11 min-w-11 rounded-xl inline-flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase opacity-60 mb-1">
            {DIAS.map((d) => <span key={d}>{d}</span>)}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: huecos }).map((_, i) => <span key={`h${i}`} />)}
            {Array.from({ length: diasDelMes }, (_, i) => i + 1).map((d) => {
              const texto = aTexto(vista.y, vista.m, d)
              const fuera = Boolean((min && texto < min) || (max && texto > max))
              const elegido = texto === value
              return (
                <button
                  key={d}
                  type="button"
                  disabled={fuera}
                  onClick={() => {
                    onChange(texto)
                    setAbierto(false)
                  }}
                  className={`h-10 w-full rounded-lg text-sm flex items-center justify-center transition-colors ${
                    elegido
                      ? 'bg-[#FACC15] text-[#1F2937] font-semibold'
                      : fuera
                        ? 'opacity-30 cursor-not-allowed'
                        : `cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 ${texto === hoyTexto ? 'ring-1 ring-[#FACC15] font-semibold' : ''}`
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>

          <div className="flex justify-end mt-2">
            <button
              type="button"
              disabled={Boolean((min && hoyTexto < min) || (max && hoyTexto > max))}
              onClick={() => {
                onChange(hoyTexto)
                setAbierto(false)
              }}
              className="min-h-11 px-3 rounded-xl text-xs font-semibold text-[#CA8A04] dark:text-[#FACC15] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer disabled:opacity-40"
            >
              Hoy
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
