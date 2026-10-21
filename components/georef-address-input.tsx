// =============================================================================
// PORTALMAKER — Input de Dirección con Autocompletado en Tiempo Real (Georef AR)
// Propone direcciones y ubicaciones oficiales de Argentina a medida que el usuario escribe.
// Utilizable tanto en el panel del taller (admin) como en el checkout del comprador.
// =============================================================================

'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, Check, Building2, Sparkles, X } from 'lucide-react'
import { consultarDireccionesGeoref, type GeorefSugerencia } from '@/lib/georef'

export interface SelectedGeorefAddress {
  calle: string
  altura: string
  localidad: string
  provincia: string
  codigoPostal?: string
}

interface GeorefAddressInputProps {
  value: string
  onChange: (value: string) => void
  altura?: string
  provincia?: string
  localidad?: string
  onSelectAddress: (data: SelectedGeorefAddress) => void
  placeholder?: string
  className?: string
  required?: boolean
  maxLength?: number
  id?: string
  name?: string
}

export default function GeorefAddressInput({
  value,
  onChange,
  altura = '',
  provincia = '',
  localidad = '',
  onSelectAddress,
  placeholder = 'Ej: Lamadrid',
  className,
  required = false,
  maxLength = 120,
  id,
  name,
}: GeorefAddressInputProps) {
  const [sugerencias, setSugerencias] = useState<GeorefSugerencia[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [hasSelected, setHasSelected] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Cerrar al hacer clic afuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Búsqueda con debounce a medida que el usuario tipea
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    const query = value.trim()

    // Si ya seleccionó una sugerencia o el texto es muy corto (<3 letras), no buscar
    if (hasSelected || query.length < 3) {
      setSugerencias([])
      setIsOpen(false)
      setLoading(false)
      return
    }

    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const resultados = await consultarDireccionesGeoref({
          calle: query,
          altura,
          provincia,
          localidad,
          max: 5,
        })
        setSugerencias(resultados)
        setIsOpen(resultados.length > 0)
      } catch {
        setSugerencias([])
        setIsOpen(false)
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, altura, provincia, localidad, hasSelected])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasSelected(false)
    onChange(e.target.value)
  }

  const handleSelect = (sug: GeorefSugerencia) => {
    setHasSelected(true)
    setIsOpen(false)
    setSugerencias([])

    onSelectAddress({
      calle: sug.calle,
      altura: sug.altura || altura,
      localidad: sug.localidad,
      provincia: sug.provincia,
      codigoPostal: sug.codigoPostalAproximado || undefined,
    })
  }

  const defaultInputClass =
    'w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-sm focus:outline-hidden focus:ring-2 focus:ring-[#FACC15] transition-all'

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          id={id}
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (sugerencias.length > 0 && !hasSelected) {
              setIsOpen(true)
            }
          }}
          placeholder={placeholder}
          className={`${className || defaultInputClass} pr-10`}
          maxLength={maxLength}
          required={required}
          autoComplete="off"
        />

        {/* Indicador de carga o validación a la derecha del input */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-amber-500 opacity-80" />}
          {hasSelected && !loading && (
            <span
              className="text-emerald-600 dark:text-emerald-400"
              title="Dirección normalizada por Georef AR (IGN)"
            >
              <Check className="w-4 h-4" />
            </span>
          )}
        </div>
      </div>

      {/* Dropdown flotante de sugerencias en tiempo real */}
      {isOpen && sugerencias.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 p-1.5 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[11px] font-semibold opacity-60 flex items-center justify-between border-b border-[var(--color-borde)] pb-1.5 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Sugerencias oficiales (Georef AR):</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="hover:opacity-100 p-0.5 cursor-pointer"
              aria-label="Cerrar sugerencias"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1 max-h-60 overflow-y-auto">
            {sugerencias.map((sug, idx) => (
              <button
                key={`${sug.nomenclatura}-${idx}`}
                type="button"
                onClick={() => handleSelect(sug)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-start gap-2.5 cursor-pointer group"
              >
                <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-[var(--color-texto)] truncate">
                    {sug.calle} {sug.altura}
                  </div>
                  <div className="text-[11px] opacity-70 flex items-center gap-1.5 flex-wrap mt-0.5">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 opacity-60" />
                      <span>{sug.localidad}</span>
                    </span>
                    <span>•</span>
                    <span>{sug.provincia}</span>
                    {sug.codigoPostalAproximado && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          CP: {sug.codigoPostalAproximado}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
