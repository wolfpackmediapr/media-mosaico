
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { constructTvPrompt } from './tvPromptBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      supabaseClient.auth.setAuth(authHeader.replace('Bearer ', ''));
    }

    const { transcriptionText, transcriptId, categories = [], clients = [] } = await req.json();

    if (!transcriptionText) {
      throw new Error('El texto de transcripción es requerido');
    }

    console.log('[analyze-tv-content] Processing request:', {
      textLength: transcriptionText.length,
      transcriptId,
      categoriesCount: categories.length,
      clientsCount: clients.length
    });

    // Build the TV-specific prompt
    const prompt = constructTvPrompt(categories, clients, '', false);
    const userPrompt = `${prompt}\n\nTranscripción:\n${transcriptionText}`;

    console.log('[analyze-tv-content] Calling Google Gemini API');

    // Call Google Gemini API
    const geminiApiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Google Gemini API key not configured');
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: userPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[analyze-tv-content] Gemini API error:', errorText);
      throw new Error(`Error en la API de Gemini: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('[analyze-tv-content] Gemini response received');

    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      throw new Error('No se recibió respuesta válida de Gemini');
    }

    const analysis = geminiData.candidates[0].content.parts[0].text;

    // Store analysis if transcriptId is provided
    if (transcriptId) {
      console.log('[analyze-tv-content] Storing analysis for transcript:', transcriptId);
      
      // Check if this is a TV transcription (has tv_transcriptions table)
      const { error: updateError } = await supabaseClient
        .from('tv_transcriptions')
        .update({
          analysis_result: analysis,
          analyzed_at: new Date().toISOString()
        })
        .eq('id', transcriptId);

      if (updateError) {
        console.error('[analyze-tv-content] Error storing analysis:', updateError);
        // Don't throw here - analysis was successful, storage is secondary
      }
    }

    console.log('[analyze-tv-content] Analysis completed successfully');

    return new Response(
      JSON.stringify({ 
        analysis,
        success: true 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[analyze-tv-content] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error interno del servidor',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
