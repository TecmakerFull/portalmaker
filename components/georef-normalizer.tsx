// =============================================================================
// PORTALMAKER — Asistente de Normalización de Direcciones con Georef AR (IGN)
// Utilizable tanto en el panel del taller (admin) como en el checkout del cliente.
// =============================================================================

'use client'

import { useState } from 'react'
import {
  Sparkles,
  Loader2,
  Check,
  MapPin,
  X,
  AlertCircle,
  Building2,
  ChevronRight,
} from 'lucide-react'
import {
  consultarDireccionesGeoref,
  type GeorefSugerencia,
} from '@/lib/georef'

export interface NormalizedAddressData {
  calle: string
  altura: string
  localidad: string
  provincia: string
  codigoPostal?: string
}

interface GeorefNormalizerProps {
  calle: string
  altura?: string
  localidad?: string
  provincia?: string
  onSelectAddress: (data: NormalizedAddressData) => void
  label?: string
  buttonClassName?: string
}

export default function GeorefNormalizer({
  calle,
  altura = '',
  localidad = '',
  provincia = '',
  onSelectAddress,
  label = 'Normalizar con Georef',
  buttonClassName,
}: GeorefNormalizerProps) {
  const [loading, setLoading] = useState(false)
  const [sugerencias, setSugerencias] = useState<GeorefSugerencia[] | null>(null)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'info' | 'error'; texto: string } | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleBuscar = async () => {
    if (!calle.trim()) {
      setMensaje({
        tipo: 'info',
        texto: 'Por favor, ingresá al menos el nombre de la calle para buscar en Georef.',
      })
      return
    }

    setLoading(true)
    setMensaje(null)
    setSugerencias(null)
    setIsOpen(true)

    try {
      const resultados = await consultarDireccionesGeoref({
        calle,
        altura,
        localidad,
        provincia,
        max: 5,
      })

      if (resultados.length === 0) {
        setMensaje({
          tipo: 'info',
          texto:
            'No encontramos coincidencias oficiales exactas en la base nacional. Podés continuar con la dirección ingresada manualmente.',
        })
        setSugerencias([])
      } else {
        setSugerencias(resultados)
      }
    } catch {
      setMensaje({
        tipo: 'error',
        texto: 'Hubo un inconveniente al consultar el servicio oficial de Georef.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (sug: GeorefSugerencia) => {
    onSelectAddress({
      calle: sug.calle,
      altura: sug.altura || altura,
      localidad: sug.localidad,
      provincia: sug.provincia,
      codigoPostal: sug.codigoPostalAproximado || undefined,
    })

    setMensaje({
      tipo: 'ok',
      texto: `Dirección normalizada por Georef: ${sug.nomenclatura}`,
    })
    setIsOpen(false)
    setSugerencias(null)
  }

  const defaultBtnClass =
    'min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold text-[var(--color-texto)] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-98'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleBuscar}
          disabled={loading || !calle.trim()}
          className={buttonClassName || defaultBtnClass}
          title="Verificar y normalizar calle, altura, localidad y provincia con el Instituto Geográfico Nacional"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500 shrink-0" />
              <span>Consultando Georef...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{label}</span>
            </>
          )}
        </button>

        <span className="text-[11px] opacity-60">
          Servicio oficial de datos abiertos (IGN Argentina)
        </span>
      </div>

      {/* Mensaje de estado rápido */}
      {mensaje && (
        <div
          className={`p-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-all ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
              : mensaje.tipo === 'error'
              ? 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {mensaje.tipo === 'ok' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            )}
            <span>{mensaje.texto}</span>
          </div>
          <button
            type="button"
            onClick={() => setMensaje(null)}
            className="p-1 hover:opacity-75 cursor-pointer text-xs"
            aria-label="Cerrar mensaje"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Lista de sugerencias oficiales encontradas */}
      {isOpen && sugerencias && sugerencias.length > 0 && (
        <div className="p-3 sm:p-4 rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] space-y-2.5 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--color-borde)]">
            <span className="text-xs font-semibold text-[var(--color-texto)] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>Sugerencias oficiales de Georef AR (Elegí la correcta):</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-xs opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="Cerrar lista de sugerencias"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {sugerencias.map((sug, idx) => (
              <button
                key={`${sug.nomenclatura}-${idx}`}
                type="button"
                onClick={() => handleSelect(sug)}
                className="w-full text-left p-3 rounded-xl border border-[var(--color-borde)] hover:border-amber-400/60 hover:bg-amber-500/5 transition-all flex items-center justify-between gap-3 cursor-pointer group"
              >
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-semibold text-[var(--color-texto)] group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                    {sug.calle} {sug.altura}
                  </div>
                  <div className="text-[11px] opacity-70 flex items-center gap-2 mt-0.5 flex-wrap">
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

                <div className="flex items-center gap-1 text-xs font-medium opacity-60 group-hover:opacity-100 group-hover:text-amber-500 shrink-0">
                  <span className="hidden sm:inline">Seleccionar</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
