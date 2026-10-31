// =============================================================================
// PORTALMAKER — Optimizador de SEO de Productos con IA (Estilo Shopify Magic)
// Genera meta_title, meta_description y tags con Gemini 3.8 Flash sin emojis.
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rate = await checkRateLimit({
      ip: `ai-seo:${ip}`,
      maxPerIp: 20,
      windowMs: 10 * 60 * 1000,
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Límite de generaciones alcanzado. Espera unos minutos.' },
        { status: 429 }
      )
    }

    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Clave de API de Gemini no configurada en variables de entorno.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nombre, descripcion, categoria, storeName } = body

    if (!nombre) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos el título o nombre del producto.' },
        { status: 400 }
      )
    }

    const systemInstruction = `Eres un especialista en SEO y optimización de conversión para tiendas online de creadores y makers en habla hispana.
Tu tarea es generar metadatos de posicionamiento para Google (Search Engine Optimization) para una ficha de producto.

REGLAS CRÍTICAS:
1. TOTALMENTE PROHIBIDO EL USO DE EMOJIS en todos los campos.
2. Longitudes estrictas para evitar truncamiento en Google:
   - meta_title: Entre 40 y 60 caracteres. Debe ser llamativo, incluir la palabra clave principal y opcionalmente el nombre de la tienda (${storeName || 'Tienda'}).
   - meta_description: Entre 130 y 155 caracteres exactos. Gancho persuasivo, características clave y llamado a la acción (ej: 'Descúbrelo aquí', 'Compra online con envío a todo el país').
   - tags: Lista de 4 a 6 etiquetas relevantes en minúsculas, separadas por coma.
3. Responde ÚNICAMENTE un objeto JSON válido con las claves: "meta_title", "meta_description", "tags" (array de strings). Sin bloques de código markdown ni texto adicional.`

    const userPrompt = `Optimiza el SEO para este producto:
- Nombre: ${nombre}
${categoria ? `- Categoría: ${categoria}` : ''}
${descripcion ? `- Descripción: ${descripcion.substring(0, 400)}` : ''}
${storeName ? `- Tienda: ${storeName}` : ''}`

    // Priorizar gemini-3.5-flash-lite (~800ms) y gemini-3.5-flash (modelos activos v1beta)
    // eliminando gemini-2.5-flash y gemini-2.0-flash que fueron retirados por Google.
    const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']
    let parsedResult = null
    let lastError = null

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
              generationConfig: {
                temperature: 0.4,
                responseMimeType: 'application/json',
                maxOutputTokens: 1000,
              },
            }),
          }
        )

        if (!response.ok) {
          const errData = await response.json()
          lastError = errData?.error?.message || `HTTP ${response.status}`
          continue
        }

        const data = await response.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text

        if (text) {
          try {
            parsedResult = JSON.parse(text)
            break
          } catch {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
            parsedResult = JSON.parse(cleanText)
            break
          }
        }
      } catch (err: any) {
        lastError = err?.message || 'Error con Google Gemini'
      }
    }

    if (!parsedResult) {
      return NextResponse.json(
        { error: lastError || 'No se pudo generar la optimización SEO.' },
        { status: 502 }
      )
    }

    // Limpieza final de emojis por seguridad
    const sanitizeNoEmojis = (str: string) =>
      str.replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ''
      ).trim()

    return NextResponse.json({
      success: true,
      meta_title: sanitizeNoEmojis(parsedResult.meta_title || `${nombre} | ${storeName || 'Tienda'}`),
      meta_description: sanitizeNoEmojis(parsedResult.meta_description || ''),
      tags: Array.isArray(parsedResult.tags)
        ? parsedResult.tags.map((t: string) => sanitizeNoEmojis(String(t).toLowerCase()))
        : [],
    })
  } catch (error: any) {
    console.error('Error en /api/ai/optimize-seo:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno al optimizar SEO.' },
      { status: 500 }
    )
  }
}
