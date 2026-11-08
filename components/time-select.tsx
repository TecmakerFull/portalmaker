// =============================================================================
// PORTALMAKER — Selector de hora con el estilo de la plataforma
//
// Reemplaza a <input type="time"> (el reloj del navegador no respeta el tema y es
// incómodo en el celular). Ofrece horas cada 15 minutos; si el valor actual no cae
// en esa grilla (por ejemplo 09:10 cargado antes), se agrega para no perderlo.
// El valor es "HH:MM", igual que el input nativo.
// =============================================================================

'use client'

import { useMemo } from 'react'
import StyledSelect from './styled-select'

const PASO_MINUTOS = 15

export default function TimeSelect({
  value,
  onChange,
  ...resto
}: {
  value: string
  onChange: (valor: string) => void
  id?: string
  'aria-label'?: string
  disabled?: boolean
  className?: string
}) {
  const opciones = useMemo(() => {
    const lista: string[] = []
    for (let m = 0; m < 24 * 60; m += PASO_MINUTOS) {
      lista.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
    }
    if (value && !lista.includes(value)) lista.push(value)
    return lista.sort().map((h) => ({ value: h, label: h }))
  }, [value])

  return (
    <div className="w-[6.5rem] shrink-0">
      <StyledSelect value={value} onChange={onChange} options={opciones} {...resto} />
    </div>
  )
}
