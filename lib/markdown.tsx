// =============================================================================
// PORTALMAKER — Renderizador Liviano y Seguro de Markdown para Descripciones
// "El portal del Maker" | portalmaker.com.ar
// =============================================================================

import React from 'react'

/**
 * Convierte texto enriquecido Markdown a componentes React seguros y estilizados.
 * Soporta:
 *  - Negritas: **texto**
 *  - Cursivas: *texto*
 *  - Enlaces: [texto](url)
 *  - Encabezados: #, ##, ###
 *  - Listas de viñetas: - o *
 *  - Saltos de línea y párrafos múltiples
 */
export function renderMarkdown(content: string): React.ReactNode {
  if (!content) return null

  // Dividir por bloques de párrafos (dos o más saltos de línea)
  const blocks = content.split(/\n\s*\n/)

  return blocks.map((block, blockIdx) => {
    const trimmed = block.trim()
    if (!trimmed) return null

    // 1. Encabezado H3 (###)
    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={blockIdx} className="text-sm sm:text-base font-bold text-[var(--color-texto)] mt-4 mb-1">
          {renderInline(trimmed.replace(/^###\s+/, ''))}
        </h4>
      )
    }

    // 2. Encabezado H2 (##)
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={blockIdx} className="text-base sm:text-lg font-bold text-[var(--color-texto)] mt-4 mb-1.5">
          {renderInline(trimmed.replace(/^##\s+/, ''))}
        </h3>
      )
    }

    // 3. Encabezado H1 (#)
    if (trimmed.startsWith('# ')) {
      return (
        <h2 key={blockIdx} className="text-lg sm:text-xl font-bold text-[var(--color-texto)] mt-5 mb-2">
          {renderInline(trimmed.replace(/^#\s+/, ''))}
        </h2>
      )
    }

    // 4. Listas de viñetas
    const lines = trimmed.split('\n')
    const isList = lines.every((line) => /^\s*[-*•]\s+/.test(line))
    if (isList) {
      return (
        <ul key={blockIdx} className="list-disc pl-5 space-y-1.5 text-sm leading-relaxed opacity-90 my-2.5">
          {lines.map((line, lineIdx) => (
            <li key={lineIdx}>
              {renderInline(line.replace(/^\s*[-*•]\s+/, ''))}
            </li>
          ))}
        </ul>
      )
    }

    // 5. Párrafo regular con saltos de línea individuales (\n)
    return (
      <p key={blockIdx} className="text-sm leading-relaxed opacity-85 my-2">
        {lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {renderInline(line)}
            {lineIdx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    )
  })
}

/**
 * Renderiza formato en línea: **negrita**, *cursiva*, [enlace](url)
 */
function renderInline(text: string): React.ReactNode {
  // Regex que busca tokens de formato
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g
  const parts = text.split(tokenRegex)

  return parts.map((part, i) => {
    if (!part) return null

    // Negrita: **texto**
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={i} className="font-bold text-[var(--color-texto)] opacity-100">
          {part.slice(2, -2)}
        </strong>
      )
    }

    // Cursiva: *texto*
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      return (
        <em key={i} className="italic opacity-90">
          {part.slice(1, -1)}
        </em>
      )
    }

    // Enlace: [texto](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-primario)] underline hover:opacity-80 transition-opacity"
        >
          {linkMatch[1]}
        </a>
      )
    }

    return part
  })
}
