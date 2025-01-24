import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CATEGORIES = [
  "ACCIDENTES", "AGENCIAS DE GOBIERNO", "AMBIENTE", "AMBIENTE & EL TIEMPO",
  "CIENCIA & TECNOLOGIA", "COMUNIDAD", "CRIMEN", "DEPORTES",
  "ECONOMIA & NEGOCIOS", "EDUCACION & CULTURA", "EE.UU. & INTERNACIONALES",
  "ENTRETENIMIENTO", "GOBIERNO", "OTRAS", "POLITICA", "RELIGION", "SALUD", "TRIBUNALES"
];

const CLIENTS = {
  "SALUD": ["First Medical", "Menonita", "MMM", "Auxilio Mutuo", "Pavia", "Therapy Network", "Merck"],
  "ENERGIA": ["Infinigen", "NF Energia", "AES"],
  "AUTOS": ["Ford"],
  "GOBIERNO": ["Etica Gubernamental", "Municipio de Naguabo", "PROMESA"],
  "SEGUROS": ["Coop de Seg Multiples"],
  "TELEVISION": ["Telemundo"],
  "AMBIENTE": ["Para la Naturaleza"],
  "INSTITUCIONES": ["Cruz Roja Americana", "Hospital del niño"],
  "ALCOHOL": ["Serrallés"],
  "COMIDA": ["McDonald's"],
  "CARRETERAS": ["Metropistas"]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const userId = formData.get('userId')

    if (!file || !(file instanceof File)) {
      throw new Error('No file provided')
    }

    if (!userId) {
      throw new Error('No user ID provided')
    }

    console.log('Processing file:', file.name, 'type:', file.type)

    // First get the transcription
    const whisperFormData = new FormData()
    whisperFormData.append('file', file, file.name)
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('response_format', 'verbose_json')
    whisperFormData.append('language', 'es')

    console.log('Getting transcription from Whisper API...')
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    })

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text()
      console.error('Whisper API error:', errorText)
      throw new Error(`Whisper API error: ${errorText}`)
    }

    const whisperResult = await whisperResponse.json()
    console.log('Transcription completed successfully')

    // Now analyze the transcription with GPT-4
    console.log('Analyzing transcription with GPT-4...')
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente de monitoreo para Publimedia especializado en televisión. Tu misión es analizar transcripciones de contenido televisivo y seguir las pautas proporcionadas. Este análisis está enfocado en generar resúmenes, alertas y reportes precisos para los clientes de Publimedia.

            Al analizar el contenido, debes:
            1. Identificar la categoría más apropiada de: ${CATEGORIES.join(', ')}
            2. Identificar clientes relevantes de la lista proporcionada
            3. Generar un resumen que responda las 5 W:
               - What (Qué): ¿Qué ha sucedido?
               - Who (Quién): Protagonistas o entidades involucradas
               - Where (Dónde): Lugar del suceso
               - When (Cuándo): Momento en que ocurrió
               - Why (Por qué): Motivo o razón del evento

            Responde en formato JSON con esta estructura:
            {
              "category": "CATEGORIA",
              "summary": "RESUMEN DETALLADO",
              "relevant_clients": ["CLIENTE1", "CLIENTE2"],
              "keywords": ["PALABRA_CLAVE1", "PALABRA_CLAVE2"]
            }`
          },
          {
            role: 'user',
            content: whisperResult.text
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!analysisResponse.ok) {
      throw new Error('Failed to analyze transcription with GPT-4');
    }

    const analysisResult = await analysisResponse.json();
    const analysis = JSON.parse(analysisResult.choices[0].message.content);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Save transcription and analysis to database
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        transcription_text: whisperResult.text,
        category: analysis.category,
        summary: analysis.summary,
        relevant_clients: analysis.relevant_clients,
        keywords: analysis.keywords,
        status: 'completed',
        original_file_path: file.name,
        progress: 100
      })

    if (dbError) {
      console.error('Error saving transcription:', dbError)
      throw new Error('Failed to save transcription')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: whisperResult.text,
        analysis
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error in secure-transcribe function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})