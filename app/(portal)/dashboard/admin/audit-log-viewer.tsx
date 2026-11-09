'use client'

import { useState, useEffect } from 'react'
import { History, RotateCcw, Filter, Loader2, Store, Layers } from 'lucide-react'

interface AuditLogItem {
  id: string
  target_type: 'plan' | 'store'
  target_id: string
  variable_name: string
  old_value: string | null
  new_value: string | null
  changed_by_email: string | null
  created_at: string
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const url =
        filterType === 'all'
          ? '/api/admin/audit-log?limit=50'
          : `/api/admin/audit-log?target_type=${filterType}&limit=50`
      const res = await fetch(url)
      const json = await res.json()
      if (json.logs) {
        setLogs(json.logs)
      }
    } catch {
      // Ignorar error
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [filterType])

  return (
    <div className="bg-[var(--color-superficie)] border border-[var(--color-borde)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--color-borde)]">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-[#FF5500]" />
          <div>
            <h3 className="font-bold text-sm sm:text-base">Registro de Auditoría de Configuración</h3>
            <p className="text-xs opacity-65">
              Trazabilidad completa de modificaciones en planes y overrides de tiendas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-[var(--color-borde)] text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-800 font-bold shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('plan')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === 'plan'
                  ? 'bg-white dark:bg-slate-800 font-bold shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Planes
            </button>
            <button
              type="button"
              onClick={() => setFilterType('store')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterType === 'store'
                  ? 'bg-white dark:bg-slate-800 font-bold shadow-xs'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Tiendas
            </button>
          </div>

          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="min-h-[38px] px-3 rounded-xl border border-[var(--color-borde)] text-xs font-semibold flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF5500]" />
          <span className="text-xs opacity-70">Cargando eventos de auditoría...</span>
        </div>
      ) : logs.length === 0 ? (
        <p className="text-xs opacity-60 py-6 text-center">
          No hay eventos de auditoría registrados para el filtro seleccionado.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-borde)] opacity-60">
                <th className="py-2.5 pr-3">Tipo</th>
                <th className="py-2.5 pr-3">Objetivo</th>
                <th className="py-2.5 pr-3">Variable</th>
                <th className="py-2.5 pr-3">Valor Anterior</th>
                <th className="py-2.5 pr-3">Nuevo Valor</th>
                <th className="py-2.5 pr-3">Modificado por</th>
                <th className="py-2.5">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-borde)]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <td className="py-2.5 pr-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.target_type === 'plan'
                          ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {log.target_type === 'plan' ? (
                        <>
                          <Layers className="w-3 h-3" />
                          <span>Plan</span>
                        </>
                      ) : (
                        <>
                          <Store className="w-3 h-3" />
                          <span>Tienda</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-semibold font-mono text-[11px]">
                    {log.target_id}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-[#FF5500]">
                    {log.variable_name}
                  </td>
                  <td className="py-2.5 pr-3 text-rose-600 dark:text-rose-400 font-mono">
                    {log.old_value ?? 'null'}
                  </td>
                  <td className="py-2.5 pr-3 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                    {log.new_value ?? 'null'}
                  </td>
                  <td className="py-2.5 pr-3 opacity-75">{log.changed_by_email || 'Sistema'}</td>
                  <td className="py-2.5 opacity-60 text-[11px]">
                    {new Date(log.created_at).toLocaleString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

