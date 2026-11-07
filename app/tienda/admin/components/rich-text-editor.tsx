// =============================================================================
// PORTALMAKER — Editor de texto con formato (descripciones largas)
//
// Barra de herramientas simple sobre un cuadro de texto: el formato se guarda
// como Markdown y se muestra con lib/markdown.tsx. Pensado para dueños que no
// saben de código: botones con nombre claro, de 44px, y una vista previa para
// ver cómo va a quedar en la tienda.
// =============================================================================

'use client'

import { useRef, useState } from 'react'
import { renderMarkdown } from '@/lib/markdown'
import { Bold, Italic, Heading2, List, ListOrdered, Link as LinkIcon, Eye, Pencil } from 'lucide-react'

interface Props {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  maxLength?: number
  rows?: number
  placeholder?: string
}

export default function RichTextEditor({ id, label, value, onChange, maxLength = 5000, rows = 10, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [vistaPrevia, setVistaPrevia] = useState(false)

  /** Envuelve lo seleccionado (o un texto de ejemplo) con un prefijo y un sufijo. */
  const envolver = (prefijo: string, sufijo: string, ejemplo: string) => {
    const area = ref.current
    if (!area) return
    const ini = area.selectionStart
    const fin = area.selectionEnd
    const seleccion = value.substring(ini, fin) || ejemplo
    const nuevo = value.substring(0, ini) + prefijo + seleccion + sufijo + value.substring(fin)
    if (nuevo.length > maxLength) return
    onChange(nuevo)
    setTimeout(() => {
      area.focus()
      area.setSelectionRange(ini + prefijo.length, ini + prefijo.length + seleccion.length)
    }, 10)
  }

  /** Aplica un prefijo al comienzo de cada renglón seleccionado (viñetas y listas). */
  const porRenglon = (prefijo: (indice: number) => string, ejemplo: string) => {
    const area = ref.current
    if (!area) return
    const ini = area.selectionStart
    const fin = area.selectionEnd
    // Se extiende la selección a renglones completos
    const inicioRenglon = value.lastIndexOf('\n', ini - 1) + 1
    const finRenglon = value.indexOf('\n', fin) === -1 ? value.length : value.indexOf('\n', fin)
    const bloque = value.substring(inicioRenglon, finRenglon) || ejemplo
    const convertido = bloque
      .split('\n')
      .map((renglon, i) => prefijo(i) + renglon.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
      .join('\n')
    const nuevo = value.substring(0, inicioRenglon) + convertido + value.substring(finRenglon)
    if (nuevo.length > maxLength) return
    onChange(nuevo)
    setTimeout(() => area.focus(), 10)
  }

  const insertarEnlace = () => {
    const url = prompt('Pegá la dirección del enlace (empieza con https://):')
    if (!url) return
    envolver('[', `](${url.trim()})`, 'texto del enlace')
  }

  const boton =
    'min-h-11 min-w-11 px-2.5 rounded-lg border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-40'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold opacity-75 block">{label}</label>
        <span className="text-[11px] opacity-50">{value.length}/{maxLength}</span>
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[var(--color-fondo)] border border-[var(--color-borde)]">
        <button type="button" disabled={vistaPrevia} onClick={() => envolver('**', '**', 'texto en negrita')} className={boton} title="Negrita" aria-label="Negrita">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" disabled={vistaPrevia} onClick={() => envolver('*', '*', 'texto en cursiva')} className={boton} title="Cursiva" aria-label="Cursiva">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" disabled={vistaPrevia} onClick={() => porRenglon(() => '## ', 'Subtítulo')} className={boton} title="Título de sección" aria-label="Título de sección">
          <Heading2 className="w-4 h-4" />
          <span className="hidden sm:inline">Título</span>
        </button>
        <button type="button" disabled={vistaPrevia} onClick={() => porRenglon(() => '- ', 'Elemento de la lista')} className={boton} title="Lista con viñetas" aria-label="Lista con viñetas">
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">Viñetas</span>
        </button>
        <button type="button" disabled={vistaPrevia} onClick={() => porRenglon((i) => `${i + 1}. `, 'Primer paso')} className={boton} title="Lista numerada" aria-label="Lista numerada">
          <ListOrdered className="w-4 h-4" />
          <span className="hidden sm:inline">Pasos</span>
        </button>
        <button type="button" disabled={vistaPrevia} onClick={insertarEnlace} className={boton} title="Enlace" aria-label="Enlace">
          <LinkIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setVistaPrevia((v) => !v)}
          className={`${boton} ml-auto ${vistaPrevia ? 'border-[#FACC15] bg-[#FACC15]/15' : ''}`}
          aria-pressed={vistaPrevia}
        >
          {vistaPrevia ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span>{vistaPrevia ? 'Seguir editando' : 'Ver cómo queda'}</span>
        </button>
      </div>

      {vistaPrevia ? (
        <div className="min-h-56 p-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)]">
          {value.trim() ? renderMarkdown(value) : <p className="text-sm opacity-60">Todavía no escribiste nada.</p>}
        </div>
      ) : (
        <textarea
          id={id}
          ref={ref}
          rows={rows}
          maxLength={maxLength}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-56 px-3 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-base sm:text-sm leading-relaxed resize-y"
        />
      )}
      <p className="text-[11px] opacity-60">Seleccioná un texto y tocá un botón para darle formato. Con &quot;Ver cómo queda&quot; ves el resultado final.</p>
    </div>
  )
}
