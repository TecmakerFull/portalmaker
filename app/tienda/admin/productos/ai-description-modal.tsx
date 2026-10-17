// =============================================================================
// PORTALMAKER — Modal Asistente de IA para Descripciones de Producto
// Genera descripciones comerciales y técnicas estructuradas sin emojis.
// =============================================================================

'use client'

import { useState } from 'react'
import {
  Sparkles,
  Wand2,
  Check,
  Copy,
  X,
  Loader2,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react'

interface AiDescriptionModalProps {
  initialProductName: string
  categoryName?: string
  onApply: (text: string, mode: 'replace' | 'append') => void
  onClose: () => void
}

export default function AiDescriptionModal({
  initialProductName,
  categoryName,
  onApply,
  onClose,
}: AiDescriptionModalProps) {
  const [productName, setProductName] = useState(initialProductName)
  const [promptDetails, setPromptDetails] = useState('')
  const [longitud, setLongitud] = useState<'concisa' | 'detallada'>('concisa')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [generatedText, setGeneratedText] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!productName.trim() && !promptDetails.trim()) {
      setErrorMsg('Ingresa al menos el nombre del producto o algunas características.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/ai/describe-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: productName.trim(),
          promptDetalles: promptDetails.trim(),
          categoria: categoryName,
          longitud,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo generar la descripción.')
      }

      setGeneratedText(data.descripcion)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al conectar con el asistente de IA.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedText) return
    try {
      await navigator.clipboard.writeText(generatedText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error al copiar:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] w-full max-w-xl rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 max-h-[95vh] overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--color-borde)]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Generar Descripción con IA</h3>
              <p className="text-xs opacity-70">
                Redacta un texto comercial y técnico optimizado para tu producto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensaje de error */}
        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Formulario de Prompt */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
              Título o Nombre del Producto
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
              placeholder="Ej: Soporte de Auriculares Gamer RGB"
              className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
              Características Clave / Prompt Mínimo
            </label>
            <textarea
              rows={3}
              value={promptDetails}
              onChange={(e) => setPromptDetails(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleGenerate()
                }
              }}
              placeholder="Ej: Fabricado en PLA de alta resistencia, base con goma antideslizante, encastre a presión, disponible en varios colores, ideal para escritorios de oficina o gaming..."
              className="w-full p-3 rounded-xl border border-[var(--color-input-borde)] bg-[var(--color-input-bg)] text-[var(--color-input-texto)] text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="text-[11px] opacity-60 mt-1">
              Ingresa materiales, medidas, compatibilidades o el uso principal del producto.
            </p>
          </div>

          {/* Selector de Longitud */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold opacity-75">Estilo y Extensión:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLongitud('concisa')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  longitud === 'concisa'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-600 dark:text-amber-400'
                    : 'border-[var(--color-borde)] opacity-70 hover:opacity-100'
                }`}
              >
                Concisa (90-140 palabras)
              </button>
              <button
                type="button"
                onClick={() => setLongitud('detallada')}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  longitud === 'detallada'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-600 dark:text-amber-400'
                    : 'border-[var(--color-borde)] opacity-70 hover:opacity-100'
                }`}
              >
                Detallada (180-240 palabras)
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleGenerate()}
            disabled={loading}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                <span>Generando con IA...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-slate-900" />
                <span>{generatedText ? 'Volver a generar' : 'Generar descripción'}</span>
              </>
            )}
          </button>
        </div>

        {/* Resultado Generado */}
        {generatedText && (
          <div className="space-y-3 pt-3 border-t border-[var(--color-borde)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                <span>Descripción generada</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copiado' : 'Copiar texto'}</span>
              </button>
            </div>

            <textarea
              rows={7}
              value={generatedText}
              onChange={(e) => setGeneratedText(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.03] text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            {/* Acciones para aplicar */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onApply(generatedText, 'append')
                  onClose()
                }}
                className="w-full sm:w-auto min-h-[40px] px-3.5 py-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold transition-colors cursor-pointer"
              >
                Insertar al final
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply(generatedText, 'replace')
                  onClose()
                }}
                className="w-full sm:w-auto min-h-[40px] px-4 py-1.5 rounded-xl bg-amber-400 text-slate-900 hover:bg-amber-500 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-slate-900" />
                <span>Aplicar a la ficha</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
