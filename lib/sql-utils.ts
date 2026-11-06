// =============================================================================
// PORTALMAKER — Utilidades para construir filtros SQL seguros vía PostgREST
// =============================================================================

/**
 * Escapa los comodines de LIKE/ILIKE (`%`, `_`) y la barra invertida.
 *
 * Por qué existe: usamos `.ilike('email', x)` para comparar emails sin
 * distinguir mayúsculas. Sin escapar, `_` coincide con cualquier carácter y `%`
 * con cualquier secuencia, de modo que un usuario registrado como
 * `juan_perez@dominio.com` coincidiría con `juan.perez@dominio.com` en
 * `platform_admins` o `store_collaborators` y heredaría sus permisos.
 * Postgres usa `\` como carácter de escape por defecto en LIKE.
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`)
}

/**
 * Normaliza un email (trim + minúsculas) y lo devuelve listo para `.ilike()`
 * como comparación exacta case-insensitive.
 */
export function emailIlikePattern(email: string): string {
  return escapeLikePattern(email.trim().toLowerCase())
}
