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

    // Prepare form data for OpenAI Whisper
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

    // Analyze the transcription with GPT-4
    console.log('Analyzing transcription with GPT-4...');
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a media analysis assistant specialized in analyzing Spanish language news content. 
            Analyze the provided transcription and extract key information following the 5W framework (Who, What, When, Where, Why).
            Additionally, identify relevant keywords, potential alerts, and categorize the content.
            
            Provide your analysis in Spanish, structured as a JSON object with the following fields:
            {
              "quien": "who is involved",
              "que": "what happened",
              "cuando": "when it happened",
              "donde": "where it happened",
              "porque": "why it happened",
              "summary": "brief summary of the content",
              "category": "one of ${CATEGORIES.join(', ')}",
              "alerts": ["array of important alerts or warnings"],
              "keywords": ["array of relevant keywords"],
              "client_relevance": {
                "high_relevance": ["clients highly relevant to this content"],
                "medium_relevance": ["clients somewhat relevant to this content"],
                "mentions": ["clients directly mentioned"]
              }
            }`
          },
          {
            role: 'user',
            content: whisperResult.text
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
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
    );

    // Save transcription and analysis to database
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        transcription_text: whisperResult.text,
        analysis_quien: analysis.quien,
        analysis_que: analysis.que,
        analysis_cuando: analysis.cuando,
        analysis_donde: analysis.donde,
        analysis_porque: analysis.porque,
        analysis_summary: analysis.summary,
        analysis_category: analysis.category,
        analysis_alerts: analysis.alerts,
        analysis_keywords: analysis.keywords,
        analysis_client_relevance: analysis.client_relevance,
        status: 'completed',
        original_file_path: file.name,
        progress: 100
      });

    if (dbError) {
      console.error('Error saving transcription:', dbError);
      throw new Error('Failed to save transcription');
    }

    // Generate alerts for relevant clients
    if (analysis.client_relevance.high_relevance.length > 0) {
      const alerts = analysis.client_relevance.high_relevance.map((clientName: string) => ({
        client_id: clientName, // You might want to query the clients table to get the actual ID
        transcription_id: null, // This will be updated once we have the transcription ID
        priority: 'high',
        title: `Contenido relevante detectado para ${clientName}`,
        description: analysis.summary
      }));

      // Save alerts to database
      const { error: alertsError } = await supabase
        .from('client_alerts')
        .insert(alerts);

      if (alertsError) {
        console.error('Error saving alerts:', alertsError);
      }
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