import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from '@supabase/supabase-js';
import { startTranscription, getTranscriptionResult, updateTranscriptionStatus } from './assemblyai.ts';
import { corsHeaders } from './cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { videoPath } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Get the audio file URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(videoPath);

    // Start transcription
    const transcriptionId = await startTranscription(publicUrl);

    // Poll for results
    let result;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (attempts < maxAttempts) {
      result = await getTranscriptionResult(transcriptionId);
      
      if (result.status === 'completed') {
        await updateTranscriptionStatus(
          SUPABASE_URL,
          SUPABASE_ANON_KEY,
          transcriptionId,
          'completed',
          100,
          result.text
        );
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            text: result.text,
            metadata: {
              language: result.language_code,
              confidence: result.confidence,
              speakers: result.speaker_labels,
              entities: result.entities,
              iab_categories: result.iab_categories_result
            }
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error}`);
      }
      
      await updateTranscriptionStatus(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        transcriptionId,
        'processing',
        Math.round((attempts / maxAttempts) * 100)
      );
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Transcription timed out');
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});