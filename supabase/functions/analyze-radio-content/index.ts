import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function constructDynamicPrompt(
  categories: string[] = [],
  clients: { name: string; keywords: string[] }[] = [],
  additionalContext: string = '',
  hasSpeakerLabels: boolean = false
): string {
  // Format categories list
  const categoriesText = categories.length > 0 
    ? categories.join(', ')
    : 'ENTRETENIMIENTO, EDUCACION & CULTURA, COMUNIDAD, SALUD, CRIMEN, TRIBUNALES, AMBIENTE & EL TIEMPO, ECONOMIA & NEGOCIOS, GOBIERNO, POLITICA, EE.UU. & INTERNACIONALES, DEPORTES, RELIGION, OTRAS, ACCIDENTES, CIENCIA & TECNOLOGIA';

  // Format clients list
  const clientsText = clients.length > 0
    ? clients.map(c => c.name).join(', ')
    : '';

  // Build client-keyword mapping
  const clientKeywordMap = clients.length > 0
    ? clients.map(client => {
        const keywords = client.keywords?.length > 0
          ? client.keywords.join(', ')
          : '—';
        return `- ${client.name}: ${keywords}`;
      }).join('\n')
    : '';

  // Construct the base prompt with enhanced ad detection
  let prompt = `Eres un analista experto en contenido de radio. Tu tarea es analizar la siguiente transcripción de un programa de radio en español. ES MUY IMPORTANTE que identifiques correctamente si es un anuncio publicitario o contenido regular.

PASO 1 - IDENTIFICACIÓN DEL TIPO DE CONTENIDO:
Primero, identifica si el contenido es un anuncio publicitario o contenido regular del programa.
Busca estas señales para identificar anuncios:
- Menciones de precios, ofertas o descuentos
- Llamadas a la acción ("llame ahora", "visite nuestra tienda", etc.)
- Información de contacto (números de teléfono, direcciones)
- Menciones repetidas de marcas o productos específicos
- Lenguaje persuasivo o promocional
- Menciones de "promoción", "oferta especial", "disponible en", etc.

DEBES comenzar tu respuesta con uno de estos encabezados en mayúsculas:
[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]
o
[TIPO DE CONTENIDO: PROGRAMA REGULAR]

PASO 2 - ANÁLISIS DETALLADO:

Si es un ANUNCIO PUBLICITARIO, incluye:
1. Marca(s) o producto(s) anunciados
2. Mensajes clave del anuncio
3. Llamada a la acción (si existe)
4. Tono del anuncio (persuasivo, informativo, emocional, etc.)
5. Duración aproximada (corto/medio/largo)

Ejemplo de formato para anuncio:
[TIPO DE CONTENIDO: ANUNCIO PUBLICITARIO]
Marca: Supermercados Grande
Mensajes clave: 
- Ofertas de fin de semana
- Productos frescos a mejor precio
Llamada a acción: "Visite nuestras tiendas este fin de semana"
Tono: Informativo y persuasivo
Duración: Corto (30 segundos aprox.)

Si es PROGRAMA REGULAR, incluye:
1. Una síntesis general del contenido (7-10 oraciones)
2. Identificación de los temas principales tratados (7-10 temas listados)
3. Tono general del contenido (formal/informal, informativo/opinión)
4. Posibles categorías o géneros radiofónicos que aplican. Categorías disponibles: ${categoriesText}`;

  // Add specific speaker analysis if speaker labels are available
  if (hasSpeakerLabels) {
    prompt += `
5. Identificación de los participantes en la conversación (cuántos hablantes participan y si se pueden identificar sus roles o nombres)`;
  }

  // Add clients section if available
  if (clientsText) {
    prompt += `
${hasSpeakerLabels ? '6' : '5'}. Presencia de personas o entidades relevantes mencionadas
${hasSpeakerLabels ? '7' : '6'}. Clientes relevantes que podrían estar interesados en este contenido. Lista de clientes disponibles: ${clientsText}`;
  } else {
    prompt += `
${hasSpeakerLabels ? '6' : '5'}. Presencia de personas o entidades relevantes mencionadas`;
  }

  // Add keyword mapping if available
  if (clientKeywordMap) {
    prompt += `
${hasSpeakerLabels ? '8' : '7'}. Palabras clave mencionadas relevantes para los clientes. Lista de correlación entre clientes y palabras clave:
${clientKeywordMap}

Responde en español de manera concisa y profesional. Asegúrate de:
1. Comenzar SIEMPRE con el encabezado de tipo de contenido correspondiente en mayúsculas
2. Si es un anuncio, enfatizar las marcas, productos y llamadas a la acción
3. Si es contenido regular, mantener el formato de análisis detallado
4. Incluir las palabras textuales que justifiquen las asociaciones con clientes o palabras clave`;
  } else {
    prompt += `\n\nResponde en español de manera concisa y profesional, comenzando SIEMPRE con el encabezado del tipo de contenido identificado en mayúsculas.`;
  }

  // Add speaker-specific instructions if available
  if (hasSpeakerLabels) {
    prompt += `\n\nLa transcripción incluye etiquetas de hablantes (SPEAKER A, SPEAKER B, etc.). Utiliza esta información para identificar diferentes personas, sus roles y la dinámica de la conversación.`;
  }

  // Add any additional context provided
  if (additionalContext) {
    prompt += additionalContext;
  }

  return prompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      transcriptionText, 
      transcriptId,
      categories = [],
      clients = [] 
    } = await req.json();

    if (!transcriptionText || transcriptionText.length < 10) {
      throw new Error('Texto de transcripción demasiado corto o vacío');
    }

    console.log(`Analyzing transcription text (${transcriptionText.length} chars)${transcriptId ? ' with ID: ' + transcriptId : ''}`);
    console.log(`Using ${categories.length} categories and ${clients.length} clients for analysis`);
    
    // If we have a transcript ID, we could fetch additional metadata from AssemblyAI if needed
    let additionalContext = '';
    let hasSpeakerLabels = false;
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
        
        // Check for speaker labels (utterances)
        const utterancesResponse = await fetch(
          `https://api.assemblyai.com/v2/transcript/${transcriptId}/utterances`,
          {
            headers: {
              'Authorization': assemblyKey,
            },
          }
        );
        
        if (utterancesResponse.ok) {
          const utterancesData = await utterancesResponse.json();
          if (utterancesData.utterances?.length > 0) {
            hasSpeakerLabels = true;
            const speakerCount = new Set(utterancesData.utterances.map((u: any) => u.speaker)).size;
            additionalContext += `\nLa transcripción incluye etiquetas de ${speakerCount} hablantes distintos.`;
          }
        }
      } catch (error) {
        console.error('Error fetching additional metadata:', error);
        // Non-fatal, continue without it
      }
    }
    
    // Check if the transcription text itself contains speaker labels
    if (!hasSpeakerLabels) {
      const speakerLabelRegex = /SPEAKER [A-Z]\s*\(\d+:\d+\):/i;
      hasSpeakerLabels = speakerLabelRegex.test(transcriptionText);
    }
    
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    const systemPrompt = constructDynamicPrompt(
      categories.map((c: any) => typeof c === 'string' ? c : c.name_es || c.name), 
      clients,
      additionalContext,
      hasSpeakerLabels
    );

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
            content: systemPrompt
          },
          { 
            role: 'user', 
            content: transcriptionText
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
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
