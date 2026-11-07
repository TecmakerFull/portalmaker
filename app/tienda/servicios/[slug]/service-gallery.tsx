// =============================================================================
// PORTALMAKER — Galería de fotos de un servicio (tienda pública)
// Foto principal grande y miniaturas para cambiar de foto. Con una sola foto
// se muestra sin miniaturas.
// =============================================================================

'use client'

import { useState } from 'react'

export default function ServiceGallery({ imagenes, nombre }: { imagenes: string[]; nombre: string }) {
  const [actual, setActual] = useState(0)
  if (imagenes.length === 0) return null

  return (
    <div className="space-y-3">
      <img
        src={imagenes[actual]}
        alt={`${nombre} - foto ${actual + 1}`}
        className="w-full aspect-[4/3] object-cover rounded-2xl border border-black/10 dark:border-white/10"
      />
      {imagenes.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {imagenes.map((url, i) => (
            <li key={url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActual(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === actual}
                className={`block min-h-11 rounded-xl overflow-hidden border-2 cursor-pointer ${
                  i === actual ? 'border-[var(--color-primario)]' : 'border-transparent opacity-70 hover:opacity-100'
                }`}
              >
                <img src={url} alt="" className="w-16 h-16 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
