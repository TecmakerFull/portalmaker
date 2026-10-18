// =============================================================================
// PORTALMAKER — Formulario Avanzado de Producto (Estilo Empretienda)
// Soporta hasta 10 fotos, categorías/subcategorías, rich text, dimensiones y variantes
// =============================================================================

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Product, Category, Store, ProductDetails, ProductVariant } from '@/types/database'
import {
  Upload,
  X,
  Loader2,
  ArrowLeft,
  Plus,
  Check,
  AlertCircle,
  Star,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Quote,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading,
  Trash2,
  HelpCircle,
  Package,
  Layers,
  Scale,
  Image as ImageIcon,
  Sparkles,
  Globe,
  Search,
  Tag,
  MessageCircleQuestion,
  Info,
} from 'lucide-react'

import { compressImageFile } from '@/lib/image-compression'
import AiDescriptionModal from './ai-description-modal'
import { StickySaveBar } from '../components/sticky-save-bar'

interface LocalVariant {
  id?: string
  nombre: string
  precio_final: string
  stock: string
  imagen_url: string
  imagenes?: string[]
}

interface ProductoFormProps {
  store: Store
  initialProduct?: Product | null
  initialDetails?: ProductDetails | null
  initialVariants?: ProductVariant[]
  categories: Category[]
  tenantQuery: string
  isModal?: boolean
  onClose?: () => void
  onSuccess?: () => void
}

