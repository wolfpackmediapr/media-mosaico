
import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function validateFormData(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    throw new Error('Invalid content type. Expected multipart/form-data');
  }

  const formData = await req.formData();
  const file = formData.get('audioFile');
  const userId = formData.get('userId');

  if (!file || !(file instanceof File)) {
    throw new Error('No valid file provided');
  }

  if (!userId) {
    throw new Error('No user ID provided');
  }

  return { file, userId };
}

async function uploadToAssemblyAI(audioData: Uint8Array) {
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
    },
    body: audioData,
    signal: AbortSignal.timeout(30000),
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('AssemblyAI upload failed:', errorText);
    throw new Error('Failed to upload audio to AssemblyAI');
  }

  return await uploadResponse.json();
}

async function startTranscription(uploadUrl: string) {
  const transcribeResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: uploadUrl,
      language_code: 'es',
      speaker_labels: true,
      entity_detection: true,
      auto_chapters: true,
      sentiment_analysis: true,
      content_safety: true,
      auto_highlights: true,
      summarization: true,
      summary_model: 'informative',
      summary_type: 'bullets'
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!transcribeResponse.ok) {
    const errorText = await transcribeResponse.text();
    console.error('AssemblyAI transcription failed:', errorText);
    throw new Error('Failed to start transcription');
  }

  return await transcribeResponse.json();
}

async function pollTranscription(transcriptId: string) {
  const maxAttempts = 60; // Increased due to more analysis being performed
  const pollInterval = 3000; // Increased interval to reduce API load

  for (let attempts = 0; attempts < maxAttempts; attempts++) {
    const pollingResponse = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!pollingResponse.ok) {
      console.error('Polling failed:', await pollingResponse.text());
      throw new Error('Failed to poll for transcription status');
    }

    const transcript = await pollingResponse.json();
    console.log('Polling status:', transcript.status);

    if (transcript.status === 'completed') {
      return transcript;
    }
    
    if (transcript.status === 'error') {
      console.error('Transcription failed:', transcript.error);
      throw new Error('Transcription failed');
    }

    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error('Transcription timeout');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received transcription request');
    
    const { file, userId } = await validateFormData(req);
    console.log('Processing file:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: userId
    });

    const fileBuffer = await file.arrayBuffer();
    const audioData = new Uint8Array(fileBuffer);

    console.log('Uploading to AssemblyAI');
    const { upload_url } = await uploadToAssemblyAI(audioData);
    console.log('File uploaded to AssemblyAI:', upload_url);

    const { id: transcriptId } = await startTranscription(upload_url);
    console.log('Transcription started with ID:', transcriptId);

    const transcript = await pollTranscription(transcriptId);

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Save transcription to database with all advanced features
    const { error: dbError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        transcription_text: transcript.text,
        original_file_path: file.name,
        status: 'completed',
        progress: 100,
        assembly_chapters: transcript.chapters,
        assembly_content_safety: transcript.content_safety_labels,
        assembly_entities: transcript.entities,
        assembly_key_phrases: transcript.auto_highlights_result,
        assembly_sentiment_analysis: transcript.sentiment_analysis_results,
        assembly_summary: transcript.summary,
        assembly_topics: transcript.iab_categories_result
      });

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Failed to save transcription: ${dbError.message}`);
    }

    console.log('Transcription completed and saved with advanced features');

    return new Response(
      JSON.stringify({ 
        success: true, 
        text: transcript.text,
        chapters: transcript.chapters,
        content_safety: transcript.content_safety_labels,
        sentiment: transcript.sentiment_analysis_results,
        summary: transcript.summary,
        topics: transcript.iab_categories_result,
        entities: transcript.entities,
        key_phrases: transcript.auto_highlights_result
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
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
