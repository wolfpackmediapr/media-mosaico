
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcriptionText, transcriptId } = await req.json();

    if (!transcriptionText || transcriptionText.length < 10) {
      throw new Error('Texto de transcripción demasiado corto o vacío');
    }

    console.log(`Analyzing transcription text (${transcriptionText.length} chars)${transcriptId ? ' with ID: ' + transcriptId : ''}`);
    
    // If we have a transcript ID, we could fetch additional metadata from AssemblyAI if needed
    let additionalContext = '';
    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    
    if (transcriptId && assemblyKey) {
      try {
        console.log('Fetching additional transcript metadata from AssemblyAI');
        const sentencesResponse = await fetch(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}/sentences`,
          {
            headers: {
              'Authorization': assemblyKey,
            },
          }
        );
        
        if (sentencesResponse.ok) {
          const sentencesData = await sentencesResponse.json();
          if (sentencesData.sentences?.length > 0) {
            additionalContext = `\nLa transcripción tiene ${sentencesData.sentences.length} oraciones con timestamps precisos.`;
          }
        }
      } catch (error) {
        console.error('Error fetching additional metadata:', error);
        // Non-fatal, continue without it
      }
    }
    
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: `Eres un analista experto en contenido de radio. Analiza la siguiente transcripción de un programa de radio en español y proporciona un resumen estructurado que incluya:
            
            1. Una síntesis general del contenido (2-3 oraciones)
            2. Identificación de los temas principales tratados (3-5 temas listados)
            3. Tono general del contenido (formal/informal, informativo/opinión)
            4. Posibles categorías o géneros radiofónicos que aplican (noticias, entrevista, debate, etc.)
            5. Presencia de personas o entidades relevantes mencionadas
            
            Responde en español de manera concisa y profesional.${additionalContext}`
          },
          { 
            role: 'user', 
            content: transcriptionText
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Error from OpenAI API: ${error}`);
    }

    const data = await response.json();
    const analysis = data.choices[0]?.message?.content || 'No se pudo generar análisis';

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    );
  }
});
