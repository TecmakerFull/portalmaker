// =============================================================================
// PORTALMAKER — Barra Flotante Sticky de Guardado Estandarizada
// Proporciona acceso inmediato a la acción de guardar en menús largos sin scrollear.
// =============================================================================

'use client'

import React from 'react'
import { Loader2, Check, AlertCircle, RotateCcw, Save } from 'lucide-react'

export interface StickySaveBarProps {
  /** Si la barra está visible. Por defecto true */
  show?: boolean
  /** Estado de carga durante el guardado */
  loading?: boolean
  /** Si hay cambios pendientes no guardados */
  hasChanges?: boolean
  /** Mensaje contextual a la izquierda (ej: 'Tienes cambios sin guardar') */
  message?: string
  /** Texto del botón principal */
  saveText?: string
  /** Texto mientras se guarda */
  savingText?: string
  /** Mensaje de éxito tras guardar */
  successMsg?: string | null
  /** Mensaje de error en caso de fallo */
  errorMsg?: string | null
  /** Callback opcional de guardado (si no se especifica, funciona como type="submit") */
  onSave?: () => void | Promise<void>
  /** Callback opcional para descartar cambios o resetear el formulario */
  onDiscard?: () => void
  /** Texto del botón descartar */
  discardText?: string
  /** Deshabilitar el botón de guardar */
  disabled?: boolean
  /** Clases CSS adicionales para el contenedor */
  className?: string
}

export function StickySaveBar({
  show = true,
  loading = false,
  hasChanges = false,
  message,
  saveText = 'Guardar cambios',
  savingText = 'Guardando...',
  successMsg = null,
  errorMsg = null,
  onSave,
  onDiscard,
  discardText = 'Descartar',
  disabled = false,
  className = '',
}: StickySaveBarProps) {
  if (!show) return null

  return (
    <aside
      aria-label="Barra de acciones flotante"
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-3xl bg-zinc-950/95 dark:bg-zinc-900/95 text-zinc-100 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)] p-3 sm:px-5 flex flex-col sm:flex-row items-center justify-between gap-3 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${className}`}
    >
      {/* Información de Estado / Cambios pendientes a la izquierda */}
      <div className="flex items-center gap-2.5 min-w-0 w-full sm:w-auto">
        {successMsg ? (
          <div className="flex items-center gap-2 text-emerald-400 text-xs sm:text-sm font-medium">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="truncate">{successMsg}</span>
          </div>
        ) : errorMsg ? (
          <div className="flex items-center gap-2 text-rose-400 text-xs sm:text-sm font-medium">
            <div className="w-5 h-5 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <span className="truncate">{errorMsg}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-300">
            {hasChanges ? (
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
            ) : (
              <Save className="w-4 h-4 text-zinc-400 shrink-0" />
            )}
            <span className="font-medium text-zinc-200 truncate">
              {message || (hasChanges ? 'Tienes cambios sin guardar' : 'Configuración de tienda')}
            </span>
          </div>
        )}
      </div>

      {/* Botones de Acción a la derecha */}
      <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto shrink-0">
        {onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            disabled={loading || disabled}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-white/5 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{discardText}</span>
          </button>
        )}

        <button
          type={onSave ? 'button' : 'submit'}
          onClick={onSave ? () => onSave() : undefined}
          disabled={loading || disabled}
          className="min-h-[44px] px-5 sm:px-6 py-2 rounded-xl bg-[#FACC15] text-[#1F2937] font-semibold text-xs sm:text-sm hover:bg-[#eab308] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50 shrink-0 w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
              <span>{savingText}</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 text-[#1F2937]" />
              <span>{saveText}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
