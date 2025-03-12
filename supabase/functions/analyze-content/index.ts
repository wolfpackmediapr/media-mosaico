
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { transcriptionText } = await req.json()
    
    if (!transcriptionText) {
      throw new Error('No transcription text provided')
    }

    const systemPrompt = `Eres un asistente especializado en analizar transcripciones de noticias de televisión.
      
      Analiza el texto proporcionado y extrae la información en este formato exacto:

      * Canal: [nombre del canal]
      * Programa/horario: [nombre del programa] / [horario]
      * Título del segmento: [título principal extraído o generado]
      * Descripción general: [descripción general del contenido analizado]
      * Keywords: [palabras clave separadas por coma]

      Mantén el formato exacto y asegúrate de incluir todos los campos.
      Si no puedes determinar algún dato con certeza, usa "No especificado".

      NO incluyas ninguna línea o sección con "---SEGMENTOS---" en tu respuesta.

      Adicionalmente, genera EXACTAMENTE 6 segmentos distintos basados en:
      1. Cambios de tema (identificando donde empieza una nueva noticia o tema)
      2. Estructura natural del contenido periodístico (presentación, desarrollo, entrevistas, conclusiones)
      3. Posibles transiciones entre reporteros o presentadores
       
      Es CRUCIAL que identifiques 6 segmentos distintos, cada uno representando un bloque conceptual independiente.
      
      Para cada segmento, proporciona:
      1. Un título analítico y periodístico (no descriptivo)
      2. Un resumen conciso del contenido específico de ese segmento
      3. Aproximaciones de timestamps (no tienes que ser exacto, puedes estimarlos)
      4. Lista de 3 a 5 palabras clave específicas para cada segmento
       
      Cada segmento debe seguir este formato JSON exacto dentro de una array:
      {
        "segment_number": [número de 1 a 6],
        "segment_title": [título analítico breve del segmento],
        "transcript": [resumen analítico del segmento, NO el texto literal],
        "timestamp_start": "00:00:00",
        "timestamp_end": "00:00:00",
        "keywords": ["palabra1", "palabra2", "palabra3"]
      }
      
      La respuesta completa tendrá dos partes:
      1. El análisis general (Canal, Programa, etc.)
      2. Un array JSON con 6 objetos de segmentos

      No incluyas la palabra "---SEGMENTOS---" ni ningún otro separador en tu respuesta.`

    // Call OpenAI or similar service to analyze the text
    const apiKey = Deno.env.get("OPENAI_API_KEY")
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable not set")
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: transcriptionText }
        ],
        temperature: 0.7,
        max_tokens: 2500
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const data = await response.json()
    let analysis = data.choices[0].message.content

    // Extract segments from analysis by finding JSON array
    let segments = []
    try {
      // Look for array of JSON objects - any properly formatted JSON array
      const jsonMatch = analysis.match(/\[\s*\{[\s\S]*\}\s*\]/g)
      if (jsonMatch && jsonMatch[0]) {
        segments = JSON.parse(jsonMatch[0])
        
        // Remove the JSON array from the analysis text to clean up the output
        analysis = analysis.replace(jsonMatch[0], "").trim()
      } else {
        // Fallback: try to extract individual JSON objects
        const jsonObjects = analysis.match(/\{[^{}]*\}/g)
        if (jsonObjects) {
          segments = jsonObjects.map(obj => JSON.parse(obj))
        }
      }
    } catch (e) {
      console.error('Error parsing segments:', e)
    }

    // Remove any "---SEGMENTOS---" text if it still appears
    analysis = analysis.replace(/---SEGMENTOS---/g, "").trim()

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis, 
        segments
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
