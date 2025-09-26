
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { constructDynamicPrompt } from "./promptBuilder.ts"
import { fetchTranscriptMetadata } from "./assemblyAIUtils.ts"
import type { AnalysisRequest } from "./types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    } = await req.json() as AnalysisRequest;

    if (!transcriptionText || transcriptionText.length < 10) {
      throw new Error('Texto de transcripción demasiado corto o vacío');
    }

    console.log(`Analyzing transcription text (${transcriptionText.length} chars)${transcriptId ? ' with ID: ' + transcriptId : ''}`);
    console.log(`Using ${categories.length} categories and ${clients.length} clients for analysis`);
    
    let additionalContext = '';
    let hasSpeakerLabels = false;
    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    
    if (transcriptId && assemblyKey) {
      const metadata = await fetchTranscriptMetadata(transcriptId, assemblyKey);
      additionalContext = metadata.additionalContext;
      hasSpeakerLabels = metadata.hasSpeakerLabels;
    } else {
      // Check if the transcription text itself contains speaker labels
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
