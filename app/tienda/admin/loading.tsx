// =============================================================================
// PORTALMAKER — Skeleton de Carga Instantánea para el Panel de Administración
// Garantiza que la transición entre rutas de /tienda/admin/... sea inmediata
// mediante React Suspense de Next.js App Router, evitando bloqueos visuales.
// =============================================================================

export default function AdminLoading() {
  return (
    <div
      className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-pulse"
      aria-busy="true"
      aria-label="Cargando sección del panel"
    >
      {/* Cabecera Skeleton (alineada con AdminPageHeader) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--color-borde)]/60">
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 shrink-0" />
            <div className="h-7 w-48 sm:w-64 rounded-lg bg-black/5 dark:bg-white/10" />
          </div>
          <div className="h-4 w-72 sm:w-96 max-w-full rounded-md bg-black/5 dark:bg-white/5" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-black/5 dark:bg-white/10 shrink-0" />
      </div>

      {/* Tarjeta superior de resumen / configuración */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs space-y-4">
        <div className="h-5 w-44 rounded-md bg-black/5 dark:bg-white/10" />
        <div className="h-3.5 w-3/4 rounded-md bg-black/5 dark:bg-white/5" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="h-11 rounded-xl bg-black/5 dark:bg-white/5" />
          <div className="h-11 rounded-xl bg-black/5 dark:bg-white/5" />
          <div className="h-11 rounded-xl bg-black/5 dark:bg-white/10" />
        </div>
      </div>

      {/* Bloque principal de listado / formulario */}
      <div className="rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs divide-y divide-[var(--color-borde)] overflow-hidden">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="p-4 sm:p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/10 shrink-0" />
              <div className="space-y-2 flex-1 max-w-md">
                <div className="h-4 w-2/3 rounded-md bg-black/5 dark:bg-white/10" />
                <div className="h-3 w-1/2 rounded-md bg-black/5 dark:bg-white/5" />
              </div>
            </div>
            <div className="h-9 w-24 rounded-xl bg-black/5 dark:bg-white/5 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

