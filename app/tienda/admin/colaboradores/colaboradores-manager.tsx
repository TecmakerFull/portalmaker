// =============================================================================
// PORTALMAKER — Gestor de Colaboradores de Tienda (Client Component)
// Permite agregar socios o ayudantes que puedan administrar productos y pedidos.
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Store, StoreCollaborator } from '@/types/database'
import {
  UserCheck,
  UserPlus,
  Trash2,
  Copy,
  Check,
  Shield,
  Users,
  Mail,
  Info,
  Loader2,
  ShieldAlert,
  Send,
  MessageCircle,
} from 'lucide-react'
import { AdminPageHeader } from '../components/admin-page-header'

interface ColaboradoresManagerProps {
  store: Store
  initialCollaborators: StoreCollaborator[]
  tenantQuery: string
}

export default function ColaboradoresManager({
  store,
  initialCollaborators,
  tenantQuery,
}: ColaboradoresManagerProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [collaborators, setCollaborators] = useState<StoreCollaborator[]>(initialCollaborators)
  const [emailInput, setEmailInput] = useState('')
  const [rolInput, setRolInput] = useState<'colaborador' | 'admin'>('colaborador')
  const [loading, setLoading] = useState(false)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  // URL de acceso directo para compartir con el colaborador (vía portal central)
  const inviteLink = `https://portalmaker.ar/tienda/admin?tenant=${store.slug}`

  // Enlace para compartir invitación por WhatsApp sin emojis (cumpliendo regla crítica #1)
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Hola, te agregue como colaborador en el panel de administracion de la tienda ${store.nombre} en Portalmaker. Podes ingresar con tu correo desde este enlace: ${inviteLink}`
  )}`

  // Copiar link de acceso rápido al portapapeles
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    } catch (e) {
      console.error('Error al copiar enlace:', e)
    }
  }

  // Reenviar invitación por correo electrónico vía Resend
  const handleResendInvite = async (id: string, email: string, rol: string) => {
    setSendingEmailId(id)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch('/api/colaboradores/invitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          rol,
          storeName: store.nombre,
          storeSlug: store.slug,
          invitadoPor: store.admin_email,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo enviar el correo de invitación.')
      }

      setSuccessMsg(`Invitación reenviada correctamente a ${email}.`)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al enviar el correo de invitación.')
    } finally {
      setSendingEmailId(null)
    }
  }

  // Agregar un nuevo colaborador
  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const cleanEmail = emailInput.trim().toLowerCase()
    if (!cleanEmail) return

    // Validar que no sea el mismo correo del dueño
    if (cleanEmail === store.admin_email.toLowerCase()) {
      setErrorMsg('Este correo ya es el propietario principal de la tienda.')
      return
    }

    // Validar que no esté ya registrado
    if (collaborators.some((c) => c.email.toLowerCase() === cleanEmail)) {
      setErrorMsg('Este correo ya está agregado como colaborador.')
      return
    }

    setLoading(true)

    try {
      const newEntry = {
        store_id: store.id,
        email: cleanEmail,
        rol: rolInput,
        estado: 'activo' as const,
        invitado_por: store.admin_email,
      }

      const { data, error } = await supabase
        .from('store_collaborators')
        .insert([newEntry])
        .select()
        .single()

      if (error) throw error

      setCollaborators([data as StoreCollaborator, ...collaborators])
      setEmailInput('')

      // Despachar correo automático de bienvenida con Resend
      let emailNotice = ''
      try {
        const emailRes = await fetch('/api/colaboradores/invitar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            rol: rolInput,
            storeName: store.nombre,
            storeSlug: store.slug,
            invitadoPor: store.admin_email,
          }),
        })
        if (emailRes.ok) {
          emailNotice = ' e invitación enviada por correo'
        }
      } catch (eErr) {
        console.warn('Fallo envío de correo con Resend:', eErr)
      }

      setSuccessMsg(`Colaborador ${cleanEmail} agregado exitosamente${emailNotice}.`)
      router.refresh()
    } catch (err: any) {
      console.error('Error al agregar colaborador:', err)
      setErrorMsg(err.message || 'No se pudo agregar el colaborador.')
    } finally {
      setLoading(false)
    }
  }

  // Eliminar un colaborador existente
  const handleDeleteCollaborator = async (id: string, email: string) => {
    if (!confirm(`¿Estás seguro de quitar a ${email} como colaborador de la tienda?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('store_collaborators')
        .delete()
        .eq('id', id)
        .eq('store_id', store.id)

      if (error) throw error

      setCollaborators(collaborators.filter((c) => c.id !== id))
      setSuccessMsg(`Colaborador ${email} removido.`)
      router.refresh()
    } catch (err: any) {
      console.error('Error al eliminar colaborador:', err)
      setErrorMsg(err.message || 'No se pudo eliminar el colaborador.')
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8">
      {/* Cabecera */}
      <AdminPageHeader
        title="Colaboradores"
        description="Autoriza a tus socios o ayudantes a acceder a este panel para crear productos, modificar precios y despachar pedidos."
        icon={UserPlus}
      />

      {/* Enlace de invitación rápida */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-texto)]">
          <Info className="w-4 h-4 text-amber-500" />
          <span>¿Cómo ingresa un colaborador?</span>
        </div>
        <p className="text-xs sm:text-sm opacity-75 leading-relaxed">
          Agrega aquí su correo electrónico. Luego, comparte el siguiente enlace directo. Al iniciar sesión con su cuenta de Google o correo en Portalmaker, el sistema lo reconocerá automáticamente.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <input
            type="text"
            readOnly
            value={inviteLink}
            aria-label="Enlace directo de acceso"
            className="flex-1 h-11 px-3.5 rounded-xl border border-[var(--color-borde)] bg-black/[0.02] dark:bg-white/[0.03] text-xs font-mono opacity-85 select-all"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="min-h-[44px] px-4 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                <span>Enlace Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Enlace</span>
              </>
            )}
          </button>
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] px-4 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Compartir por WhatsApp</span>
          </a>
        </div>
      </div>

      {/* Formulario para agregar colaborador */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[var(--color-superficie)] border border-[var(--color-borde)] shadow-xs">
        <h2 className="text-base sm:text-lg font-semibold mb-1 text-[var(--color-texto)]">
          Invitar a un nuevo colaborador
        </h2>
        <p className="text-xs opacity-70 mb-5">
          Ingresa el correo de la persona a quien deseas dar acceso.
        </p>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs mb-4 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAddCollaborator} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-xs font-medium mb-1.5 opacity-80">
              Correo electrónico del colaborador
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] focus:ring-1 focus:ring-[var(--color-primario)] text-[var(--color-texto)]"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium mb-1.5 opacity-80">
              Rol / Permisos
            </label>
            <select
              value={rolInput}
              onChange={(e) => setRolInput(e.target.value as 'colaborador' | 'admin')}
              className="w-full h-11 px-3 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-xs sm:text-sm outline-none focus:border-[var(--color-primario)] text-[var(--color-texto)]"
            >
              <option value="colaborador">Colaborador (Catálogo y Pedidos)</option>
              <option value="admin">Administrador (Acceso Completo)</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] h-11 rounded-xl bg-[var(--color-primario)] text-[var(--color-primario-texto)] text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Agregar Miembro</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Miembros con Acceso */}
      <div className="space-y-4">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--color-texto)]">
          Miembros con acceso a esta tienda
        </h2>

        <div className="rounded-2xl border border-[var(--color-borde)] bg-[var(--color-superficie)] overflow-hidden divide-y divide-[var(--color-borde)] shadow-xs">
          {/* Fila del Propietario Principal */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--color-primario)]/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primario)]/20 text-[var(--color-primario)] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold truncate text-[var(--color-texto)]">
                    {store.admin_email}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--color-primario)]/20 text-[var(--color-primario)]">
                    Propietario
                  </span>
                </div>
                <p className="text-[11px] opacity-60">Creador de la tienda · Acceso total de facturación y configuración</p>
              </div>
            </div>
            <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 sm:text-right">
              Activo
            </div>
          </div>

          {/* Lista de Colaboradores agregados */}
          {collaborators.length === 0 ? (
            <div className="p-8 text-center text-xs opacity-60">
              No tienes colaboradores adicionales todavía. Agrega uno arriba para empezar a trabajar en equipo.
            </div>
          ) : (
            collaborators.map((c) => (
              <div
                key={c.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 text-[var(--color-texto)] flex items-center justify-center shrink-0">
                    <UserCheck className="w-5 h-5 opacity-70" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold truncate text-[var(--color-texto)]">
                        {c.email}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 capitalize">
                        {c.rol}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-60">
                      Agregado el {new Date(c.created_at).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    {c.estado === 'activo' ? 'Habilitado' : 'Pendiente'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleResendInvite(c.id, c.email, c.rol)}
                    disabled={sendingEmailId === c.id}
                    title="Reenviar invitación por correo electrónico"
                    aria-label={`Reenviar invitación a ${c.email}`}
                    className="min-h-[44px] px-3 py-1.5 flex items-center gap-1.5 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold opacity-80 hover:opacity-100 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {sendingEmailId === c.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Reenviar correo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCollaborator(c.id, c.email)}
                    title="Eliminar colaborador"
                    aria-label={`Eliminar colaborador ${c.email}`}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
