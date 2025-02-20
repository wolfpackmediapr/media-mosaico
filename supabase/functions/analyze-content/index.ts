
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
    console.log('Analyzing content:', transcriptionText.substring(0, 100) + '...')

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

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
            content: `Eres un asistente especializado en analizar transcripciones de noticias de televisión.
              Analiza el texto proporcionado y extrae la información en este formato exacto:

              * Canal: [nombre del canal]
              * Programa/horario: [nombre del programa] / [horario]
              * Título de la noticia: [título extraído o generado]
              * Descripción o resumen de la noticia: [resumen conciso]
              * Keywords: [palabras clave separadas por coma]

              Mantén el formato exacto y asegúrate de incluir todos los campos.
              Si no puedes determinar algún dato con certeza, usa "No especificado".`
          },
          {
            role: 'user',
            content: transcriptionText
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to analyze content')
    }

    const result = await response.json()
    const analysis = result.choices[0].message.content

    console.log('Analysis completed successfully')

    return new Response(
      JSON.stringify({ analysis }),
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
