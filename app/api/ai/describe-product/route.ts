// =============================================================================
// PORTALMAKER — Generador de Descripciones de Producto con Inteligencia Artificial
// Utiliza Google Gemini API para crear descripciones comerciales atractivas,
// técnicas y concisas para la vitrina del maker.
//
// Regla Crítica del Proyecto: SIN EMOJIS en el contenido generado.
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
        {
          error:
            'Clave de API de Gemini no configurada. Por favor agrega GEMINI_API_KEY en tu archivo .env.local o en las variables de entorno de Cloudflare / Vercel.',
        },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      nombre,
      promptDetalles,
      categoria,
      longitud = 'concisa',
    } = body

    if (!nombre && !promptDetalles) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos el nombre del producto o algunas características clave.' },
        { status: 400 }
      )
    }

    const wordLimit = longitud === 'detallada' ? '180 a 240 palabras' : '90 a 140 palabras'

    const systemInstruction = `Eres un redactor profesional de e-commerce especializado en productos de makers, talleres de diseño, impresión 3D, corte láser y artesanía de precisión.
Tu misión es redactar una descripción de producto comercial, atractiva y precisa en español (neutro / rioplatense sutil para Argentina y Latinoamérica).

REGLAS CRÍTICAS NO NEGOCIABLES:
1. TOTALMENTE PROHIBIDO USAR EMOJIS. No uses ni un solo emoji en ninguna parte del texto.
2. Longitud máxima: ${wordLimit}. Debe ser conciso, legible y directo al grano para que el comprador tome una decisión rápida.
3. Estructura:
   - Primer párrafo breve: gancho comercial de 1 o 2 oraciones destacando la utilidad y valor del producto.
   - Lista con viñetas (- ): características técnicas clave (materiales, resistencia, compatibilidad, acabados o medidas).
   - Frase final breve: recomendación de uso, cuidado o compromiso de calidad artesanal/maker.
4. Usa formato Markdown limpio con negritas sutiles para resaltar datos importantes. No uses títulos gigantes H1 o H2.`

    const userPrompt = `Genera la descripción para el siguiente producto:
- Nombre del producto: ${nombre || 'Sin título definido'}
${categoria ? `- Categoría: ${categoria}` : ''}
${promptDetalles ? `- Puntos clave / Prompt del maker: ${promptDetalles}` : ''}

Recuerda: Cero emojis, redacción profesional, estructura concisa con viñetas y formato Markdown.`

    // Intentar invocar gemini-3.8-flash (o fallback a gemini-2.5-flash)
    const models = ['gemini-3.8-flash', 'gemini-2.5-flash']
    let generatedText = ''
    let lastError = null

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemInstruction}\n\n${userPrompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 600,
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
          // Limpiar cualquier emoji residual por seguridad estricta
          const cleanText = text.replace(
            /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
            ''
          )
          generatedText = cleanText.trim()
          break
        }
      } catch (err: any) {
        lastError = err?.message || 'Error de conexión con Google Gemini'
      }
    }

    if (!generatedText) {
      return NextResponse.json(
        { error: lastError || 'No se pudo generar la descripción con el modelo de IA.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      descripcion: generatedText,
    })
  } catch (error: any) {
    console.error('Error en /api/ai/describe-product:', error)
    return NextResponse.json(
      { error: error?.message || 'Error interno del servidor al procesar la IA.' },
      { status: 500 }
    )
  }
}
