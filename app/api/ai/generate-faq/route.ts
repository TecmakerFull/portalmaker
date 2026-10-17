// =============================================================================
// PORTALMAKER — Generador de Preguntas Frecuentes (FAQ) con IA
// Crea preguntas y respuestas frecuentes para productos maker sin emojis.
// =============================================================================

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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
    const { nombre, descripcion, categoria, materiales, tiempoFabricacion } = body

    if (!nombre) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos el título o nombre del producto.' },
        { status: 400 }
      )
    }

    const systemInstruction = `Eres un asistente experto en e-commerce y atención al cliente de tiendas de makers, impresión 3D, diseño y artesanías.
Tu tarea es redactar entre 3 y 4 preguntas frecuentes (FAQ) con sus respuestas claras y concisas que los compradores suelen hacer antes de comprar este producto.

REGLAS CRÍTICAS:
1. TOTALMENTE PROHIBIDO EL USO DE EMOJIS en preguntas y respuestas.
2. Cada respuesta debe tener entre 1 y 3 oraciones directas, honestas y profesionales.
3. Temas prioritarios para las preguntas:
   - Resistencia y materiales (ej: cómo cuidarlo, si tolera altas temperaturas, agua o sol).
   - Opciones de personalización o colores disponibles.
   - Tiempos de fabricación o preparación y empaque seguro.
   - Instalación o modo de uso.
4. Responde ÚNICAMENTE un array JSON bajo la clave "faqs" donde cada elemento tenga:
   { "pregunta": "¿...?", "respuesta": "..." }
   Sin markdown extra ni texto fuera del JSON.`

    const userPrompt = `Genera las preguntas frecuentes para este producto:
- Nombre: ${nombre}
${categoria ? `- Categoría: ${categoria}` : ''}
${materiales ? `- Materiales / Atributos: ${materiales}` : ''}
${tiempoFabricacion ? `- Tiempo estimado de fabricación: ${tiempoFabricacion}` : ''}
${descripcion ? `- Descripción del producto: ${descripcion.substring(0, 400)}` : ''}`

    const models = ['gemini-3.8-flash', 'gemini-2.5-flash']
    let parsedResult = null
    let lastError = null

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }] }],
              generationConfig: {
                temperature: 0.5,
                responseMimeType: 'application/json',
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

    if (!parsedResult || !Array.isArray(parsedResult.faqs)) {
      return NextResponse.json(
        { error: lastError || 'No se pudieron generar las preguntas frecuentes.' },
        { status: 502 }
      )
    }

    // Limpieza de emojis
    const sanitizeNoEmojis = (str: string) =>
      str.replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ''
      ).trim()

    const sanitizedFaqs = parsedResult.faqs
      .filter((f: any) => f && f.pregunta && f.respuesta)
      .map((f: any) => ({
        pregunta: sanitizeNoEmojis(String(f.pregunta)),
        respuesta: sanitizeNoEmojis(String(f.respuesta)),
      }))

    return NextResponse.json({
      success: true,
      faqs: sanitizedFaqs,
    })
  } catch (error: any) {
    console.error('Error en /api/ai/generate-faq:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno al generar preguntas frecuentes.' },
      { status: 500 }
    )
  }
}
