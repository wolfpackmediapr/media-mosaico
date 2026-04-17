
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
    
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const openAIKey = Deno.env.get('OPENAI_API_KEY');

    const systemPrompt = constructDynamicPrompt(
      categories.map((c: any) => typeof c === 'string' ? c : c.name_es || c.name), 
      clients,
      additionalContext,
      hasSpeakerLabels
    );

    // Prefer Lovable AI Gateway for reliability; fall back to OpenAI if unavailable
    let analysis = '';
    let usedProvider = '';

    const callLovableAI = async () => {
      const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcriptionText },
          ],
        }),
      });
      if (!r.ok) {
        const err = await r.text();
        throw new Error(`Lovable AI error (${r.status}): ${err}`);
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || '';
    };

    const callOpenAI = async () => {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: transcriptionText },
          ],
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });
      if (!r.ok) {
        const err = await r.text();
        throw new Error(`OpenAI error (${r.status}): ${err}`);
      }
      const d = await r.json();
      return d.choices?.[0]?.message?.content || '';
    };

    if (lovableKey) {
      try {
        analysis = await callLovableAI();
        usedProvider = 'lovable-ai';
      } catch (e) {
        console.warn('Lovable AI failed, falling back to OpenAI:', e instanceof Error ? e.message : String(e));
        if (!openAIKey) throw e;
        analysis = await callOpenAI();
        usedProvider = 'openai-fallback';
      }
    } else if (openAIKey) {
      analysis = await callOpenAI();
      usedProvider = 'openai';
    } else {
      throw new Error('No AI provider configured (LOVABLE_API_KEY or OPENAI_API_KEY required)');
    }

    if (!analysis) {
      analysis = 'No se pudo generar análisis';
    }
    console.log(`Analysis generated successfully via ${usedProvider} (${analysis.length} chars)`);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    );
  }
});
