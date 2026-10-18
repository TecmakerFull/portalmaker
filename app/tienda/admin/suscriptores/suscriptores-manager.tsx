// =============================================================================
// PORTALMAKER — Gestor de Suscriptores & Campañas Publicitarias (Client Component)
// Permite al maker enviar correos masivos o a destinatarios seleccionados.
// =============================================================================

'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store, NewsletterSubscriber } from '@/types/database'
import {
  Mail,
  Send,
  Copy,
  Check,
  Download,
  Trash2,
  Users,
  Search,
  Sparkles,
  Clock,
  CheckSquare,
  Square,
  ExternalLink,
} from 'lucide-react'

interface SuscriptoresManagerProps {
  store: Store
  initialSubscribers: NewsletterSubscriber[]
  tenantQuery: string
}

export default function SuscriptoresManager({
  store,
  initialSubscribers,
  tenantQuery,
}: SuscriptoresManagerProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>(initialSubscribers)
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [copiedSuccess, setCopiedSuccess] = useState(false)

  // Redactor de Campaña
  const [campaignSubject, setCampaignSubject] = useState(
    `Novedades y piezas exclusivas en ${store.nombre}`
  )
  const [campaignMessage, setCampaignMessage] = useState(
    `Hola!\n\nTe compartimos las novedades de taller y nuevos lanzamientos disponibles en nuestra tienda.\n\nPuedes ver el catálogo completo aquí: https://${store.slug}.portalmaker.ar\n\nSaludos,\nEl equipo de ${store.nombre}`
  )

  // Filtrado de suscriptores
  const filteredSubscribers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return subscribers
    return subscribers.filter((s) => s.email.toLowerCase().includes(q))
  }, [subscribers, search])

  // Selección múltiple
  const isAllSelected =
    filteredSubscribers.length > 0 &&
    filteredSubscribers.every((s) => selectedEmails.includes(s.email))

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedEmails([])
    } else {
      setSelectedEmails(filteredSubscribers.map((s) => s.email))
    }
  }

  const handleToggleSelectOne = (email: string) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== email))
    } else {
      setSelectedEmails([...selectedEmails, email])
    }
  }

  // Correos destinatarios a usar (los seleccionados, o todos si no seleccionó ninguno)
  const targetEmails =
    selectedEmails.length > 0
      ? selectedEmails
      : subscribers.filter((s) => s.activo).map((s) => s.email)

  // Copiar correos al portapapeles en formato para CCO (separados por coma)
  const handleCopyBcc = async () => {
    if (targetEmails.length === 0) return
    try {
      await navigator.clipboard.writeText(targetEmails.join(', '))
      setCopiedSuccess(true)
      setTimeout(() => setCopiedSuccess(false), 3000)
    } catch (e) {
      console.error('Error al copiar correos:', e)
    }
  }

  // Exportar a archivo CSV
  const handleExportCsv = () => {
    if (subscribers.length === 0) return
    const rows = [
      ['Email', 'Fecha de Suscripcion', 'Estado'],
      ...subscribers.map((s) => [
        s.email,
        new Date(s.created_at).toISOString().split('T')[0],
        s.activo ? 'Activo' : 'Inactivo',
      ]),
    ]

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `suscriptores_${store.slug}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Eliminar suscriptor
  const handleDeleteSubscriber = async (id: string, email: string) => {
    if (!confirm(`¿Eliminar a ${email} de la lista de suscriptores?`)) return

    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('id', id)
        .eq('store_id', store.id)

      if (error) throw error

      setSubscribers(subscribers.filter((s) => s.id !== id))
      setSelectedEmails(selectedEmails.filter((e) => e !== email))
      router.refresh()
    } catch (err: any) {
      console.error('Error al eliminar suscriptor:', err)
      alert(err.message || 'No se pudo eliminar el suscriptor.')
    }
  }

  // Generar link mailto para abrir directamente en el cliente de correo con CCO
  const mailtoHref = useMemo(() => {
    if (targetEmails.length === 0) return '#'
    const bcc = encodeURIComponent(targetEmails.join(','))
    const subject = encodeURIComponent(campaignSubject)
    const body = encodeURIComponent(campaignMessage)
    return `mailto:?bcc=${bcc}&subject=${subject}&body=${body}`
  }, [targetEmails, campaignSubject, campaignMessage])

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--color-primario)] mb-1">
            <Mail className="w-5 h-5" />
            <span className="eyebrow text-[var(--color-primario)]">MARKETING Y AUDIENCIA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold font-[var(--font-heading)] text-[var(--color-texto)]">
            Suscriptores & Campañas Publicitarias
          </h1>
          <p className="mt-1 text-xs sm:text-sm opacity-70 text-[var(--color-texto)]">
            Contactos registrados a través del formulario de suscripción de tu tienda para lanzamientos y promociones.
          </p>
        </div>

        {/* Botón Exportar CSV */}
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={subscribers.length === 0}
          className="min-h-[44px] px-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Exportar a CSV</span>
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Total de Suscriptores</p>
          <p className="text-2xl font-bold mt-1 text-[var(--color-texto)]">{subscribers.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Seleccionados para Campaña</p>
          <p className="text-2xl font-bold mt-1 text-[var(--color-primario)]">
            {selectedEmails.length > 0 ? selectedEmails.length : `${subscribers.length} (Todos)`}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
          <p className="text-[11px] font-medium opacity-60">Última Suscripción</p>
          <p className="text-base font-semibold mt-1 text-[var(--color-texto)]">
            {subscribers.length > 0
              ? new Date(subscribers[0].created_at).toLocaleDateString('es-AR')
              : 'Sin registros'}
          </p>
        </div>
      </div>

      {/* Herramienta de Envío de Campaña */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Enviar Campaña / Novedades de Tienda</span>
            </h2>
            <p className="text-xs opacity-70 mt-0.5">
              Redacta tu mensaje y envíalo en un clic con copia oculta (CCO) a los {targetEmails.length} destinatarios objetivo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBcc}
              disabled={targetEmails.length === 0}
              className="min-h-[44px] px-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Correos Copiados</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Lista (CCO)</span>
                </>
              )}
            </button>

            <a
              href={mailtoHref}
              className={`min-h-[44px] px-4 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs font-semibold flex items-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all ${
                targetEmails.length === 0 ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Abrir en mi Correo</span>
            </a>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-medium mb-1 opacity-80">Asunto del Correo</label>
            <input
              type="text"
              value={campaignSubject}
              onChange={(e) => setCampaignSubject(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 opacity-80">Mensaje de la Campaña</label>
            <textarea
              rows={4}
              value={campaignMessage}
              onChange={(e) => setCampaignMessage(e.target.value)}
              className="w-full p-3.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)] leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Lista de Suscriptores con Selección */}
      <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] shadow-xs overflow-hidden">
        {/* Barra superior de la tabla */}
        <div className="p-4 border-b border-[var(--color-borde)] flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSelectAll}
              className="min-h-[44px] px-3 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-[var(--color-primario)]" />
                  <span>Deseleccionar todos</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 opacity-50" />
                  <span>Seleccionar todos</span>
                </>
              )}
            </button>
            <span className="text-xs opacity-60">
              {selectedEmails.length} de {filteredSubscribers.length} seleccionados
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar por correo..."
              className="w-full h-10 pl-10 pr-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
            />
          </div>
        </div>

        {filteredSubscribers.length === 0 ? (
          <div className="p-12 text-center text-xs opacity-60 space-y-2">
            <Mail className="w-8 h-8 mx-auto opacity-30" />
            <p className="font-semibold text-sm">No hay suscriptores aún</p>
            <p>
              Los visitantes que completen el formulario de newsletter en el pie de tu tienda se registrarán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-[var(--color-borde)] text-[11px] font-semibold uppercase tracking-wider opacity-70">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Sel.</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Fecha de Suscripción</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borde)]">
                {filteredSubscribers.map((sub) => {
                  const isSelected = selectedEmails.includes(sub.email)

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors ${
                        isSelected ? 'bg-[var(--color-primario)]/5' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectOne(sub.email)}
                          aria-label={`Seleccionar ${sub.email}`}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--color-texto)] cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--color-primario)]" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-medium text-[var(--color-texto)]">
                        {sub.email}
                      </td>

                      <td className="py-3.5 px-4 text-xs opacity-60">
                        {new Date(sub.created_at).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                          {sub.activo ? 'Activo' : 'Pausado'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSubscriber(sub.id, sub.email)}
                          title="Eliminar de la lista"
                          aria-label={`Eliminar ${sub.email}`}
                          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
