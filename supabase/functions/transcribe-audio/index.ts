import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { startTranscription, getTranscriptionResult, updateTranscriptionStatus } from './assemblyai.ts';
import { corsHeaders } from './cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { videoPath } = await req.json();
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
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