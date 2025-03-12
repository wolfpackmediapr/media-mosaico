
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

    const systemPrompt = `Eres un asistente especializado en analizar transcripciones de noticias de televisión en español.
      
      Analiza el texto proporcionado y extrae SOLO la siguiente información en este formato específico:

      * Canal: [nombre del canal]
      * Programa/horario: [nombre del programa] / [horario]
      * Título del segmento: [título principal extraído o generado]
      * Descripción general: [descripción general del contenido analizado]
      * Keywords: [palabras clave separadas por coma]

      Mantén el formato exacto y asegúrate de incluir todos los campos.
      Si no puedes determinar algún dato con certeza, usa "No especificado".

      IMPORTANTE: Tu respuesta debe dividirse en DOS SECCIONES completamente separadas:

      SECCIÓN 1: La información de análisis general con EXACTAMENTE el formato de puntos especificado arriba.
      
      SECCIÓN 2: Un array JSON con 6 objetos de segmentos, con la siguiente estructura:
      [
        {
          "segment_number": 1,
          "segment_title": "Título del segmento 1",
          "transcript": "Resumen analítico del segmento",
          "timestamp_start": "00:00:00",
          "timestamp_end": "00:00:00",
          "keywords": ["palabra1", "palabra2", "palabra3"]
        },
        ... y así sucesivamente para los 6 segmentos
      ]

      Para cada segmento, debes identificar:
      1. Un título analítico y periodístico (no descriptivo)
      2. Un resumen conciso del contenido específico de ese segmento
      3. Timestamps aproximados (inicio y fin)
      4. Lista de 3 a 5 palabras clave específicas para cada segmento

      NO mezcles estas dos secciones. Deben estar claramente separadas.
      La primera sección debe ser SOLAMENTE texto plano con el formato de lista.
      La segunda sección debe ser SOLAMENTE un array JSON válido.`

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
    let analysisText = data.choices[0].message.content

    // This improved regex finds any JSON array pattern (with any content inside)
    // It looks for a pattern starting with [ followed by { and ending with } ]
    // The [\s\S]*? means "any character including newlines, as few as possible"
    const jsonArrayRegex = /\[\s*\{[\s\S]*?\}\s*\]/g
    
    // Extract segments JSON array from the analysis text
    let segments = []
    const jsonMatches = analysisText.match(jsonArrayRegex)
    
    if (jsonMatches && jsonMatches.length > 0) {
      try {
        // Parse the first JSON array found in the text
        segments = JSON.parse(jsonMatches[0])
        
        // Remove all JSON arrays from the analysis text
        analysisText = analysisText.replace(jsonArrayRegex, "")
      } catch (e) {
        console.error('Error parsing segments JSON:', e)
      }
    }
    
    // Clean up the analysis text - remove any remaining JSON object snippets
    // This regex matches any standalone JSON object pattern
    const jsonObjectRegex = /\{[^{}]*\}/g
    analysisText = analysisText.replace(jsonObjectRegex, "")
    
    // Remove any extraneous markers or separators that might have been added
    analysisText = analysisText
      .replace(/---[A-Za-z0-9_-]+---/g, "") // Remove any markdown-style separators
      .replace(/SECCIÓN [0-9]+:/gi, "")     // Remove section markers
      .replace(/```(?:json)?[\s\S]*?```/g, "") // Remove any code blocks
      .trim()

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: analysisText, 
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
