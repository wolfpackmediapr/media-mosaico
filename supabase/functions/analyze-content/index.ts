import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CATEGORIES = [
  "ACCIDENTES",
  "AGENCIAS DE GOBIERNO",
  "AMBIENTE",
  "AMBIENTE & EL TIEMPO",
  "CIENCIA & TECNOLOGIA",
  "COMUNIDAD",
  "CRIMEN",
  "DEPORTES",
  "ECONOMIA & NEGOCIOS",
  "EDUCACION & CULTURA",
  "EE.UU. & INTERNACIONALES",
  "ENTRETENIMIENTO",
  "GOBIERNO",
  "OTRAS",
  "POLITICA",
  "RELIGION",
  "SALUD",
  "TRIBUNALES"
];

const CLIENTS = {
  "SALUD/PLANES MEDICOS": ["First Medical", "Menonita", "MMM"],
  "SALUD/HOSPITALES": ["Adworks Auxilio Mutuo", "Pavia", "Therapy Network"],
  "SALUD/FARMACEUTICAS": ["Merck"],
  "ENERGIA": ["Infinigen", "NF Energia", "AES"],
  "AUTOS": ["Ford"],
  "GOBIERNO": ["Etica Gubernamental", "Municipio de Naguabo", "PROMESA"],
  "SEGUROS": ["Coop de Seg Multiples"],
  "TELEVISION": ["Telemundo"],
  "AMBIENTE": ["Para la Naturaleza"],
  "INSTITUCIONES SIN FINES DE LUCRO": ["Cruz Roja Americana", "Hospital del niño"],
  "ALCOHOL": ["Serrallés"],
  "COMIDA RAPIDA": ["McDonald's"],
  "CARRETERAS": ["Metropistas"]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { transcriptionText } = await req.json()

    if (!transcriptionText) {
      throw new Error('No transcription text provided')
    }

    console.log('Analyzing content:', transcriptionText.substring(0, 100) + '...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente especializado en análisis de contenido para Publimedia PR. 
            Analiza el contenido proporcionado y genera un análisis detallado en español que incluya:
            
            1. Categoría principal (una de: ${CATEGORIES.join(', ')})
            2. Resumen del contenido
            3. Clientes relevantes de la lista proporcionada
            4. Palabras clave importantes
            5. Alertas o notificaciones si el contenido es altamente relevante para algún cliente
            
            Responde en formato JSON con la siguiente estructura:
            {
              "category": "CATEGORIA",
              "summary": "resumen del contenido",
              "client_relevance": {
                "client_name": "descripción de la relevancia",
                ...
              },
              "keywords": ["palabra1", "palabra2", ...],
              "notifications": [
                {
                  "client": "nombre del cliente",
                  "importance": "alta/media/baja",
                  "message": "mensaje de la notificación"
                },
                ...
              ]
            }`
          },
          {
            role: 'user',
            content: transcriptionText
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    const analysis = JSON.parse(result.choices[0].message.content);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update the transcription record with the analysis
    const { error: updateError } = await supabase
      .from('transcriptions')
      .update({
        analysis_category: analysis.category,
        analysis_content_summary: analysis.summary,
        analysis_client_relevance: analysis.client_relevance,
        analysis_keywords: analysis.keywords,
        analysis_notifications: analysis.notifications
      })
      .eq('transcription_text', transcriptionText);

    if (updateError) {
      console.error('Error updating transcription:', updateError);
      throw new Error('Failed to save analysis results');
    }

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-content function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});