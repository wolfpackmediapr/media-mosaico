import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const uploadToAssemblyAI = async (audioData: ArrayBuffer) => {
  console.log('Uploading to AssemblyAI...');
  const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
    method: 'POST',
    headers: {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
    },
    body: audioData,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('AssemblyAI upload error:', errorText);
    throw new Error(`Failed to upload to AssemblyAI: ${errorText}`);
  }

  const { upload_url } = await uploadResponse.json();
  console.log('File uploaded to AssemblyAI:', upload_url);
  return upload_url;
};

const startTranscription = async (audioUrl: string) => {
  console.log('Starting transcription for URL:', audioUrl);
  
  // Configure supported features for Spanish transcription
  const transcriptionConfig = {
    audio_url: audioUrl,
    language_detection: true,
    speaker_labels: true,
    content_safety: true,
    entity_detection: true,
    iab_categories: true,
    redact_pii: true,
    redact_pii_audio: true,
    redact_pii_policies: [
      "drug",
      "email",
      "location",
      "medical",
      "number",
      "person",
      "phone_number",
      "url",
      "us_social_security_number"
    ],
    auto_punctuation: true
  };

  const response = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(transcriptionConfig),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AssemblyAI transcription error:', errorText);
    throw new Error(`Failed to start transcription: ${errorText}`);
  }

  const { id: transcriptId } = await response.json();
  console.log('Transcription started with ID:', transcriptId);
  return transcriptId;
};

const pollTranscription = async (transcriptId: string) => {
  console.log('Polling transcription status for ID:', transcriptId);
  while (true) {
    const response = await fetch(
      `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
      {
        headers: {
          'Authorization': Deno.env.get('ASSEMBLYAI_API_KEY') ?? '',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AssemblyAI polling error:', errorText);
      throw new Error(`Transcription polling failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('Polling status:', result.status);

    if (result.status === 'completed') {
      return result;
    } else if (result.status === 'error') {
      throw new Error(`Transcription failed: ${result.error}`);
    }

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received request');
    const formData = await req.formData();
    const audioFile = formData.get('audioFile');
    const userId = formData.get('userId');

    if (!audioFile || !(audioFile instanceof File)) {
      throw new Error('No audio file provided');
    }

    if (!userId) {
      throw new Error('No user ID provided');
    }

    console.log('Processing file:', {
      name: audioFile.name,
      size: audioFile.size,
      type: audioFile.type
    });

    // Convert File to ArrayBuffer
    const arrayBuffer = await audioFile.arrayBuffer();
    
    // Upload to AssemblyAI
    const audioUrl = await uploadToAssemblyAI(arrayBuffer);
    console.log('File uploaded to AssemblyAI:', audioUrl);

    // Start transcription with supported features
    const transcriptId = await startTranscription(audioUrl);
    console.log('Transcription started:', transcriptId);

    // Poll for results
    const result = await pollTranscription(transcriptId);
    console.log('Transcription completed');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update transcription record with all analysis results
    const { error: updateError } = await supabase
      .from('transcriptions')
      .insert({
        user_id: userId,
        original_file_path: audioFile.name,
        transcription_text: result.text,
        status: 'completed',
        progress: 100,
        assembly_content_safety: result.content_safety_labels,
        assembly_entities: result.entities,
        assembly_topics: result.iab_categories_result,
        language: result.language_code,
        redacted_audio_url: result.redacted_audio_url,
      });

    if (updateError) {
      console.error('Error updating transcription:', updateError);
      throw new Error('Failed to update transcription record');
    }

    return new Response(
      JSON.stringify({
        text: result.text,
        language: result.language_code,
        analysis: {
          content_safety: result.content_safety_labels,
          entities: result.entities,
          topics: result.iab_categories_result,
          redacted_audio_url: result.redacted_audio_url,
          speakers: result.speaker_labels,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});