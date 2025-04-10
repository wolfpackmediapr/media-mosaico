
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
    console.log('Starting secure transcription process...');
    
    const formData = await req.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');

    if (!file || !(file instanceof File)) {
      console.error('No valid file provided');
      throw new Error('No file provided');
    }

    if (!userId) {
      console.error('No user ID provided');
      throw new Error('No user ID provided');
    }

    console.log('Received file:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Get OpenAI API key
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) {
      console.error('OpenAI API key not found');
      throw new Error('OpenAI API key not configured');
    }

    console.log('OpenAI API key retrieved successfully');

    // Prepare form data for OpenAI Whisper
    const whisperFormData = new FormData();
    whisperFormData.append('file', file);
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('response_format', 'json');
    whisperFormData.append('language', 'es');

    console.log('Sending request to OpenAI Whisper...');
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: whisperFormData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error(`OpenAI API error: ${errorText}`);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const whisperResult = await whisperResponse.json();
    console.log('Whisper transcription completed successfully');

    // Initialize AssemblyAI client
    const assemblyKey = Deno.env.get('ASSEMBLYAI_API_KEY');
    if (!assemblyKey) {
      console.error('AssemblyAI API key not found');
      throw new Error('AssemblyAI API key not configured');
    }

    console.log('AssemblyAI API key retrieved successfully');

    const assemblyAiHeaders = {
      'Authorization': assemblyKey,
      'Content-Type': 'application/json',
    };

    // Upload audio to AssemblyAI
    console.log('Uploading audio to AssemblyAI...');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: assemblyAiHeaders,
      body: await file.arrayBuffer(),
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Failed to upload to AssemblyAI:', errorText);
      throw new Error(`Failed to upload to AssemblyAI: ${errorText}`);
    }

    const { upload_url } = await uploadResponse.json();
    console.log('Upload to AssemblyAI successful');

    // Start transcription with all analysis features
    console.log('Starting AssemblyAI transcription with analysis...');
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
      const errorText = await transcribeResponse.text();
      console.error('Failed to start AssemblyAI transcription:', errorText);
      throw new Error(`Failed to start AssemblyAI transcription: ${errorText}`);
    }

    const { id: transcriptId } = await transcribeResponse.json();
    console.log('AssemblyAI transcription started with ID:', transcriptId);

    // Poll for completion
    let assemblyResult;
    let pollCount = 0;
    const maxPolls = 60;
    while (pollCount < maxPolls) {
      console.log(`Polling AssemblyAI (attempt ${pollCount+1}/${maxPolls})...`);
      const pollingResponse = await fetch(
        `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
        { headers: assemblyAiHeaders }
      );

      if (!pollingResponse.ok) {
        const errorText = await pollingResponse.text();
        console.error('Polling failed:', errorText);
        throw new Error(`Polling failed: ${errorText}`);
      }

      assemblyResult = await pollingResponse.json();
      console.log('AssemblyAI status:', assemblyResult.status);

      if (assemblyResult.status === 'completed') {
        console.log('AssemblyAI transcription completed successfully');
        break;
      } else if (assemblyResult.status === 'error') {
        console.error('AssemblyAI transcription failed:', assemblyResult.error);
        throw new Error(`AssemblyAI transcription failed: ${assemblyResult.error}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
      pollCount++;
    }

    if (pollCount >= maxPolls) {
      console.error('AssemblyAI transcription timed out');
      throw new Error('AssemblyAI transcription timed out');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Saving transcription to database...');
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
      console.error('Failed to save transcription:', dbError);
      throw new Error(`Failed to save transcription: ${dbError.message}`);
    }

    console.log('Transcription saved successfully');

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
        stack: error.stack
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
