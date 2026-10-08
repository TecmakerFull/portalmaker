// =============================================================================
// PORTALMAKER — Compresión y Optimización de Imágenes en el Navegador (Client-side WebP)
// Reduce drásticamente el peso de fotos (hasta 90-95%), transformándolas a WebP
// antes de subirlas a Supabase Storage para ahorrar ancho de banda y almacenamiento.
// =============================================================================

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'image/webp' | 'image/jpeg' | 'image/png'
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1400,
  maxHeight: 1400,
  quality: 0.82,
  format: 'image/webp',
}

/**
 * Comprime y redimensiona una imagen en el navegador del cliente antes del upload.
 * Convierte automáticamente archivos JPG, PNG, HEIC (si el browser los decodifica) a WebP.
 * Preserva transparencias (WebP soporta canal alfa).
 * Si el archivo es SVG o no es imagen, se devuelve sin modificar.
 */
export async function compressImageFile(
  file: File,
  customOptions?: Partial<CompressionOptions>
): Promise<File> {
  // 1. Si no es una imagen o es un SVG vectorial, no procesar con Canvas
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file
  }

  const opts = { ...DEFAULT_OPTIONS, ...customOptions }

  return new Promise((resolve, reject) => {
    // Si estamos en un entorno sin window/document (SSR), retornar archivo intacto
    if (typeof window === 'undefined') {
      return resolve(file)
    }

    const reader = new FileReader()

    reader.onerror = () => {
      // En caso de fallo de lectura, devolvemos el archivo original sin bloquear la subida
      console.warn('Fallo al leer imagen para compresión, usando archivo original.')
      resolve(file)
    }

    reader.onload = (event) => {
      const img = new Image()

      img.onerror = () => {
        console.warn('Fallo al cargar imagen en Canvas, usando archivo original.')
        resolve(file)
      }

      img.onload = () => {
        try {
          let { width, height } = img

          const maxW = opts.maxWidth || 1400
          const maxH = opts.maxHeight || 1400

          // Calcular nuevas dimensiones respetando la relación de aspecto
          if (width > maxW || height > maxH) {
            const ratio = Math.min(maxW / width, maxH / height)
            width = Math.round(width * ratio)
            height = Math.round(height * ratio)
          }

          // Crear canvas HTML5
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            return resolve(file)
          }

          // Suavizado de alta calidad (Bicubic / Lanczos por browser)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'

          // Dibujar la imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height)

          const targetFormat = opts.format || 'image/webp'
          const quality = opts.quality || 0.82

          // Convertir el canvas a Blob WebP
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return resolve(file)
              }

              // Si por alguna razón el archivo comprimido es más pesado que el original, usamos el original
              if (blob.size >= file.size && file.type === targetFormat) {
                return resolve(file)
              }

              // Generar nombre de archivo con extensión .webp
              const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
              const ext = targetFormat === 'image/webp' ? '.webp' : targetFormat === 'image/jpeg' ? '.jpg' : '.png'
              const newFileName = `${originalName}${ext}`

              const compressedFile = new File([blob], newFileName, {
                type: targetFormat,
                lastModified: Date.now(),
              })

              resolve(compressedFile)
            },
            targetFormat,
            quality
          )
        } catch (err) {
          console.warn('Error durante la compresión canvas:', err)
          resolve(file)
        }
      }

      img.src = event.target?.result as string
    }

    reader.readAsDataURL(file)
  })
}