export default function ProductoForm({
  store,
  initialProduct,
  initialDetails,
  initialVariants = [],
  categories,
  tenantQuery,
  isModal = false,
  onClose,
  onSuccess,
}: ProductoFormProps) {
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isEditing = !!initialProduct

  // 1. Datos Principales
  const [nombre, setNombre] = useState(initialProduct?.nombre ?? '')
  const [slug, setSlug] = useState(initialProduct?.slug ?? '')
  const [selectedParentCatId, setSelectedParentCatId] = useState<string>(() => {
    if (!initialProduct?.category_id) return ''
    const currentCat = categories.find((c) => c.id === initialProduct.category_id)
    if (currentCat?.parent_id) {
      return currentCat.parent_id
    }
    return currentCat?.id ?? ''
  })
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>(() => {
    if (!initialProduct?.category_id) return ''
    const currentCat = categories.find((c) => c.id === initialProduct.category_id)
    if (currentCat?.parent_id) {
      return currentCat.id
    }
    return ''
  })

  // 2. Descripción con Formato
  const [descripcion, setDescripcion] = useState(initialProduct?.descripcion ?? '')
  const [showAiModal, setShowAiModal] = useState(false)

  // 3. Fotos (hasta 10)
  const [imagenes, setImagenes] = useState<string[]>(initialProduct?.imagenes ?? [])
  const [uploadingImage, setUploadingImage] = useState(false)

  // 4. Precios & Modalidad
  const [sinPrecio, setSinPrecio] = useState(!initialProduct ? false : initialProduct.precio_base === 0 && !initialProduct.gestiona_stock)
  const [precioBase, setPrecioBase] = useState(initialProduct?.precio_base?.toString() ?? '')
  const [precioOferta, setPrecioOferta] = useState(initialProduct?.precio_oferta?.toString() ?? '')
  const [ofertaActiva, setOfertaActiva] = useState(initialProduct?.oferta_activa ?? false)

  // 5. Stock & SKU
  const [gestionaStock, setGestionaStock] = useState(initialProduct?.gestiona_stock ?? false)
  const [stock, setStock] = useState(initialProduct?.stock?.toString() ?? '')
  const [sku, setSku] = useState(initialProduct?.sku ?? '')
  const [tiempoFabricacion, setTiempoFabricacion] = useState(initialProduct?.tiempo_fabricacion_estimado ?? '')
  const [destacado, setDestacado] = useState(initialProduct?.destacado ?? false)

  // 6. Dimensiones y Peso
  const [pesoKg, setPesoKg] = useState(initialDetails?.peso_kg?.toString() ?? '')
  const [altoCm, setAltoCm] = useState(initialDetails?.alto_cm?.toString() ?? '')
  const [anchoCm, setAnchoCm] = useState(initialDetails?.ancho_cm?.toString() ?? '')
  const [profundidadCm, setProfundidadCm] = useState(initialDetails?.profundidad_cm?.toString() ?? '')

  // 8. Optimización SEO en Google (Meta tags & Tags)
  const [metaTitle, setMetaTitle] = useState(initialDetails?.meta_title ?? '')
  const [metaDescription, setMetaDescription] = useState(initialDetails?.meta_description ?? '')
  const [tagsInput, setTagsInput] = useState(initialDetails?.tags?.join(', ') ?? '')
  const [optimizingSeo, setOptimizingSeo] = useState(false)
  const [seoNotice, setSeoNotice] = useState<string | null>(null)
  const seoAbortControllerRef = useRef<AbortController | null>(null)

  // 9. Preguntas Frecuentes del Producto (FAQ)
  const [faqs, setFaqs] = useState<{ pregunta: string; respuesta: string }[]>(
    initialDetails?.preguntas_frecuentes ?? []
  )
  const [generatingFaq, setGeneratingFaq] = useState(false)
  const [faqNotice, setFaqNotice] = useState<string | null>(null)
  const faqAbortControllerRef = useRef<AbortController | null>(null)

  // 7. Atributos / Variantes
  const [variants, setVariants] = useState<LocalVariant[]>(() => {
    if (initialVariants.length > 0) {
      const base = initialProduct?.precio_base ?? 0
      return initialVariants.map((v) => {
        const finalPrice =
          v.precio_adicional !== 0 && v.precio_adicional !== null && v.precio_adicional !== undefined
            ? (base + v.precio_adicional).toString()
            : ''
        const variantImgs = Array.isArray(v.imagenes) && v.imagenes.length > 0
          ? v.imagenes
          : (v.imagen_url ? [v.imagen_url] : [])
        return {
          id: v.id,
          nombre: v.nombre,
          precio_final: finalPrice,
          stock: v.stock !== null && v.stock !== undefined ? v.stock.toString() : '',
          imagen_url: variantImgs[0] ?? (v.imagen_url ?? ''),
          imagenes: variantImgs,
        }
      })
    }
    return []
  })

  // Modal para seleccionar/gestionar fotos de variante (estilo Mercado Libre)
  const [variantPhotoPickerIndex, setVariantPhotoPickerIndex] = useState<number | null>(null)
  const [customVariantUrl, setCustomVariantUrl] = useState('')
  const [uploadingVariantImage, setUploadingVariantImage] = useState(false)
  const variantFileInputRef = useRef<HTMLInputElement>(null)

  // Helpers para agregar/quitar imágenes a una variante
  const handleAddImageToVariant = (index: number, url: string) => {
    setVariants((prev) => {
      const copy = [...prev]
      const currentImgs = copy[index].imagenes || (copy[index].imagen_url ? [copy[index].imagen_url] : [])
      if (!currentImgs.includes(url)) {
        const nextImgs = [...currentImgs, url]
        copy[index] = {
          ...copy[index],
          imagenes: nextImgs,
          imagen_url: nextImgs[0] || '',
        }
      }
      return copy
    })
  }

  const handleRemoveImageFromVariant = (index: number, urlToRemove: string) => {
    setVariants((prev) => {
      const copy = [...prev]
      const currentImgs = copy[index].imagenes || (copy[index].imagen_url ? [copy[index].imagen_url] : [])
      const nextImgs = currentImgs.filter((img) => img !== urlToRemove)
      copy[index] = {
        ...copy[index],
        imagenes: nextImgs,
        imagen_url: nextImgs[0] || '',
      }
      return copy
    })
  }

  const handleToggleImageInVariant = (index: number, url: string) => {
    setVariants((prev) => {
      const copy = [...prev]
      const currentImgs = copy[index].imagenes || (copy[index].imagen_url ? [copy[index].imagen_url] : [])
      const exists = currentImgs.includes(url)
      const nextImgs = exists ? currentImgs.filter((u) => u !== url) : [...currentImgs, url]
      copy[index] = {
        ...copy[index],
        imagenes: nextImgs,
        imagen_url: nextImgs[0] || '',
      }
      return copy
    })
  }

  // Subir archivo directo para variante
  const handleUploadVariantFile = async (file: File) => {
    if (variantPhotoPickerIndex === null) return
    setUploadingVariantImage(true)
    try {
      const publicUrl = await processImageFile(file)
      // Agregar a las imágenes generales del producto si no estaba
      setImagenes((prev) => (prev.includes(publicUrl) ? prev : [...prev, publicUrl]))
      // Agregar a la lista de imágenes de esta variante
      handleAddImageToVariant(variantPhotoPickerIndex, publicUrl)
    } catch (err: any) {
      alert('Error al subir la imagen de la variante: ' + (err?.message || 'Error desconocido'))
    } finally {
      setUploadingVariantImage(false)
    }
  }

  // Pegar foto para variante con Ctrl + V
  const handlePasteVariantImage = (e: React.ClipboardEvent) => {
    if (variantPhotoPickerIndex === null) return
    const items = e.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          handleUploadVariantFile(file)
          return
        }
      }
    }

    const pastedText = e.clipboardData.getData('text')
    if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://'))) {
      setCustomVariantUrl(pastedText.trim())
    }
  }

  // 8. Creación Rápida de Categoría
  const [showNuevaCatModal, setShowNuevaCatModal] = useState(false)
  const [nuevaCatNombre, setNuevaCatNombre] = useState('')
  const [nuevaCatParentId, setNuevaCatParentId] = useState('')
  const [loadingCat, setLoadingCat] = useState(false)
  const [categoryList, setCategoryList] = useState<Category[]>(categories)

  // Estados generales
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const supabase = createSupabaseBrowserClient()

  // Generar Slug Automático
  const handleNombreChange = (val: string) => {
    setNombre(val)
    if (!isEditing) {
      const genSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(genSlug)
    }
  }

  // Filtrado de Subcategorías según la categoría superior elegida
  const rootCategories = categoryList.filter((c) => !c.parent_id)
  const subCategories = selectedParentCatId
    ? categoryList.filter((c) => c.parent_id === selectedParentCatId)
    : []

  // Insertar formato en la descripción (Toolbar de texto enriquecido)
  const insertFormat = (prefix: string, suffix: string = prefix, defaultPlaceholder: string = 'texto') => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentVal = textarea.value
    const selectedText = currentVal.substring(start, end) || defaultPlaceholder
    const replacement = `${prefix}${selectedText}${suffix}`

    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end)
    setDescripcion(newVal)

    // Restaurar foco
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
    }, 10)
  }

  // Insertar Enlace
  const handleInsertLink = () => {
    const url = prompt('Ingresa la URL del enlace (ej: https://...):')
    if (!url) return
    insertFormat('[', `](${url})`, 'texto del enlace')
  }

  const [inputImageUrl, setInputImageUrl] = useState('')

  // Procesar archivo individual (optimización WebP en cliente + subida a Storage)
  const processImageFile = async (file: File): Promise<string> => {
    // 1. Compresión y conversión client-side a WebP (máx 1400px, calidad 82%)
    let fileToUpload = file
    try {
      fileToUpload = await compressImageFile(file, {
        maxWidth: 1400,
        maxHeight: 1400,
        quality: 0.82,
        format: 'image/webp',
      })
    } catch (compressErr) {
      console.warn('No se pudo comprimir la imagen en cliente, usando archivo original:', compressErr)
    }

    try {
      const bucketName = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'portalmaker-media'
      const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'webp'
      const cleanExt = fileExt ? `.${fileExt}` : '.webp'
      const filePath = `tiendas/${store.id}/productos/${Date.now()}-${Math.random().toString(36).substring(7)}${cleanExt}`

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileToUpload, { cacheControl: '31536000', upsert: true })

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)

        if (publicUrl) return publicUrl
      }
    } catch (e) {
      console.warn('Storage no disponible, usando lectura directa:', e)
    }

    // Fallback: leer como Data URL
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(reader.result as string)
      }
      reader.readAsDataURL(fileToUpload)
    })
  }

  // Subida de hasta 10 fotos desde selector de archivos
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (imagenes.length + files.length > 10) {
      alert('Puedes subir como máximo 10 imágenes por producto.')
      return
    }

    setUploadingImage(true)
    setErrorMsg(null)

    try {
      const fileArray = Array.from(files)
      const newUrls = await Promise.all(fileArray.map(processImageFile))
      setImagenes((prev) => [...prev, ...newUrls])
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al procesar las imágenes.')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  // Pegar imágenes con Ctrl + V
  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const filesToUpload: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile()
        if (file) filesToUpload.push(file)
      }
    }

    if (filesToUpload.length > 0) {
      e.preventDefault()
      if (imagenes.length + filesToUpload.length > 10) {
        alert('Puedes subir como máximo 10 imágenes por producto.')
        return
      }

      setUploadingImage(true)
      try {
        const urls = await Promise.all(filesToUpload.map(processImageFile))
        setImagenes((prev) => [...prev, ...urls])
      } finally {
        setUploadingImage(false)
      }
      return
    }

    // Si pegó una URL de imagen
    const pastedText = e.clipboardData.getData('text')
    if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://'))) {
      if (imagenes.length >= 10) {
        alert('Máximo 10 imágenes alcanzado.')
        return
      }
      setImagenes((prev) => [...prev, pastedText.trim()])
    }
  }

  // Agregar imagen por URL (limpia el campo inmediatamente)
  const handleAddImageUrl = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault()
    const cleanUrl = inputImageUrl.trim()
    if (!cleanUrl) return
    if (imagenes.length >= 10) {
      alert('Máximo 10 imágenes alcanzado.')
      return
    }
    setImagenes((prev) => [...prev, cleanUrl])
    setInputImageUrl('')
  }

  // Eliminar Imagen
  const handleRemoveImage = (index: number) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index))
  }

  // Establecer como Imagen Principal (Mueve al primer puesto)
  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return
    setImagenes((prev) => {
      const copy = [...prev]
      const [item] = copy.splice(index, 1)
      copy.unshift(item)
      return copy
    })
  }

  // Crear Categoría Rápida
  const handleCrearCategoriaRapida = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuevaCatNombre.trim()) return

    setLoadingCat(true)
    try {
      const catSlug = nuevaCatNombre
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      const { data, error } = await supabase
        .from('categories')
        .insert({
          store_id: store.id,
          parent_id: nuevaCatParentId || null,
          nombre: nuevaCatNombre.trim(),
          slug: catSlug,
          orden: categoryList.length,
          visible: true,
        })
        .select()
        .single()

      if (error) throw error

      if (data) {
        setCategoryList((prev) => [...prev, data])
        if (data.parent_id) {
          setSelectedParentCatId(data.parent_id)
          setSelectedSubCatId(data.id)
        } else {
          setSelectedParentCatId(data.id)
          setSelectedSubCatId('')
        }
        setNuevaCatNombre('')
        setNuevaCatParentId('')
        setShowNuevaCatModal(false)
      }
    } catch (err: any) {
      alert(err?.message || 'Error al crear la categoría.')
    } finally {
      setLoadingCat(false)
    }
  }

  // Agregar Variante / Atributo
  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        nombre: '',
        precio_final: '',
        stock: '',
        imagen_url: imagenes[0] || '',
        imagenes: imagenes[0] ? [imagenes[0]] : [],
      },
    ])
  }

  // Modificar Variante
  const handleUpdateVariant = (index: number, field: keyof LocalVariant, value: string | string[]) => {
    setVariants((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [field]: value } : v))
    )
  }

  // Eliminar Variante
  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index))
  }

  // Cancelar Optimización SEO con IA
  const handleCancelSeo = () => {
    if (seoAbortControllerRef.current) {
      seoAbortControllerRef.current.abort()
      seoAbortControllerRef.current = null
    }
    setOptimizingSeo(false)
  }

  // Cancelar Generación de FAQ con IA
  const handleCancelFaq = () => {
    if (faqAbortControllerRef.current) {
      faqAbortControllerRef.current.abort()
      faqAbortControllerRef.current = null
    }
    setGeneratingFaq(false)
  }

  // Optimizar SEO con IA (Google Meta Tags & Keywords)
  const handleOptimizeSeoWithAi = async () => {
    if (!nombre.trim()) {
      alert('Ingresa primero el nombre del producto para optimizar el SEO.')
      return
    }

    const abortController = new AbortController()
    seoAbortControllerRef.current = abortController
    setOptimizingSeo(true)
    setSeoNotice(null)

    try {
      const activeCat = categoryList.find(
        (c) => c.id === selectedSubCatId || c.id === selectedParentCatId
      )

      const res = await fetch('/api/ai/optimize-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          categoria: activeCat?.nombre,
          storeName: store.nombre,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error al optimizar SEO.')

      if (data.meta_title) setMetaTitle(data.meta_title)
      if (data.meta_description) setMetaDescription(data.meta_description)
      if (data.tags && Array.isArray(data.tags)) setTagsInput(data.tags.join(', '))

      setSeoNotice('Metadatos SEO generados y optimizados con IA.')
      setTimeout(() => setSeoNotice(null), 4000)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      alert(err?.message || 'Error al generar SEO con IA.')
    } finally {
      setOptimizingSeo(false)
      seoAbortControllerRef.current = null
    }
  }

  // Generar Preguntas Frecuentes con IA (FAQ)
  const handleGenerateFaqWithAi = async () => {
    if (!nombre.trim()) {
      alert('Ingresa primero el nombre del producto para generar las preguntas frecuentes.')
      return
    }

    const abortController = new AbortController()
    faqAbortControllerRef.current = abortController
    setGeneratingFaq(true)
    setFaqNotice(null)

    try {
      const activeCat = categoryList.find(
        (c) => c.id === selectedSubCatId || c.id === selectedParentCatId
      )

      const res = await fetch('/api/ai/generate-faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortController.signal,
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          categoria: activeCat?.nombre,
          tiempoFabricacion,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error al generar preguntas frecuentes.')

      if (data.faqs && Array.isArray(data.faqs)) {
        setFaqs((prev) => [...prev, ...data.faqs])
        setFaqNotice(`${data.faqs.length} preguntas frecuentes agregadas exitosamente.`)
        setTimeout(() => setFaqNotice(null), 4000)
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return
      }
      alert(err?.message || 'Error al generar preguntas frecuentes con IA.')
    } finally {
      setGeneratingFaq(false)
      faqAbortControllerRef.current = null
    }
  }

  const handleAddFaq = () => {
    setFaqs((prev) => [...prev, { pregunta: '', respuesta: '' }])
  }

  const handleUpdateFaq = (index: number, field: 'pregunta' | 'respuesta', val: string) => {
    setFaqs((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: val }
      return copy
    })
  }

  const handleRemoveFaq = (index: number) => {
    setFaqs((prev) => prev.filter((_, i) => i !== index))
  }

  // Guardar Producto
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    try {
      const numPrecio = sinPrecio ? 0 : parseFloat(precioBase) || 0
      if (!sinPrecio && (isNaN(numPrecio) || numPrecio < 0)) {
        throw new Error('Por favor ingresa un precio base válido.')
      }

      const numOferta = precioOferta ? parseFloat(precioOferta) : null
      const cleanSlug = slug.trim() || nombre.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')
      const finalCategoryId = selectedSubCatId || selectedParentCatId || null

      // 1. Guardar en tabla PRODUCTS
      const productPayload = {
        store_id: store.id,
        category_id: finalCategoryId,
        nombre: nombre.trim(),
        slug: cleanSlug,
        descripcion: descripcion.trim() || null,
        precio_base: numPrecio,
        precio_oferta: numOferta,
        oferta_activa: ofertaActiva && Boolean(numOferta),
        gestiona_stock: gestionaStock,
        stock: gestionaStock
          ? (variants.length > 0
              ? variants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0)
              : (stock ? parseInt(stock) || 0 : null))
          : null,
        sku: sku.trim() || null,
        tiempo_fabricacion_estimado: tiempoFabricacion.trim() || null,
        destacado: destacado,
        imagenes: imagenes,
        visible: true,
      }

      let targetProductId = initialProduct?.id

      if (isEditing && initialProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productPayload)
          .eq('id', initialProduct.id)

        if (updateError) throw updateError
      } else {
        const { data: newProd, error: insertError } = await supabase
          .from('products')
          .insert(productPayload)
          .select()
          .single()

        if (insertError) throw insertError
        targetProductId = newProd.id
      }

      if (!targetProductId) throw new Error('No se pudo resolver el ID del producto.')

      // 2. Guardar en tabla PRODUCT_DETAILS (Dimensiones, SEO y FAQ)
      const numPeso = pesoKg ? parseFloat(pesoKg) : null
      const numAlto = altoCm ? parseFloat(altoCm) : null
      const numAncho = anchoCm ? parseFloat(anchoCm) : null
      const numProfundidad = profundidadCm ? parseFloat(profundidadCm) : null

      const tagsArray = tagsInput
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)

      const validFaqs = faqs.filter(
        (f) => f.pregunta.trim() !== '' && f.respuesta.trim() !== ''
      )

      const detailsPayload = {
        product_id: targetProductId,
        peso_kg: numPeso,
        alto_cm: numAlto,
        ancho_cm: numAncho,
        profundidad_cm: numProfundidad,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        preguntas_frecuentes: validFaqs,
      }

      const { error: detailsError } = await supabase
        .from('product_details')
        .upsert(detailsPayload, { onConflict: 'product_id' })

      if (detailsError) {
        console.warn('Error al guardar dimensiones/detalles:', detailsError)
      }

      // 3. Sincronizar VARIANTES en PRODUCT_VARIANTS
      if (variants.length > 0) {
        // Eliminar variantes viejas que ya no estén
        await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', targetProductId)

        const basePriceNum = numPrecio
        const validVariants = variants
          .filter((v) => v.nombre.trim() !== '')
          .map((v, idx) => {
            let precioAdicional = 0
            if (v.precio_final && v.precio_final.trim() !== '') {
              const parsedFinal = parseFloat(v.precio_final)
              if (!isNaN(parsedFinal)) {
                // precio_adicional = precioFinal - precioBase (puede ser positivo, cero o negativo)
                precioAdicional = parsedFinal - basePriceNum
              }
            }

            const variantImgs = Array.isArray(v.imagenes) && v.imagenes.length > 0
              ? v.imagenes
              : (v.imagen_url && v.imagen_url.trim() !== '' ? [v.imagen_url.trim()] : [])

            return {
              product_id: targetProductId,
              nombre: v.nombre.trim(),
              precio_adicional: precioAdicional,
              stock: v.stock && v.stock.trim() !== '' ? parseInt(v.stock) || 0 : null,
              imagen_url: variantImgs.length > 0 ? variantImgs[0] : null,
              imagenes: variantImgs,
              orden: idx,
              activo: true,
            }
          })

        if (validVariants.length > 0) {
          const { error: varError } = await supabase
            .from('product_variants')
            .insert(validVariants)

          if (varError) {
            console.warn('Error al guardar variantes:', varError)
          }
        }
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push(`/tienda/admin/productos${tenantQuery}`)
        router.refresh()
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error al guardar el producto.')
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {isModal ? (
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
          ) : (
            <Link
              href={`/tienda/admin/productos${tenantQuery}`}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 opacity-70 hover:opacity-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-texto)] font-[var(--font-heading)]">
              {isEditing ? 'Editar Producto' : 'Agregar Producto'}
            </h1>
            <p className="text-xs sm:text-sm opacity-70 mt-0.5">
              {isEditing
                ? 'Modifica los datos, fotos, dimensiones y variantes de tu producto.'
                : 'Carga las fotos y especificaciones de tu pieza para publicarla en tu tienda.'}
            </p>
          </div>
        </div>

        {isModal ? (
          <button
            type="button"
            onClick={onClose}
            className="self-start sm:self-auto min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <Link
            href={`/tienda/admin/productos${tenantQuery}`}
            className="self-start sm:self-auto text-xs font-semibold opacity-70 hover:opacity-100 px-3 py-1.5 rounded-lg border border-[var(--color-borde)]"
          >
            Volver al listado
          </Link>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 pb-24">
        {/* 1. Nombre y Categorías */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
          <div className="space-y-4">
            {/* Nombre del Producto */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-75">
                  Nombre del Producto *
                </label>
                <span className="text-[11px] opacity-50">{nombre.length}/80 caracteres</span>
              </div>
              <input
                type="text"
                required
                maxLength={80}
                value={nombre}
                onChange={(e) => handleNombreChange(e.target.value)}
                placeholder={
                  variants.length > 0
                    ? 'Ej: Remera Lisa de Algodón, Maceta Geométrica, Lámpara Nórdica...'
                    : 'Ej: Lámpara de Mesa con Base de Madera, Mochila Urbana...'
                }
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
              />
              {variants.length > 0 ? (
                <p className="text-[11px] text-amber-800 dark:text-amber-300/95 mt-1.5 flex items-start gap-1.5 font-medium leading-relaxed bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>
                    <strong>Recomendación para variantes:</strong> Escribe un nombre de modelo general (ej: <em>Remera de Algodón</em>, <em>Taza Cerámica</em> o <em>Maceta Nórdica</em>). Evita especificar color, talle o medida aquí, ya que cada variante representará una opción física concreta.
                  </span>
                </p>
              ) : (
                <p className="text-[11px] opacity-60 mt-1">
                  Nombre descriptivo del producto para tu catálogo y buscadores.
                </p>
              )}
            </div>

            {/* Categoría y Subcategoría */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Categoría Principal */}
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 truncate">
                    Categoría Principal
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setNuevaCatParentId('')
                      setShowNuevaCatModal(true)
                    }}
                    className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva categoría</span>
                  </button>
                </div>
                <select
                  value={selectedParentCatId}
                  onChange={(e) => {
                    setSelectedParentCatId(e.target.value)
                    setSelectedSubCatId('')
                  }}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 cursor-pointer transition-all shadow-xs"
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5">
                    Sin categoría principal
                  </option>
                  {rootCategories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5">
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subcategoría Anidada */}
              <div>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 truncate">
                    Subcategoría (Opcional)
                  </label>
                  {selectedParentCatId && (
                    <button
                      type="button"
                      onClick={() => {
                        setNuevaCatParentId(selectedParentCatId)
                        setShowNuevaCatModal(true)
                      }}
                      className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:underline flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nueva subcategoría</span>
                    </button>
                  )}
                </div>
                <select
                  value={selectedSubCatId}
                  disabled={!selectedParentCatId || subCategories.length === 0}
                  onChange={(e) => setSelectedSubCatId(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 cursor-pointer disabled:opacity-40 transition-all shadow-xs"
                >
                  <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5">
                    {selectedParentCatId
                      ? subCategories.length > 0
                        ? 'Seleccionar subcategoría...'
                        : 'Sin subcategorías creadas'
                      : 'Elige primero una categoría principal'}
                  </option>
                  {subCategories.map((sub) => (
                    <option key={sub.id} value={sub.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5">
                      {sub.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Descripción con Rich Text Toolbar */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider opacity-75">
            Descripción de tu producto
          </label>

          {/* Barra de herramientas / Formato libre */}
          <div className="flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-[var(--color-fondo)]/60 border border-[var(--color-borde)]">
            <button
              type="button"
              onClick={() => insertFormat('**', '**', 'negrita')}
              title="Negrita"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('*', '*', 'cursiva')}
              title="Cursiva"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('<u>', '</u>', 'subrayado')}
              title="Subrayado"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <Underline className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('~~', '~~', 'tachado')}
              title="Tachado"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-[var(--color-borde)] mx-1" />

            <button
              type="button"
              onClick={() => insertFormat('\n> ', '\n', 'Cita o aclaración importante')}
              title="Cita"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('\n- ', '\n', 'Elemento de lista')}
              title="Lista con viñetas"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('\n1. ', '\n', 'Paso numerado')}
              title="Lista numerada"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleInsertLink}
              title="Insertar enlace"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('### ', '\n', 'Subtítulo')}
              title="Encabezado"
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 opacity-75 hover:opacity-100 transition-colors"
            >
              <Heading className="w-4 h-4" />
            </button>

            <span className="w-px h-5 bg-[var(--color-borde)] mx-1" />

            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              title="Generar descripción con Inteligencia Artificial"
              className="px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ml-auto sm:ml-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Generar con IA</span>
            </button>
          </div>

          <textarea
            ref={textareaRef}
            rows={5}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe las características de tu producto: filamentos utilizados (PLA, PETG, Resina), dimensiones, tolerancias, cuidados, o agrega enlaces..."
            className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 leading-relaxed transition-all shadow-xs"
          />
        </div>

        {/* 3. Imágenes de tu producto (Hasta 10 fotos) */}
        <div
          onPaste={handlePasteImage}
          className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Imágenes de tu producto</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 opacity-70">
                  Soporta Ctrl + V
                </span>
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                Carga hasta 10 fotos. Puedes subir archivos, pegar capturas con <strong>Ctrl + V</strong> o ingresar enlaces URL. La primera foto será la portada principal.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 opacity-75 self-start sm:self-auto">
              {imagenes.length}/10 fotos
            </span>
          </div>

          {/* Grilla de imágenes cargadas */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            {imagenes.map((url, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-2xl overflow-hidden border border-[var(--color-borde)] bg-black/5 dark:bg-white/5 group shadow-2xs"
              >
                <img
                  src={url}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Badge Principal */}
                {index === 0 ? (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#FACC15] text-[#1F2937] text-[10px] font-bold shadow-xs">
                    Principal
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimaryImage(index)}
                    title="Hacer foto principal"
                    className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-[#FACC15] hover:text-[#1F2937] transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Botón Eliminar */}
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  title="Eliminar foto"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white hover:bg-red-600 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Dropzone / Botón para agregar fotos */}
            {imagenes.length < 10 && (
              <label className="aspect-square rounded-2xl border-2 border-dashed border-[var(--color-borde)] hover:border-amber-400 bg-[var(--color-fondo)]/40 hover:bg-amber-400/5 cursor-pointer flex flex-col items-center justify-center p-4 text-center transition-all">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
                {uploadingImage ? (
                  <div className="flex flex-col items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs font-medium">Procesando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 opacity-75">
                    <Upload className="w-6 h-6 text-[#CA8A04] dark:text-[#FACC15]" />
                    <span className="text-xs font-bold">Subir fotos</span>
                    <span className="text-[10px] opacity-60">o presiona Ctrl+V</span>
                  </div>
                )}
              </label>
            )}
          </div>

          {/* Opción para agregar por URL */}
          {imagenes.length < 10 && (
            <div className="pt-2 border-t border-[var(--color-borde)]/60">
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>O agregar foto por enlace URL</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={inputImageUrl}
                  onChange={(e) => setInputImageUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddImageUrl(e)
                    }
                  }}
                  placeholder="https://ejemplo.com/fotos/mi-pieza.jpg"
                  className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  disabled={!inputImageUrl.trim()}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[var(--color-superficie)] hover:bg-black/5 dark:hover:bg-white/5 border border-[var(--color-borde)] text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                >
                  + Agregar URL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Precios, Oferta y Stock */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
          <h2 className="text-base font-bold">Precios y Stock</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Precio Base */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                Precio (ARS) *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm opacity-50 font-semibold">$</span>
                <input
                  type="number"
                  disabled={sinPrecio}
                  required={!sinPrecio}
                  min="0"
                  step="any"
                  value={precioBase}
                  onChange={(e) => setPrecioBase(e.target.value)}
                  placeholder="3000.00"
                  className="w-full min-h-[44px] pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs disabled:opacity-40"
                />
              </div>
            </div>

            {/* Precio Oferta */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                Precio Oferta (Opcional)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-sm opacity-50 font-semibold">$</span>
                <input
                  type="number"
                  disabled={sinPrecio}
                  min="0"
                  step="any"
                  value={precioOferta}
                  onChange={(e) => {
                    setPrecioOferta(e.target.value)
                    if (e.target.value) setOfertaActiva(true)
                  }}
                  placeholder="2500.00"
                  className="w-full min-h-[44px] pl-8 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs disabled:opacity-40"
                />
              </div>
            </div>

            {/* Checkbox: Producto sin precio / Consultar */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sinPrecio}
                  onChange={(e) => setSinPrecio(e.target.checked)}
                  className="w-4 h-4 accent-[#FACC15] rounded cursor-pointer"
                />
                <span className="text-xs font-semibold">
                  Producto sin precio. Se muestra un botón "Consultar" en lugar de "Comprar".
                </span>
              </label>
            </div>

            {/* Stock */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                Stock {variants.length > 0 ? 'Total (Calculado de variantes)' : '(Opcional)'}
              </label>
              {variants.length > 0 ? (
                <div>
                  <div className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-sm flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {variants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0)} unidades en stock
                    </span>
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Suma de {variants.length} {variants.length === 1 ? 'variante' : 'variantes'}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-60 mt-1">
                    El stock se gestiona de forma individual en cada variante en la sección inferior.
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => {
                      setStock(e.target.value)
                      if (e.target.value) setGestionaStock(true)
                    }}
                    placeholder="Ilimitado (a pedido)"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                  />
                  <p className="text-[11px] opacity-60 mt-1">
                    Si lo dejas vacío, el stock se considera ilimitado o bajo encargo.
                  </p>
                </div>
              )}
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                SKU / Código (Opcional)
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="Ej: LAMP-001"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
              />
              <p className="text-[11px] opacity-60 mt-1">
                Código interno para identificar el producto.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Dimensiones y Peso */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Dimensiones y Peso</span>
            </h2>
            <p className="text-xs opacity-70 mt-0.5">
              En los productos físicos, estos datos son obligatorios para poder calcular el costo del envío (Andreani, Correo Argentino, etc.).
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Peso */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                Peso
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={pesoKg}
                  onChange={(e) => setPesoKg(e.target.value)}
                  placeholder="0.5"
                  className="w-full min-h-[44px] pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                />
                <span className="absolute right-3.5 text-xs opacity-50 font-bold">kg</span>
              </div>
              <p className="text-[10px] opacity-50 mt-1">Ej: para 100 gr, ingresa 0.1</p>
            </div>

            {/* Alto */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                Alto
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={altoCm}
                  onChange={(e) => setAltoCm(e.target.value)}
                  placeholder="10"
                  className="w-full min-h-[44px] pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                />
                <span className="absolute right-3.5 text-xs opacity-50 font-bold">cm</span>
              </div>
            </div>

            {/* Ancho */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                Ancho
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={anchoCm}
                  onChange={(e) => setAnchoCm(e.target.value)}
                  placeholder="10"
                  className="w-full min-h-[44px] pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                />
                <span className="absolute right-3.5 text-xs opacity-50 font-bold">cm</span>
              </div>
            </div>

            {/* Profundidad */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5">
                Profundidad
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={profundidadCm}
                  onChange={(e) => setProfundidadCm(e.target.value)}
                  placeholder="15"
                  className="w-full min-h-[44px] pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                />
                <span className="absolute right-3.5 text-xs opacity-50 font-bold">cm</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Atributos y Variantes */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                <span>Atributos y Variantes</span>
              </h2>
              <p className="text-xs opacity-70 mt-0.5">
                Crea opciones como color, tamaño, material o talle. Cada opción física tendrá su propio stock y precio.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddVariant}
              className="min-h-[40px] px-4 py-2 rounded-xl border border-[var(--color-borde)] hover:border-[#FACC15] hover:bg-[#FACC15]/10 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
              <span>Agregar variante</span>
            </button>
          </div>

          {/* Guía didáctica multirrubro sobre variantes */}
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-200">
                ¿Cómo funcionan las variantes en tu catálogo?
              </h3>
            </div>
            <ul className="text-xs text-blue-950/80 dark:text-blue-200/80 space-y-1.5 leading-relaxed pl-1 sm:pl-2">
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Producto Principal (Genérico):</strong> Define el modelo base (ej: <em>&quot;Remera Lisa de Algodón&quot;</em>, <em>&quot;Taza Artesanal&quot;</em> o <em>&quot;Maceta Nórdica&quot;</em>). No incluyas color ni talle en el nombre principal.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Variantes Físicas (Hijos):</strong> Crea una variante para cada opción que vendas (ej: <em>&quot;Blanco&quot;</em>, <em>&quot;Negro&quot;</em>, <em>&quot;Talle M&quot;</em>, <em>&quot;Talle L&quot;</em>), incluyendo el color o medida básica para que tenga su stock y foto correspondiente.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Compra en la tienda:</strong> Si el producto tiene variantes, los clientes seleccionan obligatoriamente una opción para comprar. El stock y la orden se registran con esa variante exacta.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-blue-600 dark:text-blue-400">•</span>
                <span>
                  <strong>Fotos y Precios:</strong> Si una variante no tiene foto asignada, la tienda utiliza automáticamente la foto principal del producto. Puedes dejar el precio base o definir un importe personalizado.
                </span>
              </li>
            </ul>
          </div>

          {/* Listado dinámico de variantes */}
          {variants.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs font-semibold opacity-60 px-2 hidden sm:grid">
                <span className="sm:col-span-2">Foto</span>
                <span className="sm:col-span-4">Nombre / Opción</span>
                <span className="sm:col-span-3">Precio variante ($)</span>
                <span className="sm:col-span-2">Stock</span>
                <span className="sm:col-span-1 text-center">Quitar</span>
              </div>

              {variants.map((variant, index) => {
                const basePriceNum = parseFloat(precioBase) || 0
                const variantFinalNum = parseFloat(variant.precio_final)
                const hasCustomPrice = variant.precio_final && !isNaN(variantFinalNum)
                const priceDiff = hasCustomPrice ? variantFinalNum - basePriceNum : 0

                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-2xl bg-[var(--color-fondo)]/40 border border-[var(--color-borde)] items-center"
                  >
                    {/* Foto y contador de fotos de la variante */}
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomVariantUrl('')
                          setVariantPhotoPickerIndex(index)
                        }}
                        className="relative w-11 h-11 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-400 flex items-center justify-center shrink-0 transition-all group cursor-pointer shadow-2xs"
                        title="Gestionar fotos de esta variante"
                      >
                        {variant.imagenes && variant.imagenes.length > 0 ? (
                          <>
                            <img src={variant.imagenes[0]} alt="" className="w-full h-full object-cover" />
                            {variant.imagenes.length > 1 && (
                              <span className="absolute bottom-0 right-0 bg-black/80 text-white text-[9px] font-bold px-1 rounded-tl">
                                +{variant.imagenes.length}
                              </span>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          </>
                        ) : variant.imagen_url ? (
                          <>
                            <img src={variant.imagen_url} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-amber-500">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-[8px] font-bold mt-0.5">+ Fotos</span>
                          </div>
                        )}
                      </button>
                      <div className="text-[10px] font-medium opacity-70 flex flex-col">
                        <span>
                          {variant.imagenes && variant.imagenes.length > 0
                            ? `${variant.imagenes.length} ${variant.imagenes.length === 1 ? 'foto' : 'fotos'}`
                            : variant.imagen_url
                            ? '1 foto'
                            : 'Foto general'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomVariantUrl('')
                            setVariantPhotoPickerIndex(index)
                          }}
                          className="text-amber-600 dark:text-amber-400 hover:underline text-left cursor-pointer"
                        >
                          Gestionar
                        </button>
                      </div>
                    </div>

                    {/* Nombre de la variante */}
                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-bold opacity-60 sm:hidden block mb-1">
                        Nombre de la variante
                      </label>
                      <input
                        type="text"
                        value={variant.nombre}
                        onChange={(e) => handleUpdateVariant(index, 'nombre', e.target.value)}
                        placeholder="Ej: Negro / PLA, Talle L, 15cm"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                      />
                    </div>

                    {/* Precio de la variante (soporta más barato, más caro o mismo precio) */}
                    <div className="sm:col-span-3">
                      <div className="flex items-center justify-between mb-1 sm:mb-0.5">
                        <label className="text-[11px] font-bold opacity-60 sm:hidden block">
                          Precio ($)
                        </label>
                        {hasCustomPrice && (
                          <span className="text-[10px] font-bold">
                            {priceDiff > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                (+${priceDiff.toLocaleString('es-AR')})
                              </span>
                            ) : priceDiff < 0 ? (
                              <span className="text-sky-600 dark:text-sky-400">
                                (-${Math.abs(priceDiff).toLocaleString('es-AR')})
                              </span>
                            ) : (
                              <span className="opacity-50">Mismo precio</span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-xs opacity-50 font-bold">$</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={variant.precio_final}
                          onChange={(e) => handleUpdateVariant(index, 'precio_final', e.target.value)}
                          placeholder={precioBase ? `${precioBase} (mismo)` : 'Mismo precio'}
                          className="w-full min-h-[42px] pl-7 pr-2 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Stock específico */}
                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-bold opacity-60 sm:hidden block mb-1">
                        Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={variant.stock}
                        onChange={(e) => handleUpdateVariant(index, 'stock', e.target.value)}
                        placeholder="Ilimitado"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                      />
                    </div>

                    {/* Quitar */}
                    <div className="sm:col-span-1 flex justify-end sm:justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="p-2 rounded-xl hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors cursor-pointer"
                        title="Eliminar variante"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 7. Posicionamiento en Google (SEO & Meta-tags) */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                  <span>Posicionamiento en Google (SEO)</span>
                </h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-800 dark:text-amber-300">
                  Estilo Shopify Magic
                </span>
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                Optimiza cómo se verá este producto en los resultados de búsqueda de Google y redes sociales.
              </p>
            </div>

            {optimizingSeo ? (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-400/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                  <span>Optimizando SEO...</span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelSeo}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Cancelar generación de SEO"
                >
                  <X className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleOptimizeSeoWithAi}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Optimizar SEO con IA</span>
              </button>
            )}
          </div>

          {seoNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{seoNotice}</span>
            </div>
          )}

          {/* Google Search Snippet Preview */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
              <Search className="w-3 h-3 shrink-0" />
              <span>
                https://{store.slug}.portalmaker.ar › productos › {slug || 'producto'}
              </span>
            </div>
            <div className="text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer truncate">
              {metaTitle || `${nombre || 'Título del producto'} | ${store.nombre}`}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {metaDescription ||
                descripcion.substring(0, 150) ||
                'Compra online con envío a todo el país. Calidad garantizada y atención personalizada en nuestro taller maker.'}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Meta Title */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider opacity-75">
                  Título en Google (Meta Title)
                </label>
                <span
                  className={`text-[11px] font-mono font-bold ${
                    metaTitle.length > 60
                      ? 'text-red-500'
                      : metaTitle.length > 40
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'opacity-50'
                  }`}
                >
                  {metaTitle.length}/60 caracteres
                </span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={`${nombre || 'Nombre del producto'} | ${store.nombre}`}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            {/* Meta Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider opacity-75">
                  Descripción en Google (Meta Description)
                </label>
                <span
                  className={`text-[11px] font-mono font-bold ${
                    metaDescription.length > 160
                      ? 'text-red-500'
                      : metaDescription.length >= 120
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'opacity-50'
                  }`}
                >
                  {metaDescription.length}/160 caracteres
                </span>
              </div>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Breve resumen persuasivo que invita al usuario a hacer clic en Google..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs leading-relaxed focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>

            {/* Tags / Palabras clave */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75 mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Etiquetas y Palabras Clave (Separadas por coma)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="ej: soporte, auriculares, gaming, pla, impresion 3d"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
              />
            </div>
          </div>
        </div>

        {/* 8. Preguntas Frecuentes del Producto (FAQ) */}
        <div className="bg-[var(--color-superficie)] rounded-3xl border border-[var(--color-borde)] p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold flex items-center gap-2">
                  <MessageCircleQuestion className="w-4 h-4 text-[#CA8A04] dark:text-[#FACC15]" />
                  <span>Preguntas Frecuentes del Producto (FAQ)</span>
                </h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400">
                  Estilo Amazon
                </span>
              </div>
              <p className="text-xs opacity-70 mt-0.5">
                Anticípate a las dudas de tus compradores (materiales, resistencia, tiempos o personalizaciones) para reducir consultas repetitivas en WhatsApp.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {generatingFaq ? (
                <>
                  <div className="min-h-[40px] px-3.5 py-2 rounded-xl bg-amber-400/20 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
                    <span>Generando FAQ...</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelFaq}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl border border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    title="Cancelar generación de preguntas frecuentes"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateFaqWithAi}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Generar FAQ con IA</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleAddFaq}
                className="min-h-[40px] px-3.5 py-2 rounded-xl border border-[var(--color-borde)] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar</span>
              </button>
            </div>
          </div>

          {faqNotice && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{faqNotice}</span>
            </div>
          )}

          {/* Listado de Preguntas y Respuestas */}
          {faqs.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-[var(--color-borde)] rounded-2xl space-y-2">
              <HelpCircle className="w-8 h-8 opacity-40 mx-auto text-amber-500" />
              <p className="text-xs font-bold opacity-80">
                No tienes preguntas frecuentes cargadas todavía.
              </p>
              <p className="text-[11px] opacity-60 max-w-sm mx-auto">
                Toca en <strong>«Generar FAQ con IA»</strong> para que el asistente cree automáticamente las respuestas a las dudas más comunes de tus clientes.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-[var(--color-fondo)]/50 border border-[var(--color-borde)] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Pregunta #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(idx)}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Eliminar pregunta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={faq.pregunta}
                    onChange={(e) => handleUpdateFaq(idx, 'pregunta', e.target.value)}
                    placeholder="¿Qué resistencia tiene el producto?"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:border-amber-400 dark:focus:border-amber-400"
                  />
                  <textarea
                    rows={2}
                    value={faq.respuesta}
                    onChange={(e) => handleUpdateFaq(idx, 'respuesta', e.target.value)}
                    placeholder="Respuesta concisa y directa..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs leading-relaxed focus:outline-none focus:border-amber-400 dark:focus:border-amber-400"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback de error o éxito al lado del botón */}
        {errorMsg && (
          <div className="p-3 px-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Botones de Guardar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isModal ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-6 py-2.5 rounded-xl border border-[var(--color-borde)] text-sm font-semibold opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center cursor-pointer"
            >
              Cancelar
            </button>
          ) : (
            <Link
              href={`/tienda/admin/productos${tenantQuery}`}
              className="min-h-[48px] px-6 py-2.5 rounded-xl border border-[var(--color-borde)] text-sm font-semibold opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex items-center justify-center"
            >
              Cancelar
            </Link>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ color: '#1F2937' }}
            className="min-h-[48px] px-8 py-3 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
            ) : (
              <>
                <Check className="w-4 h-4 text-[#1F2937]" />
                <span>{isEditing ? 'Guardar Cambios' : 'Agregar Producto'}</span>
              </>
            )}
          </button>
        </div>

        {/* Barra de Guardado Flotante Estandarizada */}
        <StickySaveBar
          loading={loading}
          saveText={isEditing ? 'Guardar Cambios' : 'Agregar Producto'}
          savingText="Guardando producto..."
          errorMsg={errorMsg}
          message={isEditing ? `Editando: ${nombre || 'Producto'}` : 'Nuevo producto'}
          hasChanges={true}
        />
      </form>

      {/* Modal Seleccionar / Subir Foto para Variante */}
      {variantPhotoPickerIndex !== null && (
        <div
          onPaste={handlePasteVariantImage}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold font-[var(--font-heading)] text-slate-900 dark:text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  <span>Fotos para la variante</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {variants[variantPhotoPickerIndex]?.nombre
                    ? `"${variants[variantPhotoPickerIndex].nombre}"`
                    : `Variante #${variantPhotoPickerIndex + 1}`}
                  {' · '}
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {(variants[variantPhotoPickerIndex]?.imagenes?.length ?? (variants[variantPhotoPickerIndex]?.imagen_url ? 1 : 0))} fotos asignadas
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVariantPhotoPickerIndex(null)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tira de fotos asignadas a esta variante */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75">
                Fotos de esta opción (la 1ra es la portada):
              </label>
              {(() => {
                const curVar = variants[variantPhotoPickerIndex]
                const curImgs = curVar?.imagenes && curVar.imagenes.length > 0
                  ? curVar.imagenes
                  : (curVar?.imagen_url ? [curVar.imagen_url] : [])

                if (curImgs.length === 0) {
                  return (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 text-xs opacity-65 text-center">
                      Esta variante aún no tiene fotos individuales: la tienda usará automáticamente la foto principal del producto.
                    </div>
                  )
                }

                return (
                  <div className="flex flex-wrap gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                    {curImgs.map((url, i) => (
                      <div key={i} className="relative group w-16 h-16 rounded-xl overflow-hidden border-2 border-amber-400 shrink-0 shadow-2xs">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 bg-amber-500 text-slate-950 text-[8px] font-bold px-1 rounded shadow-xs">
                            Portada
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImageFromVariant(variantPhotoPickerIndex, url)}
                          title="Quitar foto de esta variante"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Input de archivo oculto */}
            <input
              type="file"
              ref={variantFileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUploadVariantFile(file)
                if (e.target) e.target.value = ''
              }}
            />

            {/* 1. Botón de Subida Directa */}
            <div
              onClick={() => variantFileInputRef.current?.click()}
              className="p-3.5 rounded-2xl border-2 border-dashed border-amber-400/50 hover:border-amber-500 bg-amber-400/5 hover:bg-amber-400/10 transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              {uploadingVariantImage ? (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Optimizando a WebP y subiendo...</span>
                </div>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Subir foto exclusiva para esta variante (o pegar con Ctrl+V)
                  </span>
                </>
              )}
            </div>

            {/* 2. Seleccionar de las fotos ya cargadas en el producto */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-75">
                  O toca fotos del producto para asociar a esta opción:
                </label>
                <span className="text-[10px] opacity-60">
                  Toca para agregar / quitar
                </span>
              </div>
              {imagenes.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                  {imagenes.map((url, i) => {
                    const curVar = variants[variantPhotoPickerIndex]
                    const curImgs = curVar?.imagenes && curVar.imagenes.length > 0
                      ? curVar.imagenes
                      : (curVar?.imagen_url ? [curVar.imagen_url] : [])
                    const isIncluded = curImgs.includes(url)

                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleToggleImageInVariant(variantPhotoPickerIndex, url)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          isIncluded
                            ? 'border-amber-400 ring-2 ring-amber-400/30 scale-95'
                            : 'border-slate-200 dark:border-slate-700 hover:border-amber-400 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        {isIncluded && (
                          <div className="absolute inset-0 bg-amber-400/30 flex items-center justify-center text-white">
                            <Check className="w-5 h-5 stroke-[3] text-amber-500 bg-white rounded-full p-0.5 shadow-sm" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">
                  Aún no has cargado fotos generales en el producto.
                </p>
              )}
            </div>

            {/* 3. O ingresar URL directa */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold uppercase tracking-wider opacity-75">
                O agregar foto por URL:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={customVariantUrl}
                  onChange={(e) => setCustomVariantUrl(e.target.value)}
                  placeholder="https://ejemplo.com/foto-variante.webp"
                  className="flex-1 min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customVariantUrl.trim()) {
                      handleAddImageToVariant(variantPhotoPickerIndex, customVariantUrl.trim())
                      setCustomVariantUrl('')
                    }
                  }}
                  disabled={!customVariantUrl.trim()}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-[#FACC15] text-[#1F2937] text-xs font-bold hover:bg-[#eab308] transition-all disabled:opacity-40 cursor-pointer"
                >
                  + Agregar
                </button>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleUpdateVariant(variantPhotoPickerIndex, 'imagenes', [])
                  handleUpdateVariant(variantPhotoPickerIndex, 'imagen_url', '')
                }}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                Limpiar fotos de esta variante
              </button>
              <button
                type="button"
                onClick={() => setVariantPhotoPickerIndex(null)}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Categoría Rápida */}
      {showNuevaCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold font-[var(--font-heading)] text-slate-900 dark:text-white">
                {nuevaCatParentId ? 'Nueva Subcategoría' : 'Nueva Categoría Principal'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNuevaCatModal(false)}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCrearCategoriaRapida} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Nombre de la categoría *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={nuevaCatNombre}
                  onChange={(e) => setNuevaCatNombre(e.target.value)}
                  placeholder="Ej: Filamentos, Lámparas, Cortados Láser..."
                  className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  ¿Es una subcategoría? (Opcional)
                </label>
                <div className="relative">
                  <select
                    value={nuevaCatParentId}
                    onChange={(e) => setNuevaCatParentId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-amber-400 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 cursor-pointer transition-all shadow-xs"
                  >
                    <option value="" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5">
                      Ninguna (Es Categoría Principal)
                    </option>
                    {rootCategories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white py-1.5">
                        Dentro de: {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                  Déjala en <strong>"Ninguna"</strong> si es un grupo principal, o elige la categoría padre para anidarla como subcategoría.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNuevaCatModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingCat}
                  style={{ color: '#1F2937' }}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-[#FACC15] text-[#1F2937] text-sm font-bold hover:bg-[#eab308] active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {loadingCat ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#1F2937]" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 text-[#1F2937]" />
                      <span>Crear Categoría</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asistente de IA para Descripciones */}
      {showAiModal && (
        <AiDescriptionModal
          initialProductName={nombre}
          categoryName={
            categoryList.find((c) => c.id === selectedSubCatId || c.id === selectedParentCatId)?.nombre
          }
          onApply={(generated, mode) => {
            if (mode === 'replace') {
              setDescripcion(generated)
            } else {
              setDescripcion((prev) => (prev ? `${prev}\n\n${generated}` : generated))
            }
          }}
          onClose={() => setShowAiModal(false)}
        />
      )}
    </div>
  )
}
