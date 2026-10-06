// =============================================================================
// PORTALMAKER — Formulario de Creación Rápida de Tienda
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { COLOR_PRESETS } from '@/lib/constants'
import { Loader2, ArrowRight, AlertCircle } from 'lucide-react'

export default function CrearTiendaForm({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Autocompletar slug amigable a partir del nombre
  const handleNombreChange = (val: string) => {
    setNombre(val)
    const generatedSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setSlug(generatedSlug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    try {
      // Paleta por defecto: 06 Yellow & Gray (preset 6)
      const defaultPreset = COLOR_PRESETS.find((p) => p.id === 6) ?? COLOR_PRESETS[0]

      const { data, error } = await supabase
        .from('stores')
        .insert({
          nombre: nombre.trim(),
          slug: slug.trim().toLowerCase(),
          admin_email: userEmail,
          whatsapp_numero: whatsapp.trim() || null,
          color_primario: defaultPreset.claro.primario,
          color_secundario: defaultPreset.claro.secundario,
          color_fondo: defaultPreset.claro.fondo,
          color_texto: defaultPreset.claro.texto,
          color_primario_dark: defaultPreset.oscuro.primario,
          color_secundario_dark: defaultPreset.oscuro.secundario,
          color_fondo_dark: defaultPreset.oscuro.fondo,
          color_texto_dark: defaultPreset.oscuro.texto,
          font_heading: 'Outfit',
          font_body: 'Inter',
          suscripcion_activa: true,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('El subdominio ya está en uso. Por favor elige otro slug.')
        }
        throw error
      }

      router.refresh()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al crear la tienda.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
          Nombre de tu Tienda o Taller
        </label>
        <input
          type="text"
          required
          value={nombre}
          onChange={(e) => handleNombreChange(e.target.value)}
          placeholder="Ej: TecMaker 3D"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
          Subdominio (dirección web)
        </label>
        <div className="flex items-center rounded-xl border border-[var(--color-borde)] overflow-hidden bg-[var(--color-fondo)] focus-within:ring-2 focus-within:ring-[#FACC15]">
          <input
            type="text"
            required
            pattern="^[a-z0-9-]+$"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="tecmaker"
            className="w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-transparent focus:outline-none"
          />
          <span className="bg-black/5 dark:bg-white/5 px-3 py-2.5 text-xs opacity-60 font-mono shrink-0 border-l border-[var(--color-borde)]">
            .portalmaker.com.ar
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider opacity-70 mb-1">
          Número de WhatsApp para consultas (con código de país)
        </label>
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ej: 5491112345678"
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--color-borde)] bg-[var(--color-fondo)] text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{ color: '#1F2937' }}
        className="w-full min-h-[48px] mt-2 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-extrabold hover:bg-[#eab308] transition-all disabled:opacity-50 shadow-md"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-[#1F2937]" />
        ) : (
          <>
            <span>Crear y Configurar Mi Tienda</span>
            <ArrowRight className="w-4 h-4 text-[#1F2937] ml-1" />
          </>
        )}
      </button>
    </form>
  )
}
