// =============================================================================
// PORTALMAKER — Gestor Interactivo de Categorías y Subcategorías
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Category, Store } from '@/types/database'
import {
  Plus,
  FolderTree,
  Edit2,
  Trash2,
  CornerDownRight,
  GripVertical,
  Check,
  X,
  Loader2,
  AlertCircle,
  FolderPlus,
} from 'lucide-react'

interface CategoriasManagerProps {
  store: Store
  initialCategories: Category[]
  tenantQuery: string
}

export default function CategoriasManager({
  store,
  initialCategories,
  tenantQuery,
}: CategoriasManagerProps) {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()

  const [categories, setCategories] = useState<Category[]>(initialCategories)

  // Modal / Formulario de creación y edición
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [nombre, setNombre] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Abrir modal para nueva categoría raíz
  const handleOpenNewRoot = () => {
    setEditingCategory(null)
    setNombre('')
    setParentId('')
    setErrorMsg(null)
    setIsOpenModal(true)
  }

  // Abrir modal para nueva subcategoría directa
  const handleOpenNewSub = (parentCategory: Category) => {
    setEditingCategory(null)
    setNombre('')
    setParentId(parentCategory.id)
    setErrorMsg(null)
    setIsOpenModal(true)
  }

  // Abrir modal para editar
  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat)
    setNombre(cat.nombre)
    setParentId(cat.parent_id || '')
    setErrorMsg(null)
    setIsOpenModal(true)
  }

  // Guardar categoría (insert o update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return

    setLoading(true)
    setErrorMsg(null)

    const cleanSlug = nombre
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    try {
      if (editingCategory) {
        // Actualizar
        const { error } = await supabase
          .from('categories')
          .update({
            nombre: nombre.trim(),
            slug: cleanSlug,
            parent_id: parentId ? parentId : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCategory.id)

        if (error) throw error

        setCategories((prev) =>
          prev.map((c) =>
            c.id === editingCategory.id
              ? {
                  ...c,
                  nombre: nombre.trim(),
                  slug: cleanSlug,
                  parent_id: parentId ? parentId : null,
                }
              : c
          )
        )
        setSuccessMsg(`¡Categoría "${nombre.trim()}" actualizada exitosamente!`)
      } else {
        // Crear
        const { data, error } = await supabase
          .from('categories')
          .insert({
            store_id: store.id,
            nombre: nombre.trim(),
            slug: cleanSlug,
            parent_id: parentId ? parentId : null,
            orden: categories.length,
            visible: true,
          })
          .select()
          .single()

        if (error) throw error
        if (data) {
          setCategories((prev) => [...prev, data])
        }
        setSuccessMsg(`¡Categoría "${nombre.trim()}" creada exitosamente!`)
      }

      setIsOpenModal(false)
      setNombre('')
      setParentId('')
      setEditingCategory(null)
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar la categoría.')
    } finally {
      setLoading(false)
    }
  }

  // Eliminar categoría
  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Los productos asociados quedarán sin categoría.')) {
      return
    }

    setDeletingId(categoryId)
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error

      setCategories((prev) => prev.filter((c) => c.id !== categoryId && c.parent_id !== categoryId))
      setSuccessMsg('Categoría eliminada correctamente.')
      router.refresh()
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: any) {
      alert(err?.message || 'Error al eliminar la categoría.')
    } finally {
      setDeletingId(null)
    }
  }

  // Separar categorías raíz y agrupar subcategorías
  const rootCategories = categories.filter((c) => !c.parent_id)
  const getSubcategories = (parentCatId: string) =>
    categories.filter((c) => c.parent_id === parentCatId)

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)]">
            Categorías
          </h1>
          <p className="text-xs sm:text-sm opacity-70 mt-1 max-w-2xl leading-relaxed">
            En esta sección podrás agregar las categorías y subcategorías para luego organizar y subir los productos en tu tienda online.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNewRoot}
          style={{ color: '#1F2937' }}
          className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-[#1F2937]" />
          <span>Agregar Categoría</span>
        </button>
      </div>

      {/* Listado Jerárquico de Categorías */}
      {rootCategories.length > 0 ? (
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] overflow-hidden shadow-xs divide-y divide-[var(--color-borde)]">
          {rootCategories.map((rootCat) => {
            const subCats = getSubcategories(rootCat.id)

            return (
              <div key={rootCat.id} className="transition-colors">
                {/* Categoría Principal (Nivel 1) */}
                <div className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3 min-w-0">
                    <GripVertical className="w-4 h-4 opacity-30 cursor-grab shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base truncate">
                          {rootCat.nombre}
                        </span>
                        {subCats.length > 0 && (
                          <span className="text-[11px] font-semibold opacity-60 px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 shrink-0">
                            {subCats.length} {subCats.length === 1 ? 'subcategoría' : 'subcategorías'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs opacity-50 font-mono block truncate">
                        /{rootCat.slug}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenNewSub(rootCat)}
                      title="Agregar subcategoría"
                      className="p-2 rounded-xl border border-[var(--color-borde)] hover:bg-[#FACC15]/10 hover:border-[#FACC15] hover:text-[#CA8A04] dark:hover:text-[#FACC15] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Subcategoría</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(rootCat)}
                      title="Editar categoría"
                      className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(rootCat.id)}
                      disabled={deletingId === rootCat.id}
                      title="Eliminar categoría"
                      className="p-2 rounded-xl hover:bg-red-500/10 text-red-600 hover:text-red-700 dark:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === rootCat.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Subcategorías Anidadas (Nivel 2) */}
                {subCats.length > 0 && (
                  <div className="bg-[var(--color-fondo)]/40 border-t border-[var(--color-borde)] divide-y divide-[var(--color-borde)]">
                    {subCats.map((subCat) => (
                      <div
                        key={subCat.id}
                        className="p-3.5 sm:p-4 pl-8 sm:pl-12 flex items-center justify-between gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CornerDownRight className="w-4 h-4 opacity-40 shrink-0 text-[#CA8A04] dark:text-[#FACC15]" />
                          <div className="min-w-0">
                            <span className="font-semibold text-xs sm:text-sm truncate block">
                              {subCat.nombre}
                            </span>
                            <span className="text-[10px] opacity-50 font-mono block truncate">
                              /{rootCat.slug}/{subCat.slug}
                            </span>
                          </div>
                        </div>

                        {/* Acciones Subcategoría */}
                        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(subCat)}
                            title="Editar subcategoría"
                            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(subCat.id)}
                            disabled={deletingId === subCat.id}
                            title="Eliminar subcategoría"
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-600 hover:text-red-700 dark:text-red-400 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {deletingId === subCat.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Estado vacío */
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-10 sm:p-14 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FACC15]/20 text-[#CA8A04] dark:text-[#FACC15] mx-auto flex items-center justify-center mb-4">
            <FolderTree className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-1 font-[var(--font-heading)]">
            Aún no has creado categorías
          </h2>
          <p className="text-sm opacity-70 mb-6">
            Crea categorías como "Filamentos", "Impresiones 3D", "Llaveros" o "Lámparas" para estructurar tu catálogo.
          </p>
          <button
            type="button"
            onClick={handleOpenNewRoot}
            style={{ color: '#1F2937' }}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#1F2937]" />
            <span>Crear mi primera categoría</span>
          </button>
        </div>
      )}

      {/* Modal Crear / Editar Categoría */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold font-[var(--font-heading)] text-slate-900 dark:text-white">
                {editingCategory
                  ? 'Editar Categoría'
                  : parentId
                  ? 'Nueva Subcategoría'
                  : 'Nueva Categoría Principal'}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpenModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Filamentos, Lámparas, Llaveros..."
                  className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-[#FACC15] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  ¿Es una subcategoría? (Opcional)
                </label>
                <div className="relative">
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-[#FACC15] cursor-pointer transition-all"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5">
                      Ninguna (Es Categoría Principal)
                    </option>
                    {rootCategories
                      .filter((c) => !editingCategory || c.id !== editingCategory.id)
                      .map((c) => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5">
                          Dentro de: {c.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Déjala en <strong>"Ninguna"</strong> si es un grupo principal (ej: <em>Lámparas</em>), o elige la categoría padre para anidarla como subcategoría (ej: <em>Lámparas → Luna 3D</em>).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ color: '#1F2937' }}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#1F2937]" />
                      <span>{editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notificación Toast Flotante */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-[#1F2937] text-white text-sm font-medium shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  )
}
