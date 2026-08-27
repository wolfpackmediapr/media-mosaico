
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { constructDynamicPrompt } from "./promptBuilder.ts"
import { fetchTranscriptMetadata } from "./assemblyAIUtils.ts"
import { extractAnalysisFields } from "../_shared/analysisFieldExtractor.ts"
import type { AnalysisRequest } from "./types.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as AnalysisRequest & { transcriptionId?: string };
    const {
      transcriptionText,
      transcriptId,
      categories = [],
      clients = []
    } = body;

    // The radio UI holds the radio_transcriptions row id; accept it under
    // either key so older bundles keep working.
    const rowId = [body.transcriptionId, transcriptId].find(
      (v): v is string => typeof v === 'string' && UUID_RE.test(v),
    );

    if (!transcriptionText || transcriptionText.length < 10) {
      throw new Error('Texto de transcripción demasiado corto o vacío');
    }

    console.log(`Analyzing transcription text (${transcriptionText.length} chars)${rowId ? ' for row: ' + rowId : ''}`);
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
      throw new Error('OPENAI_API_KEY no está configurado');
    }

    const systemPrompt = constructDynamicPrompt(
      categories.map((c: any) => typeof c === 'string' ? c : c.name_es || c.name), 
      clients,
      additionalContext,
      hasSpeakerLabels
    );

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
    let analysis = d.choices?.[0]?.message?.content || '';

    if (!analysis) {
      analysis = 'No se pudo generar análisis';
    }
    console.log(`Analysis generated successfully via openai (${analysis.length} chars)`);

    // Persist the analysis so it survives the session and stays queryable
    // alongside TV. A storage failure must not lose the user's analysis, so it
    // is reported but the analysis text is still returned.
    let saved = false;
    let saveError: string | null = null;

    if (rowId && analysis !== 'No se pudo generar análisis') {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );

        const knownClients = (clients as any[])
          .map((c) => (typeof c === 'string' ? c : c?.name))
          .filter((n: unknown): n is string => typeof n === 'string' && n.length > 0);

        const updatePayload: Record<string, unknown> = {
          full_analysis: analysis,
          updated_at: new Date().toISOString(),
          ...extractAnalysisFields(analysis, knownClients),
        };

        const { error: updateError } = await supabase
          .from('radio_transcriptions')
          .update(updatePayload)
          .eq('id', rowId);

        if (updateError) {
          saveError = updateError.message;
          console.error('[analyze-radio-content] Failed to save analysis:', updateError);
        } else {
          saved = true;
          console.log(`[analyze-radio-content] Analysis saved to radio_transcriptions ${rowId}`);
        }
      } catch (persistError) {
        saveError = persistError instanceof Error ? persistError.message : String(persistError);
        console.error('[analyze-radio-content] Persistence error:', persistError);
      }
    } else if (!rowId) {
      console.warn('[analyze-radio-content] No transcription row id provided; analysis not persisted');
    }

    return new Response(
      JSON.stringify({ analysis, saved, saveError }),
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
