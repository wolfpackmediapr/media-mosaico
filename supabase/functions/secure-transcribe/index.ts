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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Processing transcription request...');
    const formData = await req.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');

    if (!file || !(file instanceof File)) {
      throw new Error('No file provided');
    }

    if (!userId) {
      throw new Error('No user ID provided');
    }

    console.log('Received file:', file.name, 'type:', file.type);

    // Prepare form data for OpenAI
    const whisperFormData = new FormData();
    whisperFormData.append('file', file);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('response_format', 'json');
    whisperFormData.append('language', 'es');

    console.log('Sending request to OpenAI Whisper API...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    console.log('Transcription completed successfully');

    // Now analyze the transcription with GPT-4
    console.log('Analyzing transcription with GPT-4...');
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
            content: `You are a TV monitoring assistant for Publimedia. Analyze this transcription and provide a JSON response with the following structure:
            {
              "category": "one of ${CATEGORIES.join(', ')}",
              "summary": "brief summary of the content",
              "relevant_clients": ["array of relevant client names"],
              "keywords": ["array of relevant keywords"]
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
    let analysis;
    try {
      // Ensure we're parsing a clean JSON string
      const cleanContent = analysisResult.choices[0].message.content.trim();
      analysis = JSON.parse(cleanContent);
      
      // Validate category
      if (!CATEGORIES.includes(analysis.category)) {
        throw new Error(`Invalid category: ${analysis.category}`);
      }
    } catch (error) {
      console.error('Error parsing GPT response:', error);
      throw new Error('Failed to parse analysis result');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
      });

    if (dbError) {
      console.error('Error saving transcription:', dbError);
      throw new Error('Failed to save transcription');
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
    );

  } catch (error) {
    console.error('Error in secure-transcribe function:', error);
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
    );
  }
});