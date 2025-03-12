
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
      
      Cada segmento debe seguir este formato JSON exacto:
      {
        "segment_number": [número de 1 a 6],
        "segment_title": [título analítico breve del segmento],
        "transcript": [resumen analítico del segmento, NO el texto literal],
        "timestamp_start": "00:00:00",
        "timestamp_end": "00:00:00"
      }
      
      Asegúrate de que cada segmento represente un tema o enfoque distinto, no solo dividir el texto en partes iguales.
      
      Devuelve un array de exactamente 6 objetos JSON después de la línea separadora.`

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
              // If we can't parse a segment, create a placeholder
              return {
                segment_number: segments.length + 1,
                segment_title: `Segmento ${segments.length + 1}`,
                transcript: "No se pudo analizar este segmento correctamente.",
                timestamp_start: "00:00:00",
                timestamp_end: "00:00:00"
              }
            }
          }).filter(segment => segment !== null)
        }
        
        // Make sure we have exactly 6 segments
        while (segments.length < 6) {
          segments.push({
            segment_number: segments.length + 1,
            segment_title: `Segmento ${segments.length + 1}`,
            transcript: "",
            timestamp_start: "00:00:00",
            timestamp_end: "00:00:00"
          });
        }
        
        // Limit to exactly 6 segments
        segments = segments.slice(0, 6);
      } catch (error) {
        console.error('Error extracting segments:', error)
        // Create 6 empty segments if extraction fails
        segments = Array(6).fill(null).map((_, i) => ({
          segment_number: i + 1,
          segment_title: `Segmento ${i + 1}`,
          transcript: "",
          timestamp_start: "00:00:00",
          timestamp_end: "00:00:00"
        }));
      }
    } else {
      // Create 6 empty segments if no segments part
      segments = Array(6).fill(null).map((_, i) => ({
        segment_number: i + 1,
        segment_title: `Segmento ${i + 1}`,
        transcript: "",
        timestamp_start: "00:00:00",
        timestamp_end: "00:00:00"
      }));
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
