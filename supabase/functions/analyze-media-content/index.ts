
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
    const { title, content, contentType } = await req.json()
    
    if (!content) {
      throw new Error('No content provided for analysis')
    }

    console.log(`Analyzing ${contentType} content: ${title?.substring(0, 50)}...`)

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Prepare system prompt for the content analysis
    const systemPrompt = `You are an expert media analyst working for a media monitoring company. 
    Your job is to analyze media content (TV, Radio, Digital Press, Social Media) and classify it 
    into predefined categories while matching relevant clients.

    Extract key topics from the text.
    Classify the text into one of the following categories:
      - ACCIDENTES
      - AGENCIAS DE GOBIERNO
      - AMBIENTE
      - CIENCIA & TECNOLOGIA
      - CULTURA
      - DEPORTES
      - ECONOMIA & NEGOCIOS
      - EDUCACION
      - ENTRETENIMIENTO
      - INTERNACIONAL
      - POLITICA
      - SALUD
      - SEGURIDAD
      - SERVICIOS PUBLICOS
      - SOCIEDAD
      - TECNOLOGIA
      - TRANSPORTE

    Identify relevant clients from this list:
      - Salud: First Medical, Menonita, MMM
      - Autos: Ford, Toyota, Honda
      - Government: Municipio de Naguabo, PROMESA, AEE, AAA
      - Educación: Universidad de Puerto Rico, Sistema Ana G. Mendez
      - Tecnología: AT&T, T-Mobile, Claro
      - Energía: AES, EcoEléctrica, Luma Energy
    
    Return your analysis in JSON format with these fields:
    - category: The best matching category
    - matched_clients: Array of client names that are relevant to this content
    - summary: A concise summary of the content (max 150 words)
    - relevant_keywords: Array of 3-5 most relevant keywords or topics from the content`;

    // Call OpenAI for content analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Title: ${title || ''}\n\nContent: ${content}` }
        ],
        temperature: 0.5,
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`OpenAI API error: ${errorData}`)
    }

    const result = await response.json()
    const analysisData = JSON.parse(result.choices[0].message.content)
    
    console.log(`Analysis complete. Category: ${analysisData.category}, Matched clients: ${analysisData.matched_clients.length}`)

    return new Response(
      JSON.stringify(analysisData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Media analysis error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
