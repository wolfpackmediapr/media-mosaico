
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { transcriptionText } = await req.json()
    
    // Validate input
    if (!transcriptionText || typeof transcriptionText !== 'string' || transcriptionText.trim().length === 0) {
      throw new Error('Invalid or empty transcription text provided')
    }
    
    console.log('Analyzing content:', transcriptionText.substring(0, 100) + '...')

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const systemPrompt = `Eres un asistente especializado en analizar transcripciones de noticias de televisión.
      Primero, analiza el texto proporcionado y extrae la información en este formato exacto:

      * Canal: [nombre del canal]
      * Programa/horario: [nombre del programa] / [horario]
      * Título de la noticia: [título extraído o generado]
      * Descripción o resumen de la noticia: [resumen conciso]
      * Keywords: [palabras clave separadas por coma]

      Mantén el formato exacto y asegúrate de incluir todos los campos.
      Si no puedes determinar algún dato con certeza, usa "No especificado".

      Segundo, después de una línea que contenga solo "---SEGMENTOS---", segmenta la transcripción en secciones distintas basadas en:
      1. Cambios de hablante (periodistas, presentadores, entrevistados)
      2. Transiciones de tema
      3. Estructura natural de la noticia
      
      Cada segmento debe seguir este formato JSON:
      {
        "segment_number": [número],
        "segment_title": [título breve y descriptivo del segmento],
        "transcript": [texto del segmento],
        "timestamp_start": "00:00:00",
        "timestamp_end": "00:00:00"
      }
      
      Devuelve un array de estos objetos JSON después de la línea separadora.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: transcriptionText
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      throw new Error(`Failed to analyze content: ${response.status} ${response.statusText}`);
    }

    const result = await response.json()
    const fullAnalysis = result.choices[0].message.content

    // Split the response into analysis and segments parts
    const parts = fullAnalysis.split('---SEGMENTOS---')
    
    let analysis = parts[0].trim()
    let segments = []
    
    // Parse segments if they exist
    if (parts.length > 1 && parts[1].trim()) {
      try {
        // Find all JSON objects in the text
        const jsonPattern = /\{[\s\S]*?\}/g
        const jsonMatches = parts[1].match(jsonPattern)
        
        if (jsonMatches && jsonMatches.length > 0) {
          segments = jsonMatches.map(jsonStr => {
            try {
              return JSON.parse(jsonStr)
            } catch (e) {
              console.error('Error parsing segment JSON:', e)
              return null
            }
          }).filter(segment => segment !== null)
        }
      } catch (error) {
        console.error('Error extracting segments:', error)
        // Continue with just the analysis part
      }
    }

    console.log('Analysis completed successfully')
    console.log('Number of segments extracted:', segments.length)

    return new Response(
      JSON.stringify({ analysis, segments }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Analysis error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
