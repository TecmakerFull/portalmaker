// =============================================================================
// PORTALMAKER — <Select> con la API del <select> nativo y el estilo de la plataforma
//
// Sirve para migrar pantallas existentes sin reescribirlas: se escribe igual que
// un <select> (value, onChange(e), <option>, <optgroup>), pero se dibuja con
// StyledSelect, que respeta el tema claro/oscuro y tiene opciones de 44px.
//
// Diferencias a tener presentes:
//   - onChange recibe un objeto con target.value / currentTarget.value (string).
//   - className solo conserva lo que afecta el ancho/posición: el aspecto lo pone
//     StyledSelect, para que todas las listas se vean igual.
//   - Con `name` agrega un campo oculto, así sigue funcionando dentro de un <form>.
// En pantallas nuevas conviene usar StyledSelect directamente.
// =============================================================================

'use client'

import { Children, Fragment, isValidElement, useMemo, useState, type ReactNode } from 'react'
import StyledSelect, { type SelectOption } from './styled-select'

type Evento = { target: { value: string; name?: string }; currentTarget: { value: string; name?: string } }

interface Props {
  value?: string | number | null
  defaultValue?: string | number
  onChange?: (e: any) => void
  children?: ReactNode
  id?: string
  name?: string
  required?: boolean
  disabled?: boolean
  title?: string
  className?: string
  style?: React.CSSProperties
  'aria-label'?: string
}

// Texto plano de los hijos de un <option>
function textoDe(nodo: ReactNode): string {
  if (nodo === null || nodo === undefined || typeof nodo === 'boolean') return ''
  if (typeof nodo === 'string' || typeof nodo === 'number') return String(nodo)
  if (Array.isArray(nodo)) return nodo.map(textoDe).join('')
  if (isValidElement(nodo)) return textoDe((nodo.props as { children?: ReactNode }).children)
  return ''
}

// Recorre los hijos (arrays, fragmentos, optgroup) y arma la lista de opciones
function leerOpciones(hijos: ReactNode, grupo?: string, acc: SelectOption[] = []): SelectOption[] {
  Children.forEach(hijos, (hijo) => {
    if (!isValidElement(hijo)) return
    const props = hijo.props as { value?: string | number; disabled?: boolean; label?: string; children?: ReactNode }
    if (hijo.type === Fragment) {
      leerOpciones(props.children, grupo, acc)
    } else if (hijo.type === 'optgroup') {
      leerOpciones(props.children, props.label, acc)
    } else if (hijo.type === 'option') {
      const etiqueta = textoDe(props.children)
      acc.push({ value: String(props.value ?? etiqueta), label: etiqueta, group: grupo, disabled: props.disabled })
    }
  })
  return acc
}

// Solo se conservan las clases de tamaño y posición del <select> original
const CLASES_DE_LAYOUT = /^(w-|min-w-|max-w-|flex-|shrink|grow|basis-|col-span|self-|sm:w-|md:w-|lg:w-|sm:max-w-|md:max-w-|sm:min-w-|md:min-w-)/

export default function Select({ value, defaultValue, onChange, children, name, className = '', ...resto }: Props) {
  const controlado = value !== undefined
  const [interno, setInterno] = useState(String(defaultValue ?? ''))
  const actual = controlado ? String(value ?? '') : interno
  const opciones = useMemo(() => leerOpciones(children), [children])

  const claseLayout = className
    .split(/\s+/)
    .filter((c) => CLASES_DE_LAYOUT.test(c))
    .join(' ')

  const alElegir = (v: string) => {
    if (!controlado) setInterno(v)
    const e: Evento = { target: { value: v, name }, currentTarget: { value: v, name } }
    onChange?.(e)
  }

  return (
    <div className={claseLayout || undefined}>
      <StyledSelect value={actual} onChange={alElegir} options={opciones} placeholder="Seleccionar" {...resto} />
      {name && <input type="hidden" name={name} value={actual} />}
    </div>
  )
}
