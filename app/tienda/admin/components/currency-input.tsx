// =============================================================================
// PORTALMAKER — Campo de precio en pesos
//
// Muestra el monto como moneda mientras se escribe: "$ 50.000" o "$ 12.500,50".
// Guarda el valor sin formato en el estado ("50000" o "12500,50"), así se
// convierte a número con un solo paso al guardar. Teclado numérico en el celular.
// =============================================================================

'use client'

interface Props {
  id: string
  /** Valor sin formato: dígitos y, opcionalmente, una coma con hasta 2 decimales. */
  value: string
  onChange: (valor: string) => void
  placeholder?: string
  'aria-label'?: string
}

/** "50000" -> "50.000"; "12500,5" -> "12.500,5". */
export function formatearMonto(valor: string): string {
  if (!valor) return ''
  const [entero, decimales] = valor.split(',')
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimales !== undefined ? `${conPuntos},${decimales}` : conPuntos
}

/** Deja solo dígitos y una coma decimal con hasta 2 decimales. */
function limpiar(texto: string): string {
  // Se aceptan punto o coma como separador decimal al tipear, pero el punto que
  // agrega el formato (miles) se descarta cuando hay más de tres dígitos después.
  let t = texto.replace(/[^\d,]/g, '')
  const i = t.indexOf(',')
  if (i !== -1) t = t.slice(0, i + 1) + t.slice(i + 1).replace(/,/g, '').slice(0, 2)
  const [entero, decimales] = t.split(',')
  const sinCeros = entero.replace(/^0+(?=\d)/, '').slice(0, 9)
  return decimales !== undefined ? `${sinCeros},${decimales}` : sinCeros
}

export default function CurrencyInput({ id, value, onChange, placeholder = '0', ...resto }: Props) {
  return (
    <div className="relative w-full sm:max-w-[240px]">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold opacity-60 pointer-events-none" aria-hidden="true">
        $
      </span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={formatearMonto(value)}
        onChange={(e) => onChange(limpiar(e.target.value))}
        placeholder={placeholder}
        aria-label={resto['aria-label']}
        className="w-full min-h-11 pl-7 pr-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-[var(--color-texto)] text-base sm:text-sm font-semibold"
      />
    </div>
  )
}
