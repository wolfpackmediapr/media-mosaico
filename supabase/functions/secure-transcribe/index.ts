import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');

    if (!file || !(file instanceof File)) {
      throw new Error('No file provided');
    }

    if (!userId) {
      throw new Error('No user ID provided');
    }

    // Prepare form data for OpenAI Whisper
    const whisperFormData = new FormData();
    whisperFormData.append('file', file);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('response_format', 'json');
    whisperFormData.append('language', 'es');

    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      throw new Error(`OpenAI API error: ${await whisperResponse.text()}`);
    }

    const whisperResult = await whisperResponse.json();

    // Initialize AssemblyAI client
    const assemblyAiHeaders = {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
      'Content-Type': 'application/json',
    };

    // Upload audio to AssemblyAI
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: assemblyAiHeaders,
      body: await file.arrayBuffer(),
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload to AssemblyAI');
    }

    const { upload_url } = await uploadResponse.json();

    // Start transcription with all analysis features
    const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: assemblyAiHeaders,
      body: JSON.stringify({
        audio_url: upload_url,
        language_code: 'es',
        summarization: true,
        summary_model: 'informative',
        summary_type: 'bullets',
        content_safety: true,
        sentiment_analysis: true,
        entity_detection: true,
        iab_categories: true,
        auto_chapters: true,
        auto_highlights: true,
      }),
    });

    if (!transcribeResponse.ok) {
      throw new Error('Failed to start AssemblyAI transcription');
    }

    const { id: transcriptId } = await transcribeResponse.json();

    // Poll for completion
    let assemblyResult;
    while (true) {
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: assemblyAiHeaders }
      );

      assemblyResult = await pollingResponse.json();

      if (assemblyResult.status === 'completed') {
        break;
      } else if (assemblyResult.status === 'error') {
        throw new Error('AssemblyAI transcription failed');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
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
        original_file_path: file.name,
        status: 'completed',
        progress: 100,
        summary: assemblyResult.summary,
        content_safety_labels: assemblyResult.content_safety_labels,
        sentiment_analysis_results: assemblyResult.sentiment_analysis_results,
        entities: assemblyResult.entities,
        iab_categories_result: assemblyResult.iab_categories_result,
        chapters: assemblyResult.chapters,
        auto_highlights_result: assemblyResult.auto_highlights_result,
      });

    if (dbError) {
      throw new Error(`Failed to save transcription: ${dbError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        text: whisperResult.text,
        analysis: {
          summary: assemblyResult.summary,
          content_safety_labels: assemblyResult.content_safety_labels,
          sentiment_analysis_results: assemblyResult.sentiment_analysis_results,
          entities: assemblyResult.entities,
          iab_categories_result: assemblyResult.iab_categories_result,
          chapters: assemblyResult.chapters,
          auto_highlights_result: assemblyResult.auto_highlights_result,
        },
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in secure-transcribe function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});