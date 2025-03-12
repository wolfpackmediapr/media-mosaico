
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
      Tu tarea principal es identificar y segmentar los diferentes temas y noticias presentes en la transcripción.

      Primero, analiza el texto proporcionado y extrae la información en este formato exacto:

      * Canal: [nombre del canal]
      * Programa/horario: [nombre del programa] / [horario]
      * Título del segmento: [título principal extraído o generado]
      * Descripción general: [descripción general del contenido analizado]
      * Keywords: [palabras clave separadas por coma]

      Mantén el formato exacto y asegúrate de incluir todos los campos.
      Si no puedes determinar algún dato con certeza, usa "No especificado".

      Segundo, después de una línea que contenga solo "---SEGMENTOS---", divide la transcripción en EXACTAMENTE 6 segmentos distintos basados en:
      1. Cambios de tema (identificando donde empieza una nueva noticia o tema)
      2. Estructura natural del contenido periodístico (presentación, desarrollo, entrevistas, conclusiones)
      3. Posibles transiciones entre reporteros o presentadores
       
      Es CRUCIAL que identifiques 6 segmentos distintos, cada uno representando un bloque conceptual independiente.
      Si el contenido es muy breve, identifica cambios sutiles en el enfoque o presentación.
      Si el contenido es extenso, prioriza los temas principales y más diferenciados.
      
      Para cada segmento, proporciona:
      1. Un título analítico y periodístico (no descriptivo)
      2. Un resumen conciso del contenido específico de ese segmento
      3. Aproximaciones de timestamps (no tienes que ser exacto, puedes estimarlos)
      4. Lista de 3 a 5 palabras clave específicas para cada segmento
       
      Cada segmento debe seguir este formato JSON exacto:
      {
        "segment_number": [número de 1 a 6],
        "segment_title": [título analítico breve del segmento],
        "transcript": [resumen analítico del segmento, NO el texto literal],
        "timestamp_start": "00:00:00",
        "timestamp_end": "00:00:00",
        "keywords": ["palabra1", "palabra2", "palabra3"]
      }
      
      Asegúrate de que cada segmento represente un tema o enfoque distinto, no solo dividir el texto en partes iguales.
       
      Devuelve un array de exactamente 6 objetos JSON después de la línea separadora.`

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
    const analysis = data.choices[0].message.content

    // Extract segments from analysis
    const segmentsPart = analysis.split('---SEGMENTOS---')[1]
    let segments = []

    if (segmentsPart) {
      try {
        // Look for array of JSON objects
        const jsonMatch = segmentsPart.match(/\[\s*\{.*\}\s*\]/s)
        if (jsonMatch) {
          segments = JSON.parse(jsonMatch[0])
        } else {
          // Fallback: try to extract individual JSON objects
          const jsonObjects = segmentsPart.match(/\{[^{}]*\}/g)
          if (jsonObjects) {
            segments = jsonObjects.map(obj => JSON.parse(obj))
          }
        }
      } catch (e) {
        console.error('Error parsing segments:', e)
      }
    }

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
